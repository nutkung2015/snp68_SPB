const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const pushNotificationService = require("../services/pushNotificationService");

// @desc    Security Check-in (Entry)
// @route   POST /api/security/entry/check-in
// @access  Private (Security/Admin)
exports.checkIn = async (req, res) => {
    try {
        const {
            project_id,
            plate_number,
            province,
            target_unit_id,
            visitor_name,
            image_driver_url,
            image_car_url,
            id_card_consent // New field: boolean (using 0/1 for DB)
        } = req.body;

        const guard_id = req.user.id; // From authMiddleware

        if (!project_id || !plate_number) {
            return res.status(400).json({ message: "Project ID and Plate Number are required." });
        }

        let entryData = {
            id: uuidv4(),
            project_id,
            plate_number,
            visitor_type: 'visitor', // efficient default
            target_unit_id: target_unit_id || null, // Might be null if Resident
            estamp_status: 'none',
            visitor_name: visitor_name || '',
            image_driver_url: image_driver_url || null,
            image_car_url: image_car_url || null,
            id_card_consent: id_card_consent !== undefined ? id_card_consent : 1, // Default to true (1) if not provided
            created_by: guard_id,
            status: 'inside'
        };

        let message = "";
        let shouldNotify = false;

        // 1. Check Project Vehicles (Is it a Resident?)
        const [residentCars] = await db.promise().query(
            "SELECT * FROM project_vehicles WHERE project_id = ? AND plate_number = ? AND is_active = 1",
            [project_id, plate_number]
        );

        if (residentCars.length > 0) {
            // It's a Resident
            entryData.visitor_type = 'resident';
            entryData.target_unit_id = residentCars[0].unit_id; // Link to their unit
            entryData.estamp_status = 'approved'; // Residents don't need stamps
            message = "รถลูกบ้านเข้าโครงการ (Auto Approved)";
        } else {
            // 2. Check Visitor Appointments (Pre-registered?)
            const [appointments] = await db.promise().query(
                "SELECT * FROM visitor_appointments WHERE project_id = ? AND plate_number = ? AND status = 'pending' AND date(expected_arrival) = curdate()",
                [project_id, plate_number]
            );

            if (appointments.length > 0) {
                // Pre-registered Visitor
                entryData.visitor_type = 'visitor';
                entryData.target_unit_id = appointments[0].unit_id;
                entryData.visitor_name = appointments[0].visitor_name;
                entryData.estamp_status = 'approved'; // Already approved by invite

                // Update appointment status to 'arrived'
                await db.promise().execute(
                    "UPDATE visitor_appointments SET status = 'arrived' WHERE id = ?",
                    [appointments[0].id]
                );
                message = "ผู้มาติดต่อลงทะเบียนล่วงหน้า (Auto Approved)";
            } else {
                // 3. Walk-in Visitor (Stranger)
                // Guard MUST provide target_unit_id or unit_number for Walk-in
                // Walk-in goes to "รถออก" tab but still needs estamp from resident
                entryData.visitor_type = 'visitor';
                entryData.estamp_status = 'pending'; // Needs stamp from resident
                shouldNotify = true;
                message = "ผู้มาติดต่อทั่วไป (รอ E-stamp)";

                // Resolve Unit Number to ID if provided
                if (!target_unit_id && req.body.unit_number) {
                    const [units] = await db.promise().query(
                        "SELECT id FROM units WHERE project_id = ? AND unit_number = ?",
                        [project_id, req.body.unit_number]
                    );
                    if (units.length > 0) {
                        entryData.target_unit_id = units[0].id;
                    } else {
                        return res.status(400).json({ message: "ไม่พบเลขที่บ้านนี้ในระบบ" });
                    }
                }

                if (!entryData.target_unit_id) {
                    // If no unit identified yet
                    return res.status(200).json({
                        status: 'require_unit',
                        message: 'ไม่พบข้อมูลรถ กรุณาระบุบ้านเลขที่ที่มาติดต่อ'
                    });
                }
            }
        }

        // Insert Log
        // Note: Check your database schema supports 'id_card_consent'
        await db.promise().execute(
            `INSERT INTO entry_logs (
        id, project_id, plate_number, visitor_type, target_unit_id, 
        visitor_name, image_driver_url, image_car_url, id_card_consent,
        estamp_status, status, created_by, check_in_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                entryData.id, entryData.project_id, entryData.plate_number, entryData.visitor_type,
                entryData.target_unit_id, entryData.visitor_name, entryData.image_driver_url,
                entryData.image_car_url, entryData.id_card_consent,
                entryData.estamp_status, entryData.status, entryData.created_by
            ]
        );

        // 4. Send Notification if needed (Walk-in Visitor)
        if (shouldNotify && entryData.target_unit_id) {
            try {
                // Get unit info
                const [unitInfo] = await db.promise().query(
                    "SELECT u.id, u.unit_number, u.project_id FROM units u WHERE u.id = ?",
                    [entryData.target_unit_id]
                );

                if (unitInfo.length > 0) {
                    await pushNotificationService.notifyVisitorExitStamp(
                        entryData.id,                    // visitorId (entry_log id)
                        entryData.target_unit_id,        // unitId
                        unitInfo[0].project_id,          // projectId
                        entryData.visitor_name || 'ผู้มาติดต่อ',  // visitorName
                        plate_number                     // licensePlate
                    );
                    console.log(`[Notification] Sent visitor stamp request for ${plate_number}`);
                }
            } catch (notifyError) {
                console.error("[Notification] Error sending visitor notification:", notifyError);
            }
        }

        res.status(201).json({
            status: "success",
            message: message,
            data: entryData
        });

    } catch (error) {
        console.error("Error in checkIn:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Security Check-out (Exit)
// @route   POST /api/security/entry/check-out
// @access  Private (Security/Admin)
exports.checkOut = async (req, res) => {
    try {
        const { project_id, plate_number } = req.body;
        const guard_id = req.user.id;

        // Find the latest 'inside' log for this plate
        const [rows] = await db.promise().query(
            "SELECT * FROM entry_logs WHERE project_id = ? AND plate_number = ? AND status = 'inside' ORDER BY check_in_time DESC LIMIT 1",
            [project_id, plate_number]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "ไม่พบรถคันนี้ในโครงการ หรือรถออกไปแล้ว" });
        }

        const log = rows[0];

        // Check Estamp Logic
        let allowExit = false;
        let warning = null;

        if (log.visitor_type === 'resident') {
            allowExit = true;
        } else {
            if (log.estamp_status === 'approved') {
                allowExit = true;
            } else {
                allowExit = false; // Strictly speaking
                warning = "ผู้มาติดต่อยังไม่ได้รับ E-stamp";
                // Note: In real world, Guard might override this. 
                // We will send 'status: warning' to UI and let UI send a confirmation 'force_exit' flag if needed.
            }
        }

        if (!allowExit && !req.body.force_exit) {
            return res.status(200).json({
                status: "warning",
                message: warning,
                data: log
            });
        }

        // Process Exit
        await db.promise().execute(
            "UPDATE entry_logs SET status = 'exited', check_out_time = NOW(), handled_by_out = ? WHERE id = ?",
            [guard_id, log.id]
        );

        res.status(200).json({
            status: "success",
            message: "บันทึกรถออกสำเร็จ",
            data: { ...log, status: 'exited' }
        });

    } catch (error) {
        console.error("Error in checkOut:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Get Logs for Dashboard
// @route   GET /api/security/entry/logs
// @access  Private (Security)
// Query params:
//   - status: 'pending' (รถเข้า - รอประทับตรา) | 'inside' (รถออก - อยู่ในโครงการ) | 'exited' (ประวัติรถออก)
exports.getEntryLogs = async (req, res) => {
    try {
        const { project_id, status } = req.query;

        let query = "SELECT el.*, u.unit_number FROM entry_logs el LEFT JOIN units u ON el.target_unit_id = u.id WHERE el.project_id = ?";
        let params = [project_id];

        if (status === 'pending') {
            // Tab "รถเข้า" - ไม่ใช้แล้ว (legacy)
            query += " AND el.status = 'inside' AND el.estamp_status = 'pending'";
        } else if (status === 'inside') {
            // Tab "รถออก" - รถที่อยู่ในโครงการ (รอบันทึกออก)
            // ไม่รวมรถลูกบ้าน (visitor_type='resident') เพราะไม่จำเป็นต้องบันทึกออก
            query += " AND el.status = 'inside' AND el.visitor_type != 'resident'";
        } else if (status === 'exited') {
            // Tab "ประวัติ" - รถที่ออกไปแล้ว
            query += " AND el.status = 'exited'";
        }

        query += " ORDER BY el.check_in_time DESC LIMIT 50";

        const [rows] = await db.promise().query(query, params);

        res.status(200).json({
            status: "success",
            data: rows
        });

    } catch (error) {
        console.error("Error in getEntryLogs:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// @desc    Search vehicles by partial plate (numbers usually) for autocomplete
// @route   GET /api/security/vehicles/search?q=1234
// @access  Private (Security)
exports.searchVehicles = async (req, res) => {
    try {
        const { project_id, q } = req.query;

        if (!project_id || !q) {
            return res.status(400).json({ message: "Project ID and Query are required" });
        }

        // 1. Search in Project Vehicles (Residents)
        // Using LIKE %q to find plate containing these numbers
        const [residents] = await db.promise().query(
            "SELECT plate_number, 'resident' as type, unit_id FROM project_vehicles WHERE project_id = ? AND plate_number LIKE ? AND is_active = 1 LIMIT 5",
            [project_id, `%${q}%`]
        );

        // 2. Search in Visitor Appointments (Today)
        const [appointments] = await db.promise().query(
            "SELECT plate_number, 'visitor' as type, visitor_name FROM visitor_appointments WHERE project_id = ? AND plate_number LIKE ? AND status = 'pending' AND date(expected_arrival) = curdate() LIMIT 5",
            [project_id, `%${q}%`]
        );

        // Combine results
        const results = [
            ...residents.map(r => ({ ...r, label: `(ลูกบ้าน) ${r.plate_number}` })),
            ...appointments.map(a => ({ ...a, label: `(นัดหมาย) ${a.plate_number} - ${a.visitor_name}` }))
        ];

        res.status(200).json({
            status: "success",
            data: results
        });

    } catch (error) {
        console.error("Error searching vehicles:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Get Scheduled Visitors (รถเข้า - รถที่ลูกบ้านแจ้งล่วงหน้า)
// @route   GET /api/security/visitors/scheduled
// @access  Private (Security)
exports.getScheduledVisitors = async (req, res) => {
    try {
        const { project_id } = req.query;

        if (!project_id) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        // Get visitor appointments that are pending (not yet checked in) for today
        const [rows] = await db.promise().query(
            `SELECT va.*, u.unit_number, um.user_id as resident_user_id
             FROM visitor_appointments va
             LEFT JOIN units u ON va.unit_id = u.id
             LEFT JOIN unit_members um ON va.unit_id = um.unit_id AND um.role = 'owner'
             WHERE va.project_id = ? 
             AND va.status = 'pending'
             AND DATE(va.expected_arrival) = CURDATE()
             ORDER BY va.expected_arrival ASC`,
            [project_id]
        );

        res.status(200).json({
            status: "success",
            data: rows
        });

    } catch (error) {
        console.error("Error in getScheduledVisitors:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Confirm visitor entry (รปภ ยืนยันรถเข้าจากการนัดหมาย)
// @route   POST /api/security/visitors/confirm-entry
// @access  Private (Security)
exports.confirmVisitorEntry = async (req, res) => {
    try {
        const { appointment_id, project_id, plate_number, visitor_name, unit_id } = req.body;
        const guard_id = req.user.id;

        if (!appointment_id || !project_id || !plate_number) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Create entry log
        const entryId = uuidv4();
        await db.promise().execute(
            `INSERT INTO entry_logs (
                id, project_id, plate_number, visitor_type, target_unit_id, 
                visitor_name, estamp_status, status, created_by, check_in_time
            ) VALUES (?, ?, ?, 'visitor', ?, ?, 'pending', 'inside', ?, NOW())`,
            [entryId, project_id, plate_number, unit_id, visitor_name || '', guard_id]
        );

        // Update appointment status to 'arrived'
        await db.promise().execute(
            "UPDATE visitor_appointments SET status = 'arrived' WHERE id = ?",
            [appointment_id]
        );

        // TODO: Send notification to resident for estamp

        res.status(200).json({
            status: "success",
            message: "บันทึกรถเข้าเรียบร้อย",
            entry_id: entryId
        });

    } catch (error) {
        console.error("Error in confirmVisitorEntry:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/security/stats
exports.getStats = async (req, res) => {
    try {
        const { project_id } = req.query;

        // ใช้ CURDATE() ของ MySQL แทน JavaScript Date เพื่อให้ timezone ถูกต้อง
        // (MySQL จะใช้ timezone ที่ตั้งไว้ใน server)

        // Total entry today
        const [totalEntry] = await db.promise().query(
            `SELECT COUNT(*) as count FROM entry_logs 
             WHERE project_id = ? AND DATE(check_in_time) = CURDATE()`,
            [project_id]
        );

        // Walk-in count (visitor_type = 'visitor' AND from guard check-in)
        const [walkIn] = await db.promise().query(
            `SELECT COUNT(*) as count FROM entry_logs 
             WHERE project_id = ? AND DATE(check_in_time) = CURDATE() 
             AND visitor_type = 'visitor'`,
            [project_id]
        );

        // Stamped count
        const [stamped] = await db.promise().query(
            `SELECT COUNT(*) as count FROM entry_logs 
             WHERE project_id = ? AND DATE(check_in_time) = CURDATE() 
             AND estamp_status = 'approved'`,
            [project_id]
        );

        // Inside count
        const [inside] = await db.promise().query(
            `SELECT COUNT(*) as count FROM entry_logs 
             WHERE project_id = ? AND status = 'inside'`,
            [project_id]
        );

        res.status(200).json({
            status: "success",
            data: {
                totalEntryToday: totalEntry[0].count,
                walkInCount: walkIn[0].count,
                stampedCount: stamped[0].count,
                insideCount: inside[0].count
            }
        });
    } catch (error) {
        console.error("Error in getStats:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Get Single Entry Log by ID
// @route   GET /api/security/entry/logs/:id
// @access  Private (Security)
exports.getEntryLogById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.promise().query(
            `SELECT el.*, u.unit_number 
             FROM entry_logs el 
             LEFT JOIN units u ON el.target_unit_id = u.id 
             WHERE el.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "ไม่พบข้อมูล" });
        }

        res.status(200).json({
            status: "success",
            data: rows[0]
        });

    } catch (error) {
        console.error("Error in getEntryLogById:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    checkIn: exports.checkIn,
    checkOut: exports.checkOut,
    searchVehicles: exports.searchVehicles,
    getEntryLogs: exports.getEntryLogs,
    getScheduledVisitors: exports.getScheduledVisitors,
    confirmVisitorEntry: exports.confirmVisitorEntry,
    getStats: exports.getStats,
    getEntryLogById: exports.getEntryLogById
};
