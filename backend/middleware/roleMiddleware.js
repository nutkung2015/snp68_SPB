// Middleware สำหรับตรวจสอบสิทธิ์ตามบทบาท
const checkJuristic = (req, res, next) => {
    if (req.user && req.user.role === 'juristic') {
        return next();
    }
    return res.status(403).json({
        status: 'error',
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้ ต้องเป็นผู้ใช้งานประเภทนิติบุคคลเท่านั้น'
    });
};

module.exports = {
    checkJuristic
};
