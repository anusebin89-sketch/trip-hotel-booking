const { z } = require('zod');

const getHotelByIdSchema = z.object({
  id: z
    .string({ required_error: 'Hotel ID is required' })
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Hotel ID must be a valid positive number'
    })
});

const searchHotelsSchema = z.object({
  location: z
    .string()
    .max(100, 'Location must be at most 100 characters')
    .optional()
});

module.exports = { getHotelByIdSchema, searchHotelsSchema };
