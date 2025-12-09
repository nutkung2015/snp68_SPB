const Joi = require('joi');

const validateRegister = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        full_name: Joi.string().min(2).max(100).required(),
        phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
        role: Joi.string().valid('user', 'admin', 'juristic').default('user')
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details[0].message
        });
    }
    next();
};

const validateLogin = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details[0].message
        });
    }
    next();
};

module.exports = {
    validateRegister,
    validateLogin
};
