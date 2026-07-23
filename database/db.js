/**
 * Pure-JS JSON file database. No native bindings required.
 * All operations are synchronous (fs.*Sync) to keep route code simple.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'stayred.json');

/* ── Persistence ───────────────────────────────────────────────── */
function load() {
  if (!fs.existsSync(DB_PATH)) return createEmpty();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return createEmpty();
  }
}

function persist(store) {
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function createEmpty() {
  return {
    users:    [],
    hotels:   [],
    bookings: [],
    _seq: { users: 0, hotels: 0, bookings: 0 }
  };
}

function nextId(store, table) {
  store._seq[table] = (store._seq[table] || 0) + 1;
  return store._seq[table];
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/* ── Users ─────────────────────────────────────────────────────── */
function createUser(name, email, password) {
  const store = load();
  const id = nextId(store, 'users');
  const user = { id, name, email: email.toLowerCase(), password, created_at: now() };
  store.users.push(user);
  persist(store);
  return user;
}

function findUserByEmail(email) {
  return load().users.find(u => u.email === email.toLowerCase()) || null;
}

function findUserById(id) {
  const u = load().users.find(u => u.id === Number(id));
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email };
}

function userEmailExists(email) {
  return load().users.some(u => u.email === email.toLowerCase());
}

/* ── Hotels ────────────────────────────────────────────────────── */
function getAllHotels() {
  return load().hotels;
}

function getHotelsByLocation(location) {
  return load().hotels.filter(h => h.location.toLowerCase() === location.toLowerCase());
}

function getHotelById(id) {
  return load().hotels.find(h => h.id === Number(id)) || null;
}

function insertHotel(hotel) {
  const store = load();
  const id = nextId(store, 'hotels');
  const row = { id, ...hotel };
  store.hotels.push(row);
  persist(store);
  return row;
}

function hotelCount() {
  return load().hotels.length;
}

function insertHotelsBulk(hotels) {
  const store = load();
  for (const hotel of hotels) {
    const id = nextId(store, 'hotels');
    store.hotels.push({ id, ...hotel });
  }
  persist(store);
}

/* ── Bookings ──────────────────────────────────────────────────── */

function datesOverlap(aIn, aOut, bIn, bOut) {
  return new Date(aIn) < new Date(bOut) && new Date(aOut) > new Date(bIn);
}

// Returns { booking } on success or { conflict: true } when dates overlap with an existing booking
function createBooking({ bookingRef, userId, hotelId, guestName, checkIn, checkOut, guests, totalPrice }) {
  const store = load();
  const hotel = store.hotels.find(h => h.id === Number(hotelId));
  if (!hotel) return null;

  // Atomically check for date conflicts and write in a single load→check→persist cycle
  const hasConflict = store.bookings.some(
    b => b.hotel_id === Number(hotelId) &&
         b.status === 'confirmed' &&
         datesOverlap(checkIn, checkOut, b.check_in, b.check_out)
  );
  if (hasConflict) return { conflict: true };

  const id = nextId(store, 'bookings');
  const booking = {
    id,
    booking_ref: bookingRef,
    user_id: Number(userId),
    hotel_id: Number(hotelId),
    guest_name: guestName,
    check_in: checkIn,
    check_out: checkOut,
    guests: Number(guests),
    total_price: totalPrice,
    status: 'confirmed',
    created_at: now(),
    hotel_name: hotel.name,
    hotel_location: hotel.location,
    image_url: hotel.image_url,
    price_per_night: hotel.price_per_night
  };
  store.bookings.push(booking);
  persist(store);
  return { booking };
}

function getBookingsByUser(userId) {
  return load().bookings
    .filter(b => b.user_id === Number(userId))
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

function getBookingByRef(ref, userId) {
  const store = load();
  const b = store.bookings.find(b => b.booking_ref === ref && b.user_id === Number(userId));
  if (!b) return null;
  const user = store.users.find(u => u.id === b.user_id);
  return { ...b, user_name: user?.name, user_email: user?.email };
}

module.exports = {
  // Users
  createUser, findUserByEmail, findUserById, userEmailExists,
  // Hotels
  getAllHotels, getHotelsByLocation, getHotelById, insertHotel, hotelCount, insertHotelsBulk,
  // Bookings
  createBooking, getBookingsByUser, getBookingByRef
};
