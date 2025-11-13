const checkJuristic = (req, res, next) => {
    if (req.user && req.user.role === 'juristic') {
        next();
    } else {
        res.status(403).json({
            status: 'error',
            message: 'Access denied. Juristic role required.'
        });
    }
};

module.exports = checkJuristic;
