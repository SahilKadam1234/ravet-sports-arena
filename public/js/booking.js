const PRICING = {
  full: 2000,
  half: 1000
};

const bookingForm = document.getElementById('booking-form');
const dateInput = document.getElementById('bookingDate');
const hoursInput = document.getElementById('hours');
const paymentMethodInput = document.getElementById('paymentMethod');
const timeSlotsContainer = document.getElementById('time-slots');
const slotStatusGrid = document.getElementById('slot-status-grid');
const totalPriceLabel = document.getElementById('total-price');
const selectedSlotLabel = document.getElementById('selected-slot-text');
const bookingMessage = document.getElementById('booking-message');
const submitButton = document.getElementById('submit-booking');

let slots = [];
let selectedTimeSlot = null;

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSelectedGroundType() {
  const checked = document.querySelector('input[name="groundType"]:checked');
  return checked ? checked.value : 'full';
}

function parseHour(slotTime) {
  return Number.parseInt(String(slotTime).split(':')[0], 10);
}

function getSlotAvailability(slot, groundType) {
  if (groundType === 'full') {
    return !slot.full.booked;
  }
  return !(slot.half1.booked && slot.half2.booked);
}

function canStartFromIndex(startIndex) {
  const hours = Number.parseInt(hoursInput.value, 10);
  const groundType = getSelectedGroundType();

  if (!Number.isInteger(hours) || hours < 1) {
    return false;
  }

  if (startIndex + hours > slots.length) {
    return false;
  }

  for (let i = 0; i < hours; i++) {
    const slot = slots[startIndex + i];
    if (!getSlotAvailability(slot, groundType)) {
      return false;
    }
  }

  return true;
}

function updatePriceDisplay() {
  const hours = Number.parseInt(hoursInput.value, 10) || 1;
  const groundType = getSelectedGroundType();
  const total = PRICING[groundType] * hours;
  totalPriceLabel.textContent = `Rs. ${total}`;

  if (selectedTimeSlot) {
    selectedSlotLabel.textContent = `Selected start slot: ${selectedTimeSlot} (${hours} hour)`;
  } else {
    selectedSlotLabel.textContent = 'No slot selected';
  }
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

function renderTimeSlots() {
  const groundType = getSelectedGroundType();
  const hours = Number.parseInt(hoursInput.value, 10) || 1;

  if (slots.length === 0) {
    timeSlotsContainer.innerHTML = '<p>No slots available.</p>';
    return;
  }

  const html = slots.map((slot, index) => {
    const isStartAvailable = canStartFromIndex(index);
    const isSelected = selectedTimeSlot === slot.time;
    const stateClass = isStartAvailable ? (isSelected ? 'time-slot selected' : 'time-slot') : 'time-slot booked';
    const stateLabel = isStartAvailable ? 'Unbooked' : 'Booked';

    return `<button type="button" class="${stateClass}" data-time="${slot.time}" ${isStartAvailable ? '' : 'disabled'}>${slot.time}<br><small>${stateLabel}</small></button>`;
  }).join('');

  timeSlotsContainer.innerHTML = html;

  timeSlotsContainer.querySelectorAll('button[data-time]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedTimeSlot = button.getAttribute('data-time');
      updatePriceDisplay();
      renderTimeSlots();
      renderSlotStatusGrid();
    });
  });

  if (selectedTimeSlot) {
    const selectedHour = parseHour(selectedTimeSlot);
    const startIndex = slots.findIndex((slot) => parseHour(slot.time) === selectedHour);
    if (startIndex < 0 || !canStartFromIndex(startIndex)) {
      selectedTimeSlot = null;
      updatePriceDisplay();
    }
  }
}

function renderSlotStatusGrid() {
  const groundType = getSelectedGroundType();

  if (slots.length === 0) {
    slotStatusGrid.innerHTML = '';
    return;
  }

  slotStatusGrid.innerHTML = slots.map((slot) => {
    const available = getSlotAvailability(slot, groundType);
    const itemClass = available ? 'slot-item available' : 'slot-item booked';
    const label = available ? 'Unbooked' : 'Booked';
    return `<div class="${itemClass}">${slot.time}<br>${label}</div>`;
  }).join('');
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
    renderTimeSlots();
    renderSlotStatusGrid();
    updatePriceDisplay();
  } catch (error) {
    slots = [];
    renderTimeSlots();
    renderSlotStatusGrid();
    showMessage('error', error.message);
  }
}

async function submitBooking(event) {
  event.preventDefault();

  if (!selectedTimeSlot) {
    showMessage('error', 'Please select a start time slot first.');
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
      timeSlot: selectedTimeSlot,
      hours: Number.parseInt(hoursInput.value, 10),
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

    showMessage('success', `Booking confirmed for ${selectedTimeSlot}. Status has been refreshed below.`);
    selectedTimeSlot = null;
    await loadSlots();
  } catch (error) {
    showMessage('error', error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Confirm Booking';
  }
}

function onBookingConfigChange() {
  selectedTimeSlot = null;
  updatePriceDisplay();
  renderTimeSlots();
  renderSlotStatusGrid();
}

function initBookingPage() {
  const today = new Date();
  const formatted = formatDateForInput(today);
  dateInput.min = formatted;
  dateInput.value = formatted;

  bookingForm.addEventListener('submit', submitBooking);
  dateInput.addEventListener('change', () => {
    selectedTimeSlot = null;
    loadSlots();
  });
  hoursInput.addEventListener('change', onBookingConfigChange);

  document.querySelectorAll('input[name="groundType"]').forEach((radio) => {
    radio.addEventListener('change', onBookingConfigChange);
  });

  updatePriceDisplay();
  loadSlots();
}

initBookingPage();
