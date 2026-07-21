const Joi = require('joi');

/**
 * Validation schema for GET /api/hotels query parameters
 */
const listHotelsQuerySchema = Joi.object({
  location: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Location filter cannot be empty',
      'string.min': 'Location filter must be at least 1 character',
      'string.max': 'Location filter must not exceed 100 characters'
    })
});

/**
 * Validation schema for GET /api/hotels/:id route parameters
 */
const getHotelParamsSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Hotel ID must be a valid number',
      'number.integer': 'Hotel ID must be an integer',
      'number.positive': 'Hotel ID must be a positive number',
      'any.required': 'Hotel ID is required'
    })
});

module.exports = {
  listHotelsQuerySchema,
  getHotelParamsSchema
};
