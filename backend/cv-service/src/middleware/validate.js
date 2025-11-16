// cv-service/src/middleware/validate.js
const validate = (schema) => {
  return (req, res, next) => {
    // For file uploads, validate both body and file
    const dataToValidate = { ...req.body };
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
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

    req.body = value;
    next();
  };
};

module.exports = validate;

