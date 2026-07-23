const express = require('express');
const { HotelRepository: db } = require('../database/repository');

const router = express.Router();

router.get('/', (req, res) => {
  const { location } = req.query;
  const hotels = location ? db.findByLocation(location) : db.findAll();
  res.json({ hotels });
});

router.get('/:id', (req, res) => {
  const hotel = db.findById(req.params.id);
  if (!hotel) {
    return res.status(404).json({ error: 'Hotel not found.' });
  }
  res.json({ hotel });
});

module.exports = router;
