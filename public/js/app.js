/* ─── STATE ─────────────────────────────────────────────────── */
let currentUser = null;
let selectedHotel = null;
let bookingSearchDates = { checkIn: '', checkOut: '', guests: 1 };

/* ─── INIT ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  setMinDates();
  await checkAuth();
  showPage('home');
});

function setMinDates() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  document.getElementById('checkin-search').min = today;
  document.getElementById('checkout-search').min = tomorrow;
  document.getElementById('book-checkin').min = today;
  document.getElementById('book-checkout').min = tomorrow;
}

/* ─── AUTH CHECK ────────────────────────────────────────────── */
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    currentUser = data.user;
    updateNavAuth();
  } catch (e) {
    currentUser = null;
  }
}

function updateNavAuth() {
  const btn = document.getElementById('nav-auth-btn');
  const name = document.getElementById('nav-username');
  const mobileAuth = document.getElementById('mobile-auth');

  if (currentUser) {
    btn.textContent = 'Logout';
    btn.onclick = handleLogout;
    name.textContent = `Hi, ${currentUser.name.split(' ')[0]}`;
    name.style.display = 'inline';
    if (mobileAuth) mobileAuth.textContent = 'Logout';
  } else {
    btn.textContent = 'Login';
    btn.onclick = handleAuthNav;
    name.style.display = 'none';
    if (mobileAuth) mobileAuth.textContent = 'Login';
  }
}

/* ─── PAGE ROUTING ──────────────────────────────────────────── */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) {
    el.classList.add('active');
    window.scrollTo(0, 0);
  }
}

function handleAuthNav() {
  if (currentUser) {
    handleLogout();
  } else {
    showPage('auth');
    switchAuthTab('login');
  }
}

function handleMyBookings() {
  if (!currentUser) {
    showPage('auth');
    switchAuthTab('login');
    showToast('Please log in to view your bookings', 'error');
    return;
  }
  showPage('bookings');
  loadMyBookings();
}

/* ─── ACCOUNT / RESET EMAIL ───────────────────────────────────── */
function showAccount() {
  if (!currentUser) {
    showPage('auth');
    switchAuthTab('login');
    showToast('Please log in to manage your account', 'error');
    return;
  }
  showPage('account');
}

async function handleResetEmail() {
  const errEl = document.getElementById('reset-error');
  const currentPassword = document.getElementById('reset-current-password').value.trim();
  const newEmail = document.getElementById('reset-new-email').value.trim();

  if (!currentPassword || !newEmail) {
    showError(errEl, 'Both fields are required.');
    return;
  }
  if (newEmail.length > 100) {
    showError(errEl, 'Email must be 100 characters or fewer.');
    return;
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(newEmail)) {
    showError(errEl, 'Please enter a valid email address.');
    return;
  }

  hideError(errEl);

  try {
    const res = await fetch('/api/auth/reset-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newEmail })
    });
    const data = await res.json();
    if (!res.ok) {
      showError(errEl, data.error || 'Failed to update email.');
      return;
    }
    // Update local user state
    currentUser = data.user;
    updateNavAuth();
    showToast('Email updated successfully.', 'success');
    document.getElementById('reset-current-password').value = '';
    document.getElementById('reset-new-email').value = '';
  } catch (e) {
    showError(errEl, 'Network error. Please try again.');
  }
}

/* ─── MOBILE MENU ────────────────────────────────────────────── */
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('open');
}

/* ─── HOTEL SEARCH ───────────────────────────────────────────── */
async function searchHotels() {
  const destination = document.getElementById('destination').value;
  const checkIn = document.getElementById('checkin-search').value;
  const checkOut = document.getElementById('checkout-search').value;
  const guests = document.getElementById('guests-search').value;

  if (!destination) {
    showToast('Please select a destination', 'error');
    document.getElementById('destination').focus();
    return;
  }

  // Store search context for booking modal pre-fill
  bookingSearchDates = { checkIn, checkOut, guests };

  const resultsSection = document.getElementById('results-section');
  const destsSection = document.getElementById('destinations-section');
  const grid = document.getElementById('hotels-grid');
  const title = document.getElementById('results-title');
  const countEl = document.getElementById('results-count');

  resultsSection.style.display = 'block';
  destsSection.style.display = 'none';
  grid.innerHTML = renderSkeletons(3);

  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res = await fetch(`/api/hotels?location=${encodeURIComponent(destination)}`);
    const data = await res.json();
    const hotels = data.hotels || [];

    title.textContent = `Hotels in ${destination}`;
    countEl.textContent = `${hotels.length} hotel${hotels.length !== 1 ? 's' : ''} found`;

    if (hotels.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🏨</div>
        <h3>No hotels found</h3>
        <p>We couldn't find any hotels in ${destination}. Try another destination.</p>
      </div>`;
    } else {
      grid.innerHTML = hotels.map(h => renderHotelCard(h)).join('');
    }
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <p>Something went wrong. Please try again.</p>
    </div>`;
  }
}

function quickSearch(destination) {
  document.getElementById('destination').value = destination;
  searchHotels();
}

function renderSkeletons(n) {
  return Array.from({ length: n }, () => `
    <div class="skeleton">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line medium"></div>
      </div>
    </div>
  `).join('');
}

function renderHotelCard(hotel) {
  const stars = renderStars(hotel.rating);
  const imgHtml = hotel.image_url
    ? `<img class="hotel-img" src="${escHtml(hotel.image_url)}" alt="${escHtml(hotel.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholderStyle = hotel.image_url ? 'display:none' : '';

  return `
    <div class="hotel-card">
      ${imgHtml}
      <div class="hotel-img-placeholder" style="${placeholderStyle}">🏨</div>
      <div class="hotel-body">
        <div class="hotel-rating">
          <span class="stars">${stars}</span>
          <span class="rating-num">${hotel.rating.toFixed(1)}</span>
        </div>
        <h3 class="hotel-name">${escHtml(hotel.name)}</h3>
        <p class="hotel-location">📍 ${escHtml(hotel.location)}</p>
        ${hotel.amenities ? `<p class="hotel-amenities">✓ ${escHtml(hotel.amenities)}</p>` : ''}
        <div class="hotel-footer">
          <div class="hotel-price">
            <span class="price-amount">$${hotel.price_per_night}</span>
            <span class="price-per">per night</span>
          </div>
          <button class="btn-book" onclick="openBookingModal(${JSON.stringify(hotel).replace(/"/g, '&quot;')})">Book Now</button>
        </div>
      </div>
    </div>
  `;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = '★'.repeat(full);
  if (half) s += '½';
  s += '☆'.repeat(5 - full - (half ? 1 : 0));
  return s;
}

/* ─── BOOKING MODAL ──────────────────────────────────────────── */
function openBookingModal(hotel) {
  if (!currentUser) {
    showPage('auth');
    switchAuthTab('login');
    showToast('Please log in to make a booking', 'error');
    return;
  }

  selectedHotel = hotel;
  document.getElementById('modal-hotel-name').textContent = hotel.name;
  document.getElementById('modal-hotel-location').textContent = `📍 ${hotel.location} · $${hotel.price_per_night}/night`;

  // Pre-fill with search dates if available
  if (bookingSearchDates.checkIn) document.getElementById('book-checkin').value = bookingSearchDates.checkIn;
  if (bookingSearchDates.checkOut) document.getElementById('book-checkout').value = bookingSearchDates.checkOut;
  if (bookingSearchDates.guests) document.getElementById('book-guests').value = bookingSearchDates.guests;

  // Pre-fill guest name from logged in user
  document.getElementById('book-guest-name').value = currentUser.name;

  clearErrors();
  showStep('booking');
  updateTotalPrice();

  document.getElementById('booking-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('booking-modal').style.display = 'none';
  document.body.style.overflow = '';
  selectedHotel = null;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('booking-modal')) closeModal();
}

function showStep(step) {
  document.getElementById('step-booking').style.display = step === 'booking' ? 'block' : 'none';
  document.getElementById('step-payment').style.display = step === 'payment' ? 'block' : 'none';
}

function updateTotalPrice() {
  const checkIn = document.getElementById('book-checkin').value;
  const checkOut = document.getElementById('book-checkout').value;
  const summary = document.getElementById('price-summary');

  if (!checkIn || !checkOut || !selectedHotel) {
    summary.style.display = 'none';
    return;
  }

  const nights = calcNights(checkIn, checkOut);
  if (nights <= 0) {
    summary.style.display = 'none';
    return;
  }

  const total = nights * selectedHotel.price_per_night;
  document.getElementById('price-nights-label').textContent = `${nights} night${nights > 1 ? 's' : ''} × $${selectedHotel.price_per_night}`;
  document.getElementById('price-nights-total').textContent = `$${total.toFixed(2)}`;
  document.getElementById('price-grand-total').textContent = `$${total.toFixed(2)}`;
  document.getElementById('pay-total').textContent = `$${total.toFixed(2)}`;
  summary.style.display = 'block';
}

function calcNights(checkIn, checkOut) {
  return Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000);
}

function proceedToPayment() {
  const guestName = document.getElementById('book-guest-name').value.trim();
  const checkIn = document.getElementById('book-checkin').value;
  const checkOut = document.getElementById('book-checkout').value;
  const errEl = document.getElementById('booking-error');

  if (!guestName) {
    showError(errEl, 'Please enter the guest name.');
    return;
  }
  if (!checkIn) {
    showError(errEl, 'Please select a check-in date.');
    return;
  }
  if (!checkOut) {
    showError(errEl, 'Please select a check-out date.');
    return;
  }
  if (new Date(checkOut) <= new Date(checkIn)) {
    showError(errEl, 'Check-out date must be after check-in date.');
    return;
  }

  hideError(errEl);
  showStep('payment');
  updateTotalPrice();
}

async function processPayment() {
  const cardName = document.getElementById('pay-name').value.trim();
  const cardNumber = document.getElementById('pay-card').value.replace(/\s/g, '');
  const expiry = document.getElementById('pay-expiry').value.trim();
  const cvv = document.getElementById('pay-cvv').value.trim();
  const errEl = document.getElementById('payment-error');
  const btn = document.getElementById('pay-btn');
  const btnText = document.getElementById('pay-btn-text');
  const spinner = document.getElementById('pay-spinner');

  if (!cardName || !cardNumber || !expiry || !cvv) {
    showError(errEl, 'Please fill in all payment details.');
    return;
  }
  if (expiry.length < 5 || !expiry.includes('/')) {
    showError(errEl, 'Please enter a valid expiry date (MM/YY).');
    return;
  }
  if (cvv.length < 3) {
    showError(errEl, 'Please enter a valid CVV.');
    return;
  }

  hideError(errEl);
  btn.disabled = true;
  btnText.textContent = 'Processing...';
  spinner.style.display = 'inline-block';

  // Simulate network delay
  await delay(1200);

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelId: selectedHotel.id,
        guestName: document.getElementById('book-guest-name').value.trim(),
        checkIn: document.getElementById('book-checkin').value,
        checkOut: document.getElementById('book-checkout').value,
        guests: document.getElementById('book-guests').value,
        cardNumber: cardNumber,
        cardName,
        expiry,
        cvv
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(errEl, data.error || 'Payment failed. Please try again.');
      btn.disabled = false;
      btnText.textContent = 'Pay Now';
      spinner.style.display = 'none';
      return;
    }

    closeModal();
    showConfirmation(data.booking);

  } catch (e) {
    showError(errEl, 'Network error. Please try again.');
    btn.disabled = false;
    btnText.textContent = 'Pay Now';
    spinner.style.display = 'none';
  }
}

/* ─── CONFIRMATION ───────────────────────────────────────────── */
function showConfirmation(booking) {
  const nights = calcNights(booking.check_in, booking.check_out);
  const receiptEl = document.getElementById('receipt-details');

  receiptEl.innerHTML = `
    <div class="receipt-row">
      <span class="label">Booking Reference</span>
      <span class="value receipt-ref">${escHtml(booking.booking_ref)}</span>
    </div>
    <div class="receipt-row">
      <span class="label">Hotel</span>
      <span class="value">${escHtml(booking.hotel_name)}</span>
    </div>
    <div class="receipt-row">
      <span class="label">Location</span>
      <span class="value">📍 ${escHtml(booking.hotel_location)}</span>
    </div>
    <div class="receipt-row">
      <span class="label">Guest</span>
      <span class="value">${escHtml(booking.guest_name)}</span>
    </div>
    <div class="receipt-row">
      <span class="label">Check-in</span>
      <span class="value">${formatDate(booking.check_in)}</span>
    </div>
    <div class="receipt-row">
      <span class="label">Check-out</span>
      <span class="value">${formatDate(booking.check_out)}</span>
    </div>
    <div class="receipt-row">
      <span class="label">Duration</span>
      <span class="value">${nights} night${nights > 1 ? 's' : ''}</span>
    </div>
    <div class="receipt-row">
      <span class="label">Guests</span>
      <span class="value">${booking.guests}</span>
    </div>
    <div class="receipt-row receipt-total">
      <span class="label">Total Paid</span>
      <span class="value">$${Number(booking.total_price).toFixed(2)}</span>
    </div>
  `;

  showPage('confirmation');
}

/* ─── MY BOOKINGS ────────────────────────────────────────────── */
async function loadMyBookings() {
  const listEl = document.getElementById('bookings-list');
  listEl.innerHTML = `<div class="loading-grid">${renderSkeletons(3)}</div>`;

  try {
    const res = await fetch('/api/bookings/my');
    const data = await res.json();

    if (!res.ok) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🔒</div>
        <h3>Please log in</h3>
        <p>You need to be logged in to view your bookings.</p>
        <button class="btn-primary" onclick="showPage('auth')">Login</button>
      </div>`;
      return;
    }

    const bookings = data.bookings || [];

    if (bookings.length === 0) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No bookings yet</h3>
        <p>You haven't made any bookings. Start exploring and book your dream stay!</p>
        <button class="btn-primary" onclick="showPage('home')">Explore Hotels</button>
      </div>`;
      return;
    }

    listEl.innerHTML = bookings.map(b => renderBookingItem(b)).join('');
  } catch (e) {
    listEl.innerHTML = `<p>Failed to load bookings. Please try again.</p>`;
  }
}

function renderBookingItem(b) {
  const nights = calcNights(b.check_in, b.check_out);
  const imgHtml = b.image_url
    ? `<img class="booking-item-img" src="${escHtml(b.image_url)}" alt="${escHtml(b.hotel_name)}" loading="lazy" onerror="this.style.background='#eee';this.src=''">`
    : `<div class="booking-item-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">🏨</div>`;

  return `
    <div class="booking-item">
      ${imgHtml}
      <div class="booking-item-info">
        <h3>${escHtml(b.hotel_name)}</h3>
        <p>📍 ${escHtml(b.hotel_location)}</p>
        <div class="booking-meta">
          <div class="booking-meta-item">
            <strong>Check-in</strong>
            ${formatDate(b.check_in)}
          </div>
          <div class="booking-meta-item">
            <strong>Check-out</strong>
            ${formatDate(b.check_out)}
          </div>
          <div class="booking-meta-item">
            <strong>Duration</strong>
            ${nights} night${nights > 1 ? 's' : ''}
          </div>
          <div class="booking-meta-item">
            <strong>Guests</strong>
            ${b.guests}
          </div>
          <div class="booking-meta-item">
            <strong>Total Paid</strong>
            $${Number(b.total_price).toFixed(2)}
          </div>
        </div>
        <p class="booking-ref">Ref: ${escHtml(b.booking_ref)}</p>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <span class="booking-badge">${b.status}</span>
      </div>
    </div>
  `;
}

/* ─── AUTH ───────────────────────────────────────────────────── */
function switchAuthTab(tab) {
  document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showError(errEl, data.error);
      return;
    }

    currentUser = data.user;
    updateNavAuth();
    showPage('home');
    showToast(`Welcome back, ${currentUser.name.split(' ')[0]}! 👋`, 'success');
  } catch (e) {
    showError(errEl, 'Login failed. Please try again.');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('register-error');

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showError(errEl, data.error);
      return;
    }

    currentUser = data.user;
    updateNavAuth();
    showPage('home');
    showToast(`Account created! Welcome, ${currentUser.name.split(' ')[0]}! 🎉`, 'success');
  } catch (e) {
    showError(errEl, 'Registration failed. Please try again.');
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  currentUser = null;
  updateNavAuth();
  showPage('home');
  showToast('You have been logged out.', 'success');
}

/* ─── PAYMENT HELPERS ────────────────────────────────────────── */
function formatCard(input) {
  let val = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = val.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, '').slice(0, 4);
  if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
  input.value = val;
}

/* ─── UTILITIES ──────────────────────────────────────────────── */
function showError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}
function hideError(el) { el.style.display = 'none'; }

function clearErrors() {
  document.querySelectorAll('.form-error').forEach(e => e.style.display = 'none');
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
