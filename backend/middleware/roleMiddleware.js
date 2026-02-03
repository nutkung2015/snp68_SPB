const db = require('../config/db');

// Middleware สำหรับตรวจสอบสิทธิ์ตามบทบาท (เดิม)
const checkJuristic = (req, res, next) => {
    if (req.user && req.user.role === 'juristic') {
        return next();
    }
    return res.status(403).json({
        status: 'error',
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้ ต้องเป็นผู้ใช้งานประเภทนิติบุคคลเท่านั้น'
    });
};

/**
 * Middleware to check if user has required role in project
 * Checks from project_memberships table in database
 * Gets project_id from request body instead of URL params
 * Usage: router.post('/info-docs', authMiddleware, checkProjectRole(['juristicMember', 'juristicLeader']), ...)
 */
const checkProjectRole = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            const projectId = req.body.project_id; // Get project_id from body

            if (!userId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Unauthorized: User not authenticated'
                });
            }

            if (!projectId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Bad Request: project_id is required in request body'
                });
            }

            // Query user's role in this project from database
            const query = `
        SELECT role 
        FROM project_members 
        WHERE user_id = ? AND project_id = ?
      `;

            const [rows] = await db.promise().query(query, [userId, projectId]);

            if (rows.length === 0) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Forbidden: You are not a member of this project'
                });
            }

            const userRole = rows[0].role;

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    status: 'error',
                    message: `Forbidden: This action requires one of these roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`
                });
            }

            // Attach role to request for later use
            req.userRole = userRole;
            req.projectId = projectId;

            next();
        } catch (error) {
            console.error('Error in checkProjectRole middleware:', error);
            res.status(500).json({
                status: 'error',
                message: 'Server error while checking permissions'
            });
        }
    };
};

/**
 * Middleware to check if user has required role in project
 * Checks from project_memberships table in database
 * Gets project_id from URL params (for GET, PUT, DELETE requests)
 * Usage: router.get('/:projectId', authMiddleware, checkProjectRoleFromParams(['juristicMember', 'juristicLeader']), ...)
 */
const checkProjectRoleFromParams = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            const projectId = req.params.projectId; // Get project_id from URL params

            if (!userId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Unauthorized: User not authenticated'
                });
            }

            if (!projectId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Bad Request: projectId is required in URL params'
                });
            }

            // Query user's role in this project from database
            const query = `
        SELECT role 
        FROM project_members 
        WHERE user_id = ? AND project_id = ?
      `;

            const [rows] = await db.promise().query(query, [userId, projectId]);

            if (rows.length === 0) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Forbidden: You are not a member of this project'
                });
            }

            const userRole = rows[0].role;

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    status: 'error',
                    message: `Forbidden: This action requires one of these roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`
                });
            }

            // Attach role to request for later use
            req.userRole = userRole;
            req.projectId = projectId;

            next();
        } catch (error) {
            console.error('Error in checkProjectRoleFromParams middleware:', error);
            res.status(500).json({
                status: 'error',
                message: 'Server error while checking permissions'
            });
        }
    };
};

/**
 * Middleware to check if user is juristic staff (juristicMember or juristicLeader)
 * Shorthand for common use case
 */
const requireJuristicRole = checkProjectRole(['juristicMember', 'juristicLeader']);

/**
 * Middleware to check if user is juristic staff (from URL params)
 * Shorthand for GET/PUT/DELETE endpoints
 */
const requireJuristicRoleFromParams = checkProjectRoleFromParams(['juristicMember', 'juristicLeader']);

module.exports = {
    checkJuristic,
    checkProjectRole,
    checkProjectRoleFromParams,
    requireJuristicRole,
    requireJuristicRoleFromParams
};
