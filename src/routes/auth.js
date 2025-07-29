const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getProfile, 
    updateProfile, 
    changePassword 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
    validate, 
    registerSchema, 
    loginSchema, 
    profileUpdateSchema 
} = require('../middleware/validation');
const Joi = require('joi');

// Password change validation schema
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required'
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'New password must be at least 6 characters long',
        'any.required': 'New password is required'
    })
});

// Routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, validate(profileUpdateSchema), updateProfile);
router.put('/change-password', authenticateToken, validate(changePasswordSchema), changePassword);

module.exports = router;