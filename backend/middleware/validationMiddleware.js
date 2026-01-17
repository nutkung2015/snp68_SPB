const Joi = require('joi');

const validateRegister = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        full_name: Joi.string().min(2).max(100).required(),
        phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
        role: Joi.string().valid('resident', 'juristic', 'super-admin', 'security').default('resident')
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

// รองรับทั้ง email และ phone สำหรับ login
// Smart detect: ถ้าส่งเบอร์โทรมาใน email field ก็รองรับได้
const validateLogin = (req, res, next) => {
    const { email, phone, password } = req.body;

    // ถ้าไม่มี password
    if (!password) {
        return res.status(400).json({
            status: 'error',
            message: 'กรุณาระบุรหัสผ่าน'
        });
    }

    // ถ้าไม่มีทั้ง email และ phone
    if (!email && !phone) {
        return res.status(400).json({
            status: 'error',
            message: 'กรุณาระบุอีเมลหรือเบอร์โทรศัพท์'
        });
    }

    // Smart detect: ถ้า email field เป็นเบอร์โทร ให้ย้ายไป phone field
    if (email && !phone) {
        const cleanedInput = email.replace(/\s/g, '');

        // ถ้ามี @ แสดงว่าเป็น email แน่นอน
        if (cleanedInput.includes('@')) {
            // ตรวจสอบว่าเป็น email ที่ถูกต้องหรือไม่
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(cleanedInput)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'รูปแบบอีเมลไม่ถูกต้อง'
                });
            }
            // เป็น email ที่ถูกต้อง ไม่ต้องทำอะไร
        } else {
            // ไม่มี @ ตรวจสอบว่าเป็นเบอร์โทรหรือไม่
            const phonePattern = /^(\+66|66|0)?[0-9]{8,10}$/;
            const isPhoneNumber = phonePattern.test(cleanedInput);

            if (isPhoneNumber) {
                // ย้ายจาก email ไป phone
                req.body.phone = email;
                delete req.body.email;
            } else {
                return res.status(400).json({
                    status: 'error',
                    message: 'กรุณาระบุอีเมลหรือเบอร์โทรศัพท์ที่ถูกต้อง'
                });
            }
        }
    }

    next();
};


// Validate check phone request
const validateCheckPhone = (req, res, next) => {
    const schema = Joi.object({
        phone: Joi.string().required().messages({
            'string.empty': 'กรุณาระบุเบอร์โทรศัพท์',
            'any.required': 'กรุณาระบุเบอร์โทรศัพท์'
        })
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

// Validate reset password with Firebase token
const validateResetPassword = (req, res, next) => {
    const schema = Joi.object({
        firebase_token: Joi.string().required().messages({
            'string.empty': 'กรุณาระบุ Firebase token',
            'any.required': 'กรุณาระบุ Firebase token'
        }),
        new_password: Joi.string().min(6).required().messages({
            'string.min': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
            'string.empty': 'กรุณาระบุรหัสผ่านใหม่',
            'any.required': 'กรุณาระบุรหัสผ่านใหม่'
        })
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

// Validate Firebase token request
const validateFirebaseToken = (req, res, next) => {
    const schema = Joi.object({
        firebase_token: Joi.string().required().messages({
            'string.empty': 'กรุณาระบุ Firebase token',
            'any.required': 'กรุณาระบุ Firebase token'
        })
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
    validateLogin,
    validateCheckPhone,
    validateResetPassword,
    validateFirebaseToken
};
