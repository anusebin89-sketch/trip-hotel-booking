const express = require('express');
const db = require('../database/db');
const { validate } = require('../middleware/validate');
const { getHotelByIdSchema, searchHotelsSchema } = require('../schemas/hotel.schema');

const router = express.Router();

router.get('/', validate(searchHotelsSchema, 'query'), (req, res) => {
  const { location } = req.query;
  const hotels = location ? db.getHotelsByLocation(location) : db.getAllHotels();
  res.json({ hotels });
});

router.get('/:id', validate(getHotelByIdSchema, 'params'), (req, res) => {
  const hotel = db.getHotelById(req.params.id);
  if (!hotel) {
    return res.status(404).json({ error: 'Hotel not found.' });
  }
  res.json({ hotel });
});

module.exports = router;