/**
 * Generic Joi validation middleware factory.
 * Validates request data against a Joi schema and returns
 * a structured 400 error response on validation failure.
 *
 * @param {import('joi').Schema} schema - Joi schema to validate against
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, "'")
      }));

      return res.status(400).json({
        error: 'Validation failed',
        statusCode: 400,
        details
      });
    }

    // Replace request data with validated (and sanitized) values
    req[source] = value;
    next();
  };
}

module.exports = { validate };
