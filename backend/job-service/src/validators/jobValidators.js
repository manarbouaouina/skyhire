// job-service/src/validators/jobValidators.js
const Joi = require('joi');

// Create job validation schema
const createJobSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Job title is required',
      'string.min': 'Job title must be at least 3 characters',
      'string.max': 'Job title must not exceed 200 characters',
      'any.required': 'Job title is required'
    }),
  company: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Company name is required',
      'string.min': 'Company name must be at least 2 characters',
      'string.max': 'Company name must not exceed 100 characters',
      'any.required': 'Company name is required'
    }),
  companyLogo: Joi.string()
    .uri()
    .allow('', null)
    .messages({
      'string.uri': 'Company logo must be a valid URL'
    }),
  location: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Location is required',
      'string.min': 'Location must be at least 2 characters',
      'any.required': 'Location is required'
    }),
  type: Joi.string()
    .valid('full-time', 'part-time', 'contract', 'internship')
    .default('full-time')
    .messages({
      'any.only': 'Job type must be one of: full-time, part-time, contract, internship'
    }),
  category: Joi.string()
    .valid('flight-attendant', 'cabin-crew', 'pilot', 'ground-staff', 'management', 'technical')
    .required()
    .messages({
      'any.only': 'Category must be one of: flight-attendant, cabin-crew, pilot, ground-staff, management, technical',
      'any.required': 'Category is required'
    }),
  salary: Joi.object({
    min: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'Minimum salary must be a positive number',
        'any.required': 'Minimum salary is required'
      }),
    max: Joi.number()
      .positive()
      .min(Joi.ref('min'))
      .required()
      .messages({
        'number.positive': 'Maximum salary must be a positive number',
        'number.min': 'Maximum salary must be greater than or equal to minimum salary',
        'any.required': 'Maximum salary is required'
      }),
    currency: Joi.string()
      .length(3)
      .uppercase()
      .default('USD')
      .messages({
        'string.length': 'Currency must be a 3-letter code (e.g., USD, EUR)'
      }),
    period: Joi.string()
      .valid('monthly', 'yearly', 'hourly')
      .default('monthly')
      .messages({
        'any.only': 'Salary period must be one of: monthly, yearly, hourly'
      })
  }).required()
    .messages({
      'any.required': 'Salary information is required'
    }),
  description: Joi.string()
    .trim()
    .min(50)
    .max(10000)
    .required()
    .messages({
      'string.empty': 'Job description is required',
      'string.min': 'Job description must be at least 50 characters',
      'string.max': 'Job description must not exceed 10000 characters',
      'any.required': 'Job description is required'
    }),
  requirements: Joi.array()
    .items(Joi.string().trim().max(500))
    .max(50)
    .messages({
      'array.max': 'Maximum 50 requirements allowed'
    }),
  responsibilities: Joi.array()
    .items(Joi.string().trim().max(500))
    .max(50)
    .messages({
      'array.max': 'Maximum 50 responsibilities allowed'
    }),
  benefits: Joi.array()
    .items(Joi.string().trim().max(200))
    .max(30)
    .messages({
      'array.max': 'Maximum 30 benefits allowed'
    }),
  skills: Joi.array()
    .items(Joi.string().trim().max(100))
    .max(50)
    .messages({
      'array.max': 'Maximum 50 skills allowed'
    }),
  experience: Joi.string()
    .valid('entry', 'mid', 'senior', 'executive')
    .default('mid')
    .messages({
      'any.only': 'Experience level must be one of: entry, mid, senior, executive'
    }),
  education: Joi.array()
    .items(Joi.string().trim().max(200))
    .max(20)
    .messages({
      'array.max': 'Maximum 20 education requirements allowed'
    }),
  languages: Joi.array()
    .items(Joi.object({
      language: Joi.string().trim().max(50).required(),
      proficiency: Joi.string().valid('basic', 'intermediate', 'fluent', 'native').required()
    }))
    .max(10)
    .messages({
      'array.max': 'Maximum 10 languages allowed'
    }),
  applicationDeadline: Joi.date()
    .greater('now')
    .allow(null)
    .messages({
      'date.greater': 'Application deadline must be in the future'
    }),
  isRemote: Joi.boolean().default(false),
  visaSponsorship: Joi.boolean().default(false),
  relocationAssistance: Joi.boolean().default(false),
  contact: Joi.object({
    email: Joi.string().email().allow('', null),
    phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).allow('', null),
    website: Joi.string().uri().allow('', null)
  }).allow(null)
});

// Update job validation schema (all fields optional)
const updateJobSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200),
  company: Joi.string().trim().min(2).max(100),
  companyLogo: Joi.string().uri().allow('', null),
  location: Joi.string().trim().min(2).max(255),
  type: Joi.string().valid('full-time', 'part-time', 'contract', 'internship'),
  category: Joi.string().valid('flight-attendant', 'cabin-crew', 'pilot', 'ground-staff', 'management', 'technical'),
  salary: Joi.object({
    min: Joi.number().positive(),
    max: Joi.number().positive().min(Joi.ref('min')),
    currency: Joi.string().length(3).uppercase(),
    period: Joi.string().valid('monthly', 'yearly', 'hourly')
  }),
  description: Joi.string().trim().min(50).max(10000),
  requirements: Joi.array().items(Joi.string().trim().max(500)).max(50),
  responsibilities: Joi.array().items(Joi.string().trim().max(500)).max(50),
  benefits: Joi.array().items(Joi.string().trim().max(200)).max(30),
  skills: Joi.array().items(Joi.string().trim().max(100)).max(50),
  experience: Joi.string().valid('entry', 'mid', 'senior', 'executive'),
  education: Joi.array().items(Joi.string().trim().max(200)).max(20),
  languages: Joi.array()
    .items(Joi.object({
      language: Joi.string().trim().max(50).required(),
      proficiency: Joi.string().valid('basic', 'intermediate', 'fluent', 'native').required()
    }))
    .max(10),
  applicationDeadline: Joi.date().greater('now').allow(null),
  isRemote: Joi.boolean(),
  visaSponsorship: Joi.boolean(),
  relocationAssistance: Joi.boolean(),
  contact: Joi.object({
    email: Joi.string().email().allow('', null),
    phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).allow('', null),
    website: Joi.string().uri().allow('', null)
  }).allow(null)
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Apply to job validation schema
const applyToJobSchema = Joi.object({
  coverLetter: Joi.string()
    .trim()
    .max(5000)
    .allow('', null)
    .messages({
      'string.max': 'Cover letter must not exceed 5000 characters'
    }),
  answers: Joi.array()
    .items(Joi.string().trim().max(1000))
    .max(20)
    .messages({
      'array.max': 'Maximum 20 answers allowed'
    }),
  cvId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow('', null)
    .messages({
      'string.pattern.base': 'CV ID must be a valid MongoDB ObjectId'
    })
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  applyToJobSchema
};

