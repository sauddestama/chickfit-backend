const Joi = require('joi');

// Generic validation middleware
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[property]);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        next();
    };
};

// User registration validation schema
const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required'
    }),
    role: Joi.string().valid('farmer', 'veterinarian', 'administrator').required().messages({
        'any.only': 'Role must be farmer, veterinarian, or administrator',
        'any.required': 'Role is required'
    }),
    specialization: Joi.when('role', {
        is: 'veterinarian',
        then: Joi.string().min(2).max(200).required().messages({
            'string.min': 'Specialization must be at least 2 characters long',
            'string.max': 'Specialization cannot exceed 200 characters',
            'any.required': 'Specialization is required for veterinarians'
        }),
        otherwise: Joi.optional()
    })
});

// User login validation schema
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    })
});

// Profile update validation schema
const profileUpdateSchema = Joi.object({
    name: Joi.string().min(2).max(100).messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters'
    }),
    specialization: Joi.string().min(2).max(200).messages({
        'string.min': 'Specialization must be at least 2 characters long',
        'string.max': 'Specialization cannot exceed 200 characters'
    }),
    is_available: Joi.boolean()
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

// Consultation creation validation schema
const consultationSchema = Joi.object({
    veterinarian_id: Joi.number().integer().positive().required().messages({
        'number.base': 'Veterinarian ID must be a number',
        'number.integer': 'Veterinarian ID must be an integer',
        'number.positive': 'Veterinarian ID must be positive',
        'any.required': 'Veterinarian ID is required'
    }),
    diagnosis_id: Joi.number().integer().positive().required().messages({
        'number.base': 'Diagnosis ID must be a number',
        'number.integer': 'Diagnosis ID must be an integer',
        'number.positive': 'Diagnosis ID must be positive',
        'any.required': 'Diagnosis ID is required'
    })
});

// Message validation schema
const messageSchema = Joi.object({
    message: Joi.string().min(1).max(1000).required().messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message cannot exceed 1000 characters',
        'any.required': 'Message is required'
    })
});

// Article validation schema
const articleSchema = Joi.object({
    title: Joi.string().min(5).max(200).required().messages({
        'string.min': 'Title must be at least 5 characters long',
        'string.max': 'Title cannot exceed 200 characters',
        'any.required': 'Title is required'
    }),
    content: Joi.string().min(10).required().messages({
        'string.min': 'Content must be at least 10 characters long',
        'any.required': 'Content is required'
    }),
    thumbnail_url: Joi.string().uri().messages({
        'string.uri': 'Thumbnail URL must be a valid URL'
    }),
    published: Joi.boolean().default(false)
});

// Prescription validation schema
const prescriptionSchema = Joi.object({
    diagnosis_id: Joi.number().integer().positive().required().messages({
        'number.base': 'Diagnosis ID must be a number',
        'number.integer': 'Diagnosis ID must be an integer',
        'number.positive': 'Diagnosis ID must be positive',
        'any.required': 'Diagnosis ID is required'
    }),
    farmer_id: Joi.number().integer().positive().required().messages({
        'number.base': 'Farmer ID must be a number',
        'number.integer': 'Farmer ID must be an integer',
        'number.positive': 'Farmer ID must be positive',
        'any.required': 'Farmer ID is required'
    }),
    consultation_id: Joi.number().integer().positive().messages({
        'number.base': 'Consultation ID must be a number',
        'number.integer': 'Consultation ID must be an integer',
        'number.positive': 'Consultation ID must be positive'
    }),
    medicine: Joi.string().min(2).max(500).required().messages({
        'string.min': 'Medicine name must be at least 2 characters long',
        'string.max': 'Medicine name cannot exceed 500 characters',
        'any.required': 'Medicine is required'
    }),
    usage_instructions: Joi.string().min(10).max(1000).required().messages({
        'string.min': 'Usage instructions must be at least 10 characters long',
        'string.max': 'Usage instructions cannot exceed 1000 characters',
        'any.required': 'Usage instructions are required'
    }),
    notes: Joi.string().max(500).messages({
        'string.max': 'Notes cannot exceed 500 characters'
    })
});

// ID parameter validation schema
const idParamSchema = Joi.object({
    id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID must be a number',
        'number.integer': 'ID must be an integer',
        'number.positive': 'ID must be positive',
        'any.required': 'ID is required'
    })
});

// Pagination validation schema
const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
    })
});

module.exports = {
    validate,
    registerSchema,
    loginSchema,
    profileUpdateSchema,
    consultationSchema,
    messageSchema,
    articleSchema,
    prescriptionSchema,
    idParamSchema,
    paginationSchema
};