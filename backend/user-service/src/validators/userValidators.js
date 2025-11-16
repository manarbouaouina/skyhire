// user-service/src/validators/userValidators.js
const Joi = require('joi');

// Update profile validation schema
const updateProfileSchema = Joi.object({
  headline: Joi.string()
    .trim()
    .max(200)
    .allow('', null)
    .messages({
      'string.max': 'Headline must not exceed 200 characters'
    }),
  bio: Joi.string()
    .trim()
    .max(2000)
    .allow('', null)
    .messages({
      'string.max': 'Bio must not exceed 2000 characters'
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
  website: Joi.string()
    .uri()
    .allow('', null)
    .messages({
      'string.uri': 'Website must be a valid URL'
    }),
  languages: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .messages({
      'array.max': 'Maximum 20 languages allowed'
    }),
  skills: Joi.array()
    .items(Joi.string().trim().max(100))
    .max(100)
    .messages({
      'array.max': 'Maximum 100 skills allowed'
    }),
  education: Joi.array()
    .items(Joi.object({
      institution: Joi.string().trim().max(200),
      degree: Joi.string().trim().max(200),
      field: Joi.string().trim().max(200),
      startDate: Joi.date().allow(null),
      endDate: Joi.date().allow(null),
      description: Joi.string().trim().max(1000).allow('', null)
    }))
    .max(20)
    .messages({
      'array.max': 'Maximum 20 education entries allowed'
    }),
  experience: Joi.array()
    .items(Joi.object({
      company: Joi.string().trim().max(200),
      position: Joi.string().trim().max(200),
      startDate: Joi.date().allow(null),
      endDate: Joi.date().allow(null),
      description: Joi.string().trim().max(2000).allow('', null)
    }))
    .max(50)
    .messages({
      'array.max': 'Maximum 50 experience entries allowed'
    }),
  certifications: Joi.array()
    .items(Joi.string().trim().max(200))
    .max(30)
    .messages({
      'array.max': 'Maximum 30 certifications allowed'
    }),
  socialLinks: Joi.object({
    linkedin: Joi.string().uri().allow('', null),
    twitter: Joi.string().uri().allow('', null),
    github: Joi.string().uri().allow('', null),
    portfolio: Joi.string().uri().allow('', null)
  }).allow(null),
  preferences: Joi.object({
    notifications: Joi.object({
      job: Joi.boolean(),
      message: Joi.boolean(),
      connection: Joi.boolean()
    }).allow(null)
  }).allow(null),
  aviationSpecific: Joi.object({
    licenses: Joi.array().items(Joi.string().trim().max(100)).max(20),
    ratings: Joi.array().items(Joi.string().trim().max(100)).max(20),
    flightHours: Joi.number().min(0).max(100000),
    aircraftTypes: Joi.array().items(Joi.string().trim().max(100)).max(20)
  }).allow(null)
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Add skill validation schema
const addSkillSchema = Joi.object({
  skill: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Skill name is required',
      'string.min': 'Skill name must be at least 2 characters',
      'string.max': 'Skill name must not exceed 100 characters',
      'any.required': 'Skill name is required'
    }),
  level: Joi.string()
    .valid('beginner', 'intermediate', 'advanced', 'expert')
    .default('intermediate')
    .messages({
      'any.only': 'Skill level must be one of: beginner, intermediate, advanced, expert'
    })
});

module.exports = {
  updateProfileSchema,
  addSkillSchema
};

