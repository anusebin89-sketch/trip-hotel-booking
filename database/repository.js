/**
 * Repository layer — thin abstraction over db.js.
 * Routes depend on this interface, not on the storage implementation.
 * Swap db.js for Knex/SQLite by updating this file only.
 */
const db = require('./db');

const UserRepository = {
  create: (name, email, password) => db.createUser(name, email, password),
  findByEmail: (email) => db.findUserByEmail(email),
  findById: (id) => db.findUserById(id),
  findByIdRaw: (id) => db.findUserByIdRaw(id),
  updateEmail: (id, newEmail) => db.updateUserEmail(id, newEmail),
  emailExists: (email) => db.userEmailExists(email),
};

const HotelRepository = {
  findAll: () => db.getAllHotels(),
  findByLocation: (location) => db.getHotelsByLocation(location),
  findById: (id) => db.getHotelById(id),
};

const BookingRepository = {
  create: (data) => db.createBooking(data),
  findByUser: (userId) => db.getBookingsByUser(userId),
  findByRef: (ref, userId) => db.getBookingByRef(ref, userId),
};

module.exports = { UserRepository, HotelRepository, BookingRepository };
