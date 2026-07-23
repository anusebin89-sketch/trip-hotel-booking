# Functional Requirements Document (FRD)

**Project:** StayRed – Hotel Booking Web Application  
**Version:** 1.0  
**Date:** 2026-07-20  
**Author:** Generated from source code analysis  

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Data Models](#4-data-models)
5. [Functional Requirements](#5-functional-requirements)
   - 5.1 [User Authentication](#51-user-authentication)
   - 5.2 [Hotel Search & Discovery](#52-hotel-search--discovery)
   - 5.3 [Booking Flow](#53-booking-flow)
   - 5.4 [Mock Payment Processing](#54-mock-payment-processing)
   - 5.5 [Booking Management](#55-booking-management)
   - 5.6 [Navigation & UI Routing](#56-navigation--ui-routing)
6. [API Specification](#6-api-specification)
   - 6.1 [Authentication Endpoints](#61-authentication-endpoints)
   - 6.2 [Hotel Endpoints](#62-hotel-endpoints)
   - 6.3 [Booking Endpoints](#63-booking-endpoints)
7. [Business Rules & Validation](#7-business-rules--validation)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Seed Data](#9-seed-data)
10. [Out of Scope](#10-out-of-scope)

---

## 1. Overview

**StayRed** is a full-stack hotel booking web application that allows users to discover hotels across five international destinations, create accounts, search for availability, and complete mock bookings with simulated payment processing. The application is a single-page application (SPA) served by a Node.js/Express backend with a JSON-file-based persistence layer.

**Core User Journey:**
1. Land on the home page and browse destinations.
2. Select a destination, optionally pick dates and guest count, and search.
3. Browse hotel cards; click "Book Now".
4. Authenticate (login or register) if not already signed in.
5. Complete the two-step booking modal: stay details → mock payment.
6. Receive a confirmation page with a booking reference.
7. Review all past bookings on the "My Bookings" page.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Client Browser                   │
│   index.html + styles.css + app.js (vanilla JS SPA)  │
│   - Page routing (home / auth / bookings / confirm)  │
│   - Booking modal (step 1: details, step 2: payment) │
└─────────────────────┬────────────────────────────────┘
                      │  HTTP/REST (JSON)
┌─────────────────────▼────────────────────────────────┐
│               Express.js Server (server.js)          │
│   Port: 8080 (default) | PORT env var override       │
│   - express-session (server-side sessions)           │
│   - Static file serving (/public)                    │
│   - SPA fallback (all unmatched → index.html)        │
├──────────────────────────────────────────────────────┤
│  Route Layer                                         │
│   /api/auth     → routes/auth.js                     │
│   /api/hotels   → routes/hotels.js                   │
│   /api/bookings → routes/bookings.js                 │
├──────────────────────────────────────────────────────┤
│  Middleware                                          │
│   middleware/auth.js  → requireAuth (session check)  │
├──────────────────────────────────────────────────────┤
│  Database Layer (database/db.js)                     │
│   Pure-JS JSON file store (database/stayred.json)    │
│   - Synchronous fs read/write                        │
│   - Auto-incrementing integer IDs per table          │
└──────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Web Framework | Express.js 4.18 |
| Session Management | express-session 1.17 |
| Password Hashing | bcryptjs 2.4 (cost factor: 10) |
| UUID Generation | uuid 9.0 (v4, used for booking refs) |
| Database | JSON flat-file (`database/stayred.json`) |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (ES2020) |
| Fonts | Google Fonts – Inter (300–800 weight) |
| Dev Tool | nodemon 3.0 |

---

## 4. Data Models

### 4.1 Users

| Field | Type | Constraints |
|---|---|---|
| `id` | Integer | Auto-increment, primary key |
| `name` | String | Required |
| `email` | String (lowercase) | Required, unique |
| `password` | String | bcrypt hash, min 6 chars raw |
| `created_at` | Datetime string | ISO 8601, set on creation |

### 4.2 Hotels

| Field | Type | Description |
|---|---|---|
| `id` | Integer | Auto-increment, primary key |
| `name` | String | Hotel display name |
| `location` | String | City name (Paris / Tokyo / New York / London / Sydney) |
| `description` | String | Short marketing description |
| `price_per_night` | Number | USD price per night |
| `rating` | Number | 0–5 star rating (one decimal place) |
| `image_url` | String | Unsplash image URL |
| `amenities` | String | Comma-separated list of amenities |

### 4.3 Bookings

| Field | Type | Description |
|---|---|---|
| `id` | Integer | Auto-increment, primary key |
| `booking_ref` | String | Format: `SR-<8-char UUID fragment>` (e.g. `SR-A1B2C3D4`) |
| `user_id` | Integer | FK → Users.id |
| `hotel_id` | Integer | FK → Hotels.id |
| `guest_name` | String | Name entered at booking time |
| `check_in` | Date string | YYYY-MM-DD |
| `check_out` | Date string | YYYY-MM-DD |
| `guests` | Integer | 1–5 |
| `total_price` | Number | Calculated: nights × price_per_night |
| `status` | String | Fixed value: `"confirmed"` |
| `created_at` | Datetime string | ISO 8601 |
| `hotel_name` | String | Denormalised from hotel at creation time |
| `hotel_location` | String | Denormalised from hotel at creation time |
| `image_url` | String | Denormalised from hotel at creation time |
| `price_per_night` | Number | Denormalised from hotel at creation time |

### 4.4 Internal Sequence Counters

```json
"_seq": { "users": 0, "hotels": 0, "bookings": 0 }
```

Each counter is incremented before a record is inserted; the resulting value becomes the new record's `id`.

---

## 5. Functional Requirements

### 5.1 User Authentication

#### FR-AUTH-01 – User Registration

- **Description:** A new visitor can create an account with a full name, email address, and password.
- **Trigger:** User submits the Register form on the Auth page.
- **Input:** `name` (string), `email` (string), `password` (string, min 6 chars).
- **Processing:**
  1. Validate all three fields are present; return HTTP 400 if any are missing.
  2. Reject password shorter than 6 characters (HTTP 400).
  3. Check email uniqueness (case-insensitive); return HTTP 409 if already registered.
  4. Hash the password with bcrypt (cost factor 10).
  5. Persist the new user record.
  6. Establish a server-side session (`session.userId`, `session.userName`).
- **Output:** HTTP 201 with `{ message, user: { id, name, email } }`.
- **Post-condition:** User is logged in; navbar shows their first name and a Logout button.

#### FR-AUTH-02 – User Login

- **Description:** An existing user can authenticate with their email and password.
- **Trigger:** User submits the Login form.
- **Input:** `email`, `password`.
- **Processing:**
  1. Validate both fields present; return HTTP 400 if missing.
  2. Look up user by email (case-insensitive); return HTTP 401 if not found.
  3. Verify password against bcrypt hash; return HTTP 401 if invalid.
  4. Establish a server-side session.
- **Output:** HTTP 200 with `{ message, user: { id, name, email } }`.
- **Post-condition:** User is logged in; toast notification greets user by first name.

#### FR-AUTH-03 – User Logout

- **Description:** A logged-in user can terminate their session.
- **Trigger:** User clicks the Logout button in the navbar.
- **Processing:** Destroy the server-side session.
- **Output:** HTTP 200 with `{ message }`.
- **Post-condition:** `currentUser` is null; navbar reverts to Login button; home page is shown.

#### FR-AUTH-04 – Session Persistence Check

- **Description:** On page load the frontend checks whether a session is still active.
- **Trigger:** `DOMContentLoaded` event fires.
- **Processing:** `GET /api/auth/me` is called; if `user` is non-null, `currentUser` is set and navbar updated.
- **Session lifetime:** 24 hours (`maxAge: 86_400_000 ms`), `httpOnly: true`, `secure: false` (development).

#### FR-AUTH-05 – Auth Guard for Booking & Bookings Page

- **Description:** Unauthenticated users who attempt to open the booking modal or navigate to My Bookings are redirected to the Login page with an error toast.

---

### 5.2 Hotel Search & Discovery

#### FR-HOTEL-01 – Destination Dropdown Search

- **Description:** Users select a destination from a fixed dropdown, optionally add dates and guest count, and click "Search Hotels".
- **Available destinations:** Paris (France), Tokyo (Japan), New York (USA), London (UK), Sydney (Australia).
- **Validation:** If no destination is selected, a toast error is shown and focus is moved to the dropdown.
- **Processing:** Calls `GET /api/hotels?location=<destination>`.
- **Output:** Hotels grid with matching hotel cards; count badge showing `N hotels found`.

#### FR-HOTEL-02 – Quick Destination Search

- **Description:** Clicking any destination card in the "Popular Destinations" section or any footer link immediately populates the destination dropdown and runs a search.

#### FR-HOTEL-03 – Hotel Card Display

Each hotel card renders:
- Hotel image (lazy-loaded; fallback icon on error).
- Star rating (filled, half, and empty stars) plus numeric rating.
- Hotel name and location.
- Amenities list (comma-separated, prefixed with ✓).
- Price per night in USD.
- "Book Now" button.

#### FR-HOTEL-04 – Loading Skeletons

While hotels are being fetched from the API, three skeleton placeholder cards are displayed to provide visual feedback.

#### FR-HOTEL-05 – Empty State

If a location returns zero hotels, an empty-state card with a "No hotels found" message and the destination name is rendered.

---

### 5.3 Booking Flow

#### FR-BOOK-01 – Open Booking Modal

- **Trigger:** User clicks "Book Now" on a hotel card.
- **Auth gate:** If unauthenticated, redirect to login (FR-AUTH-05).
- **Pre-fill:** Check-in, check-out, and guest count are pre-filled from the last search query. Guest name is pre-filled from the logged-in user's name.
- **Behaviour:** A two-step modal overlays the page; body scrolling is disabled.

#### FR-BOOK-02 – Step 1: Stay Details

Fields collected:
- **Guest Name** (required, text)
- **Number of Guests** (1–5, select)
- **Check-in Date** (required, date; minimum: today)
- **Check-out Date** (required, date; minimum: tomorrow)

**Dynamic Price Summary:** Updates in real time when either date changes, showing:
- `N nights × $price_per_night`
- Grand total

**Validation on "Continue to Payment":**
- Guest name must not be empty.
- Both dates must be selected.
- Check-out must be strictly after check-in.

#### FR-BOOK-03 – Step 2: Payment

Fields collected:
- **Cardholder Name** (required)
- **Card Number** (required; formatted as `XXXX XXXX XXXX XXXX` on input; max 16 digits)
- **Expiry Date** (required; auto-formatted as `MM/YY`; must contain `/`)
- **CVV** (required; numeric only; 3–4 digits)

**Amount display:** Repeats the grand total from Step 1 under "Amount to Charge".  
**Test-mode notice:** Prominent banner showing the accepted test card (`4242 4242 4242 4242`).  
**Back navigation:** "Back to Details" button returns to Step 1 without clearing entered data.

---

### 5.4 Mock Payment Processing

#### FR-PAY-01 – Payment Submission

- **Trigger:** User clicks "Pay Now" in Step 2.
- **Client-side validation:** All four payment fields must be non-empty, expiry must contain `/` and be 5 chars, CVV must be at least 3 chars.
- **Loading state:** Button is disabled, text changes to "Processing...", spinner is shown; a 1.2 s artificial delay simulates network latency.
- **API call:** `POST /api/bookings` with all booking + payment fields.

#### FR-PAY-02 – Server-side Payment Validation

- Card number is stripped of spaces.
- **Accepted card:** `4242424242424242` only.
- **Declined card:** Any other value returns HTTP 402 with a descriptive error message.

#### FR-PAY-03 – Booking Reference Generation

- A UUID v4 is generated; the first 8 hex characters (uppercased) are prefixed with `SR-`.
- Example: `SR-A3F7B1C9`.

#### FR-PAY-04 – Total Price Calculation

```
nights = ceil((checkOutDate − checkInDate) / 86_400_000)
totalPrice = round(nights × hotel.price_per_night, 2)
```

---

### 5.5 Booking Management

#### FR-MGT-01 – Booking Confirmation Page

After a successful payment:
- Modal closes.
- Confirmation page is shown with a green checkmark icon.
- A receipt card displays: booking reference, hotel name, location, guest name, check-in, check-out, duration, guest count, and total paid.
- Two CTAs: "View All Bookings" and "Book Another Hotel".

#### FR-MGT-02 – My Bookings List

- **Access:** Navbar "My Bookings" link (auth-guarded).
- **API:** `GET /api/bookings/my` (session-authenticated).
- **Display:** Bookings sorted descending by `created_at`. Each item shows hotel thumbnail, name, location, check-in, check-out, duration, guest count, total paid, booking reference, and a status badge.
- **Empty state:** Message prompting user to explore hotels.
- **Loading state:** Skeleton cards while fetching.

#### FR-MGT-03 – Booking Detail Lookup by Reference

- **API:** `GET /api/bookings/:ref` (session-authenticated).
- Returns booking data enriched with the user's name and email.
- Returns HTTP 404 if the reference doesn't belong to the requesting user.

---

### 5.6 Navigation & UI Routing

The application is a single-page application; "pages" are CSS-toggled `<div>` sections.

| Page ID | Route | Visible When |
|---|---|---|
| `page-home` | (default) | Initial load, after login/logout/confirmation CTA |
| `page-auth` | (SPA state) | Auth nav clicked while logged out; booking attempt while logged out |
| `page-bookings` | (SPA state) | "My Bookings" clicked while logged in |
| `page-confirmation` | (SPA state) | After successful booking payment |

**Mobile menu:** A hamburger button toggles a slide-down mobile nav with the same links.

**Toast notifications:** Transient status messages (3.5 s auto-dismiss) displayed at the bottom of the viewport in success or error variants.

---

## 6. API Specification

### 6.1 Authentication Endpoints

#### `POST /api/auth/register`

| | |
|---|---|
| **Auth required** | No |
| **Request body** | `{ name, email, password }` |
| **Success** | `201 { message, user: { id, name, email } }` |
| **Errors** | `400` missing fields / short password · `409` email exists |

#### `POST /api/auth/login`

| | |
|---|---|
| **Auth required** | No |
| **Request body** | `{ email, password }` |
| **Success** | `200 { message, user: { id, name, email } }` |
| **Errors** | `400` missing fields · `401` invalid credentials |

#### `POST /api/auth/logout`

| | |
|---|---|
| **Auth required** | No (session destroyed if present) |
| **Success** | `200 { message }` |

#### `GET /api/auth/me`

| | |
|---|---|
| **Auth required** | No |
| **Success** | `200 { user: { id, name, email } }` or `{ user: null }` |

---

### 6.2 Hotel Endpoints

#### `GET /api/hotels`

| | |
|---|---|
| **Auth required** | No |
| **Query params** | `location` (optional string, case-insensitive filter) |
| **Success** | `200 { hotels: [ HotelObject ] }` |

#### `GET /api/hotels/:id`

| | |
|---|---|
| **Auth required** | No |
| **Path param** | `id` (integer) |
| **Success** | `200 { hotel: HotelObject }` |
| **Errors** | `404` hotel not found |

---

### 6.3 Booking Endpoints

#### `POST /api/bookings`

| | |
|---|---|
| **Auth required** | Yes (`requireAuth` middleware) |
| **Request body** | `{ hotelId, guestName, checkIn, checkOut, guests, cardNumber, cardName, expiry, cvv }` |
| **Success** | `201 { message, booking: BookingObject }` |
| **Errors** | `400` missing fields · `402` payment declined · `404` hotel not found · `400` invalid dates |

#### `GET /api/bookings/my`

| | |
|---|---|
| **Auth required** | Yes |
| **Success** | `200 { bookings: [ BookingObject ] }` (descending by created_at) |
| **Errors** | `401` not authenticated |

#### `GET /api/bookings/:ref`

| | |
|---|---|
| **Auth required** | Yes |
| **Path param** | `ref` (booking reference string, e.g. `SR-A3F7B1C9`) |
| **Success** | `200 { booking: BookingObject + user_name + user_email }` |
| **Errors** | `401` not authenticated · `404` not found / not owner |

---

## 7. Business Rules & Validation

| Rule | Details |
|---|---|
| **BR-01** | Password minimum length is 6 characters; enforced both client-side (`minlength="6"` attribute) and server-side. |
| **BR-02** | Email addresses are stored and compared in lowercase. |
| **BR-03** | Check-out date must be strictly after check-in date. |
| **BR-04** | Minimum check-in date is today; minimum check-out date is tomorrow (enforced client-side via `min` attribute). |
| **BR-05** | Only the exact card number `4242424242424242` (spaces stripped) is accepted. All other numbers return a payment declined error. |
| **BR-06** | Guest count is 1–5 (enforced via dropdown). |
| **BR-07** | A booking belongs to the authenticated user who created it; `GET /api/bookings/:ref` verifies both the reference and the user ID. |
| **BR-08** | Total price is calculated server-side (not trusted from the client), using `ceil(nights) × hotel.price_per_night`. |
| **BR-09** | Booking status is always set to `"confirmed"` at creation; there is no cancellation workflow. |
| **BR-10** | Hotel data is denormalised into the booking record at creation time to preserve the price and name even if hotel data changes later. |

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | The JSON flat-file database is read and written synchronously per request; suitable for development/demo loads only. |
| **Security** | Passwords are hashed with bcrypt (cost 10). Session cookie is `httpOnly`. No SQL injection risk (no SQL used). Client-side HTML is escaped via `escHtml()` to prevent XSS. |
| **Scalability** | The JSON flat-file approach is not suitable for concurrent writes or large datasets; a production deployment would require a relational or document database. |
| **Availability** | Single-process Node.js server; no clustering or load balancing. |
| **Portability** | No native bindings; runs on any platform with Node.js. Default port `8080` is overridable via `PORT` environment variable. |
| **Responsiveness** | CSS uses a fluid grid layout and media queries; supports mobile viewports via a hamburger navigation menu. |
| **Accessibility** | Basic semantic HTML; form labels associated with inputs; `loading="lazy"` on hotel images. |

---

## 9. Seed Data

The application auto-seeds on first boot if no hotels exist in the database (`seed.js` is `require()`d in `server.js`).

**10 hotels across 5 cities (2 per city):**

| Hotel | Location | Price/Night | Rating |
|---|---|---|---|
| Le Grand Parisian | Paris | $320 | 4.8 |
| Montmartre Boutique | Paris | $195 | 4.5 |
| Tokyo Imperial Palace Hotel | Tokyo | $410 | 4.9 |
| Shibuya Crossing Suites | Tokyo | $250 | 4.6 |
| Manhattan Sky Tower | New York | $480 | 4.7 |
| Brooklyn Bridge Inn | New York | $280 | 4.4 |
| Buckingham Grand Hotel | London | $360 | 4.8 |
| Covent Garden Retreat | London | $220 | 4.5 |
| Sydney Harbour View Resort | Sydney | $390 | 4.9 |
| Bondi Beach Bungalows | Sydney | $210 | 4.6 |

---

## 10. Out of Scope

The following features are **not** implemented in the current version and would be required for a production system:

- Real payment gateway integration (Stripe, PayPal, etc.)
- Booking cancellation or modification
- Hotel availability / room inventory management
- Email notifications (booking confirmations, receipts)
- Admin panel for managing hotels and bookings
- Password reset / forgot password flow
- OAuth / social login
- Hotel ratings and user reviews
- Search filtering by price, rating, or amenities
- Multi-room or multi-hotel bookings in a single transaction
- Production database (PostgreSQL, MySQL, MongoDB, etc.)
- HTTPS / TLS termination
- Rate limiting or CSRF protection
- Logging, monitoring, and alerting infrastructure
