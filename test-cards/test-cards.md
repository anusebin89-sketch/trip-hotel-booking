# StayRed – Test Payment Cards

Use these cards in the StayRed booking payment form to simulate transactions.
No real charges are ever made.

---

## ✅ Successful Payment

| Field          | Value                   |
|----------------|-------------------------|
| Card Number    | `4242 4242 4242 4242`   |
| Cardholder Name| Any name (e.g. `Test User`) |
| Expiry Date    | Any future date (e.g. `12/26`) |
| CVV            | Any 3–4 digits (e.g. `123`) |

**Result:** Booking is confirmed, a receipt is generated, and the booking is saved in the database.

---

## ❌ Declined Payment

| Field          | Value                   |
|----------------|-------------------------|
| Card Number    | Any number **other than** `4242 4242 4242 4242` |
| Cardholder Name| Any name                |
| Expiry Date    | Any date                |
| CVV            | Any digits              |

**Examples of declined cards:**
- `4111 1111 1111 1111`
- `5500 0000 0000 0004`
- `1234 5678 9012 3456`

**Result:** Payment is declined with an error message. No booking is created.

---

## Notes

- The test card logic is handled server-side in `routes/bookings.js`.
- Only the exact card number `4242424242424242` (without spaces) is accepted.
- This is a mock payment system — no real payment gateway is integrated.
- In production, this would be replaced with Stripe, PayPal, or similar.
