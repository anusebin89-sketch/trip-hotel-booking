/**
 * Generic validation middleware using Zod schemas.
 * Validates request body, query, or params against the provided schema.
 * Returns structured HTTP 400 errors on validation failure.
 */

/**
 * Creates a middleware function that validates request data against a Zod schema.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - The request property to validate
 * @returns {Function} Express middleware function
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace the source data with the parsed (and potentially transformed) data
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
