const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MOCK_TEST_CARD = '4242424242424242';

router.post('/', requireAuth, (req, res) => {
  const { hotelId, guestName, checkIn, checkOut, guests, cardNumber, cardName, expiry, cvv } = req.body;

  if (!hotelId || !guestName || !checkIn || !checkOut || !guests) {
    return res.status(400).json({ error: 'All booking fields are required.' });
  }
  if (!cardNumber || !cardName || !expiry || !cvv) {
    return res.status(400).json({ error: 'All payment fields are required.' });
  }

  const cleanCard = cardNumber.replace(/\s+/g, '');
  if (cleanCard !== MOCK_TEST_CARD) {
    return res.status(402).json({
      error: 'Payment declined. Your card was not accepted. Please use the test card: 4242 4242 4242 4242.'
    });
  }

  const hotel = db.getHotelById(hotelId);
  if (!hotel) {
    return res.status(404).json({ error: 'Hotel not found.' });
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (isNaN(checkInDate) || isNaN(checkOutDate) || checkOutDate <= checkInDate) {
    return res.status(400).json({ error: 'Invalid check-in or check-out dates.' });
  }

  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const totalPrice = parseFloat((nights * hotel.price_per_night).toFixed(2));
  const bookingRef = 'SR-' + uuidv4().split('-')[0].toUpperCase();

  const booking = db.createBooking({
    bookingRef,
    userId: req.session.userId,
    hotelId,
    guestName,
    checkIn,
    checkOut,
    guests,
    totalPrice
  });

  res.status(201).json({ message: 'Booking confirmed!', booking });
});

router.get('/my', requireAuth, (req, res) => {
  const bookings = db.getBookingsByUser(req.session.userId);
  res.json({ bookings });
});

router.get('/:ref', requireAuth, (req, res) => {
  const booking = db.getBookingByRef(req.params.ref, req.session.userId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }
  res.json({ booking });
});

module.exports = router;
