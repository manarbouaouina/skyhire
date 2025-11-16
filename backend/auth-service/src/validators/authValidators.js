// auth-service/src/validators/authValidators.js
const Joi = require('joi');

// Signup validation schema
const signupSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required'
    }),
  role: Joi.string()
    .valid('candidate', 'recruiter', 'admin')
    .default('candidate')
    .messages({
      'any.only': 'Role must be one of: candidate, recruiter, admin'
    })
});

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

// Update profile validation schema
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters'
    }),
  bio: Joi.string()
    .trim()
    .max(1000)
    .allow('', null)
    .messages({
      'string.max': 'Bio must not exceed 1000 characters'
    }),
  location: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .messages({
      'string.max': 'Location must not exceed 255 characters'
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .allow('', null)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  languages: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(10)
    .messages({
      'array.max': 'Maximum 10 languages allowed'
    }),
  skills: Joi.array()
    .items(Joi.string().trim().max(100))
    .max(50)
    .messages({
      'array.max': 'Maximum 50 skills allowed'
    }),
  experience: Joi.string()
    .trim()
    .max(5000)
    .allow('', null)
    .messages({
      'string.max': 'Experience must not exceed 5000 characters'
    }),
  avatar: Joi.string()
    .uri()
    .allow('', null)
    .messages({
      'string.uri': 'Avatar must be a valid URL'
    })
});

// Change password validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required'
    }),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters',
      'string.max': 'New password must not exceed 128 characters',
      'any.required': 'New password is required'
    })
});

module.exports = {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
};

