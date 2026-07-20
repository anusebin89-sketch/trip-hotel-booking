# StayRed – Hotel Booking Website

A fully functional hotel booking web application with a clean Red & White theme, built with Node.js, Express, SQLite, and vanilla JavaScript.

---

## Features

- **User Authentication** – Register, login, and logout with bcrypt-hashed passwords
- **Hotel Search** – Browse hotels across 5 destinations via dropdown
- **Booking Flow** – Multi-step booking modal with date selection and dynamic price calculation
- **Mock Payment** – Test card validation (`4242 4242 4242 4242` succeeds, all others decline)
- **Booking History** – View all past bookings with full receipt details
- **Responsive Design** – Works on mobile, tablet, and desktop

---

## Project Structure

```
hotel-booking/
├── server.js              # Express server entry point
├── seed.js                # Database seeding script (10 hotels)
├── package.json
├── README.md
├── database/
│   └── db.js              # SQLite setup & schema
├── middleware/
│   └── auth.js            # Session auth middleware
├── routes/
│   ├── auth.js            # POST /api/auth/register|login|logout, GET /api/auth/me
│   ├── hotels.js          # GET /api/hotels, GET /api/hotels/:id
│   └── bookings.js        # POST /api/bookings, GET /api/bookings/my
├── public/
│   ├── index.html         # Single-page app shell
│   ├── css/
│   │   └── styles.css     # Red & white theme
│   └── js/
│       └── app.js         # Frontend SPA logic
└── test-cards/
    └── test-cards.md      # Test payment card reference
```

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Seed the Database (Optional)

The database is auto-seeded when the server starts for the first time. You can also run it manually:

```bash
node seed.js
```

This creates `database/stayred.db` and populates it with 10 hotels across 5 destinations.

### 3. Start the Server

```bash
node server.js
# or
npm start
```

Visit: **http://localhost:8080**

For development with auto-reload:
```bash
npm run dev
```

---

## API Endpoints

| Method | Endpoint                  | Description                  | Auth Required |
|--------|---------------------------|------------------------------|---------------|
| POST   | `/api/auth/register`      | Create a new account         | No            |
| POST   | `/api/auth/login`         | Login                        | No            |
| POST   | `/api/auth/logout`        | Logout                       | No            |
| GET    | `/api/auth/me`            | Get current user             | No            |
| GET    | `/api/hotels`             | List all hotels              | No            |
| GET    | `/api/hotels?location=X`  | Search hotels by destination | No            |
| GET    | `/api/hotels/:id`         | Get a single hotel           | No            |
| POST   | `/api/bookings`           | Create a booking             | Yes           |
| GET    | `/api/bookings/my`        | Get user's bookings          | Yes           |
| GET    | `/api/bookings/:ref`      | Get booking by reference     | Yes           |

---

## Test Payment Cards

See `test-cards/test-cards.md` for full details.

| Card Number           | Result    |
|-----------------------|-----------|
| `4242 4242 4242 4242` | ✅ Success |
| Any other number      | ❌ Declined |

---

## Available Destinations

- 🇫🇷 Paris, France
- 🇯🇵 Tokyo, Japan
- 🗽 New York, USA
- 🇬🇧 London, UK
- 🦘 Sydney, Australia

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Node.js, Express.js               |
| Database   | SQLite via `better-sqlite3`       |
| Sessions   | `express-session`                 |
| Auth       | `bcryptjs` (password hashing)     |
| Frontend   | HTML5, CSS3, Vanilla JavaScript   |
| IDs        | `uuid` (booking reference)        |
