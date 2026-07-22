const { z } = require('zod');

const createBookingSchema = z.object({
  hotelId: z
    .number({ required_error: 'Hotel ID is required', invalid_type_error: 'Hotel ID must be a number' })
    .int('Hotel ID must be an integer')
    .positive('Hotel ID must be a positive number'),
  guestName: z
    .string({ required_error: 'Guest name is required' })
    .min(1, 'Guest name is required')
    .max(200, 'Guest name must be at most 200 characters'),
  checkIn: z
    .string({ required_error: 'Check-in date is required' })
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Check-in must be a valid date' }),
  checkOut: z
    .string({ required_error: 'Check-out date is required' })
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Check-out must be a valid date' }),
  guests: z
    .number({ required_error: 'Number of guests is required', invalid_type_error: 'Guests must be a number' })
    .int('Guests must be an integer')
    .min(1, 'At least 1 guest is required')
    .max(20, 'Maximum 20 guests allowed'),
  cardNumber: z
    .string({ required_error: 'Card number is required' })
    .min(1, 'Card number is required'),
  cardName: z
    .string({ required_error: 'Cardholder name is required' })
    .min(1, 'Cardholder name is required'),
  expiry: z
    .string({ required_error: 'Card expiry is required' })
    .min(1, 'Card expiry is required'),
  cvv: z
    .string({ required_error: 'CVV is required' })
    .min(3, 'CVV must be at least 3 characters')
    .max(4, 'CVV must be at most 4 characters')
}).refine((data) => {
  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
  return checkOutDate > checkInDate;
}, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOut']
});

module.exports = { createBookingSchema };
