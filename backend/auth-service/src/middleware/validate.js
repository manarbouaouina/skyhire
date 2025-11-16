// auth-service/src/middleware/validate.js
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      // Log validation errors
      console.warn('Validation error:', {
        path: req.path,
        method: req.method,
        errors: error.details.map(d => d.message),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

module.exports = validate;

