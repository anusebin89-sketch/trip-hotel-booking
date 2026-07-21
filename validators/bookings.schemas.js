const Joi = require('joi');

/**
 * Validation schema for POST /api/bookings
 */
const createBookingSchema = Joi.object({
  hotelId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Hotel ID must be a number',
      'number.integer': 'Hotel ID must be an integer',
      'number.positive': 'Hotel ID must be a positive number',
      'any.required': 'Hotel ID is required'
    }),

  guestName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Guest name is required',
      'string.min': 'Guest name must be at least 2 characters',
      'string.max': 'Guest name must not exceed 100 characters',
      'any.required': 'Guest name is required'
    }),

  checkIn: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Check-in must be a valid date',
      'date.format': 'Check-in must be in ISO date format (YYYY-MM-DD)',
      'any.required': 'Check-in date is required'
    }),

  checkOut: Joi.date()
    .iso()
    .greater(Joi.ref('checkIn'))
    .required()
    .messages({
      'date.base': 'Check-out must be a valid date',
      'date.format': 'Check-out must be in ISO date format (YYYY-MM-DD)',
      'date.greater': 'Check-out date must be after check-in date',
      'any.required': 'Check-out date is required'
    }),

  guests: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .required()
    .messages({
      'number.base': 'Number of guests must be a number',
      'number.integer': 'Number of guests must be an integer',
      'number.min': 'At least 1 guest is required',
      'number.max': 'Maximum 20 guests allowed',
      'any.required': 'Number of guests is required'
    }),

  cardNumber: Joi.string()
    .trim()
    .pattern(/^[\d\s]{13,19}$/)
    .required()
    .messages({
      'string.empty': 'Card number is required',
      'string.pattern.base': 'Card number must be 13-19 digits',
      'any.required': 'Card number is required'
    }),

  cardName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Card holder name is required',
      'string.min': 'Card holder name must be at least 2 characters',
      'string.max': 'Card holder name must not exceed 100 characters',
      'any.required': 'Card holder name is required'
    }),

  expiry: Joi.string()
    .trim()
    .pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)
    .required()
    .messages({
      'string.empty': 'Card expiry is required',
      'string.pattern.base': 'Card expiry must be in MM/YY format',
      'any.required': 'Card expiry is required'
    }),

  cvv: Joi.string()
    .trim()
    .pattern(/^\d{3,4}$/)
    .required()
    .messages({
      'string.empty': 'CVV is required',
      'string.pattern.base': 'CVV must be 3 or 4 digits',
      'any.required': 'CVV is required'
    })
});

module.exports = {
  createBookingSchema
};
