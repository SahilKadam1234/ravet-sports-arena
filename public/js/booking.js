const PRICING = {
  full: 2000,
  half: 1000
};

const MAX_ADVANCE_DAYS = 90;
const MAX_SLOTS_PER_BOOKING = 6;

const bookingForm = document.getElementById('booking-form');
const dateInput = document.getElementById('bookingDate');
const paymentMethodInput = document.getElementById('paymentMethod');
const timeSlotsContainer = document.getElementById('time-slots');
const slotStatusGrid = document.getElementById('slot-status-grid');
const totalPriceLabel = document.getElementById('total-price');
const selectedSlotLabel = document.getElementById('selected-slot-text');
const selectedHoursLabel = document.getElementById('selected-hours-text');
const bookingMessage = document.getElementById('booking-message');
const submitButton = document.getElementById('submit-booking');

let slots = [];
let selectedSlots = [];

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseHour(slotTime) {
  return Number.parseInt(String(slotTime).split(':')[0], 10);
}

function getSelectedGroundType() {
  const checked = document.querySelector('input[name="groundType"]:checked');
  return checked ? checked.value : 'full';
}

function getSlotAvailability(slot, groundType) {
  if (groundType === 'full') {
    return !slot.full.booked;
  }
  return !(slot.half1.booked && slot.half2.booked);
}

function sortSlotTimes(times) {
  return [...times].sort((a, b) => parseHour(a) - parseHour(b));
}

function areSlotsContinuous(times) {
  if (times.length <= 1) {
    return true;
  }
  const sorted = sortSlotTimes(times);
  for (let i = 1; i < sorted.length; i++) {
    if (parseHour(sorted[i]) - parseHour(sorted[i - 1]) !== 1) {
      return false;
    }
  }
  return true;
}

function isSlotAvailableByTime(time) {
  const groundType = getSelectedGroundType();
  const slot = slots.find((item) => item.time === time);
  return slot ? getSlotAvailability(slot, groundType) : false;
}

function showMessage(type, text) {
  if (!text) {
    bookingMessage.innerHTML = '';
    return;
  }

  if (type === 'success') {
    bookingMessage.innerHTML = `<div class="success-message"><h3>Success</h3><p>${text}</p></div>`;
    return;
  }

  bookingMessage.innerHTML = `<div class="error-message"><h3>Booking Failed</h3><p>${text}</p></div>`;
}

function updatePriceDisplay() {
  const groundType = getSelectedGroundType();
  const selectedCount = selectedSlots.length;
  const total = PRICING[groundType] * selectedCount;

  totalPriceLabel.textContent = `Rs. ${total}`;

  if (selectedCount === 0) {
    selectedSlotLabel.textContent = 'No slot selected';
    selectedHoursLabel.textContent = 'Selected duration: 0 hour';
    return;
  }

  selectedSlotLabel.textContent = `Selected slots: ${selectedSlots.join(', ')}`;
  selectedHoursLabel.textContent = `Selected duration: ${selectedCount} hour`;
}

function renderTimeSlots() {
  const groundType = getSelectedGroundType();

  if (slots.length === 0) {
    timeSlotsContainer.innerHTML = '<p>No slots available.</p>';
    return;
  }

  const html = slots
    .map((slot) => {
      const isAvailable = getSlotAvailability(slot, groundType);
      const isSelected = selectedSlots.includes(slot.time);
      const stateClass = isAvailable
        ? isSelected
          ? 'time-slot selected'
          : 'time-slot'
        : 'time-slot booked';
      const stateLabel = isAvailable ? 'Unbooked' : 'Booked';
      return `<button type="button" class="${stateClass}" data-time="${slot.time}" ${isAvailable ? '' : 'disabled'}>${slot.time}<br><small>${stateLabel}</small></button>`;
    })
    .join('');

  timeSlotsContainer.innerHTML = html;

  timeSlotsContainer.querySelectorAll('button[data-time]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleSlotSelection(button.getAttribute('data-time'));
    });
  });
}

function renderSlotStatusGrid() {
  const groundType = getSelectedGroundType();

  if (slots.length === 0) {
    slotStatusGrid.innerHTML = '';
    return;
  }

  slotStatusGrid.innerHTML = slots
    .map((slot) => {
      const available = getSlotAvailability(slot, groundType);
      const itemClass = available ? 'slot-item available' : 'slot-item booked';
      const label = available ? 'Unbooked' : 'Booked';
      return `<div class="${itemClass}">${slot.time}<br>${label}</div>`;
    })
    .join('');
}

function toggleSlotSelection(time) {
  if (!isSlotAvailableByTime(time)) {
    return;
  }

  const existingIndex = selectedSlots.indexOf(time);

  if (existingIndex >= 0) {
    const isMiddle = existingIndex > 0 && existingIndex < selectedSlots.length - 1;
    if (isMiddle) {
      showMessage('error', 'Remove edge slots first to keep selection continuous.');
      return;
    }
    selectedSlots.splice(existingIndex, 1);
    selectedSlots = sortSlotTimes(selectedSlots);
    showMessage(null, '');
    updatePriceDisplay();
    renderTimeSlots();
    return;
  }

  const candidate = sortSlotTimes([...selectedSlots, time]);

  if (candidate.length > MAX_SLOTS_PER_BOOKING) {
    showMessage('error', `You can select up to ${MAX_SLOTS_PER_BOOKING} slots in one booking.`);
    return;
  }

  if (!areSlotsContinuous(candidate)) {
    showMessage('error', 'Please select only continuous slots (example: 18:00, 19:00, 20:00).');
    return;
  }

  selectedSlots = candidate;
  showMessage(null, '');
  updatePriceDisplay();
  renderTimeSlots();
}

async function loadSlots() {
  const date = dateInput.value;
  if (!date) {
    return;
  }

  showMessage(null, '');

  try {
    await fetch(`/api/slots/init/${date}`, { method: 'POST' });
    const response = await fetch(`/api/slots/${date}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to load slot availability');
    }

    slots = data.slots || [];
    selectedSlots = selectedSlots
      .filter((time) => slots.some((slot) => slot.time === time && isSlotAvailableByTime(slot.time)))
      .slice(0, MAX_SLOTS_PER_BOOKING);

    if (!areSlotsContinuous(selectedSlots)) {
      selectedSlots = [];
    }

    renderTimeSlots();
    renderSlotStatusGrid();
    updatePriceDisplay();
  } catch (error) {
    slots = [];
    selectedSlots = [];
    renderTimeSlots();
    renderSlotStatusGrid();
    updatePriceDisplay();
    showMessage('error', error.message);
  }
}

function validateDateWindow() {
  const selectedDate = new Date(dateInput.value);
  selectedDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_DAYS);

  return selectedDate >= today && selectedDate <= maxDate;
}

async function submitBooking(event) {
  event.preventDefault();

  if (!validateDateWindow()) {
    showMessage('error', `Please select a date within ${MAX_ADVANCE_DAYS} days from today.`);
    return;
  }

  if (selectedSlots.length === 0) {
    showMessage('error', 'Please select at least one slot.');
    return;
  }

  if (!areSlotsContinuous(selectedSlots)) {
    showMessage('error', 'Selected slots must be continuous.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Booking...';
  showMessage(null, '');

  try {
    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      phoneNumber: document.getElementById('phoneNumber').value.trim(),
      email: document.getElementById('email').value.trim(),
      groundType: getSelectedGroundType(),
      date: dateInput.value,
      timeSlot: selectedSlots[0],
      hours: selectedSlots.length,
      selectedSlots,
      paymentMethod: paymentMethodInput.value,
      photoUrl: null
    };

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      let errorMessage = data.message || 'Unable to complete booking.';
      if (Array.isArray(data.unavailableSlots) && data.unavailableSlots.length > 0) {
        errorMessage += ` Unavailable: ${data.unavailableSlots.join(', ')}`;
      }
      throw new Error(errorMessage);
    }

    showMessage('success', `Booking confirmed for slots: ${selectedSlots.join(', ')}. Status has been refreshed below.`);
    selectedSlots = [];
    await loadSlots();
  } catch (error) {
    showMessage('error', error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Confirm Booking';
  }
}

function onBookingConfigChange() {
  selectedSlots = [];
  updatePriceDisplay();
  renderTimeSlots();
  renderSlotStatusGrid();
}

function initBookingPage() {
  const today = new Date();
  const minDate = formatDateForInput(today);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_DAYS);

  dateInput.min = minDate;
  dateInput.max = formatDateForInput(maxDate);
  dateInput.value = minDate;

  bookingForm.addEventListener('submit', submitBooking);
  dateInput.addEventListener('change', () => {
    selectedSlots = [];
    loadSlots();
  });

  document.querySelectorAll('input[name="groundType"]').forEach((radio) => {
    radio.addEventListener('change', onBookingConfigChange);
  });

  updatePriceDisplay();
  loadSlots();
}

initBookingPage();
