const fs = require('fs');
const path = require('path');

const slots = new Map();
const bookings = new Map();
let slotCounter = 1;
let bookingCounter = 1;
const STORE_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(STORE_DIR, 'inMemoryStore.json');

const parseDateInput = (dateInput) => {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map((value) => Number.parseInt(value, 10));
    return new Date(year, month - 1, day);
  }
  return new Date(dateInput);
};

const normalizeDate = (dateInput) => {
  const date = parseDateInput(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateKey = (dateInput) => {
  const date = normalizeDate(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const makeSlotKey = (dateKey, timeSlot, groundType) => `${dateKey}|${timeSlot}|${groundType}`;

const cloneSlot = (slot) => ({
  ...slot,
  date: new Date(slot.date)
});

const cloneBooking = (booking) => ({
  ...booking,
  date: new Date(booking.date),
  createdAt: new Date(booking.createdAt)
});

const toSerializableSlot = (slot) => ({
  ...slot,
  date: new Date(slot.date).toISOString()
});

const toSerializableBooking = (booking) => ({
  ...booking,
  date: new Date(booking.date).toISOString(),
  createdAt: new Date(booking.createdAt).toISOString()
});

const persistStore = () => {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    const payload = {
      slotCounter,
      bookingCounter,
      slots: Array.from(slots.values()).map(toSerializableSlot),
      bookings: Array.from(bookings.values()).map(toSerializableBooking)
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (error) {
    console.error('In-memory store persist error:', error.message);
  }
};

const loadStore = () => {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return;
    }

    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    if (!raw.trim()) {
      return;
    }

    const parsed = JSON.parse(raw);
    slotCounter = Number.isInteger(parsed.slotCounter) ? parsed.slotCounter : 1;
    bookingCounter = Number.isInteger(parsed.bookingCounter) ? parsed.bookingCounter : 1;

    slots.clear();
    bookings.clear();

    const storedSlots = Array.isArray(parsed.slots) ? parsed.slots : [];
    const storedBookings = Array.isArray(parsed.bookings) ? parsed.bookings : [];

    storedSlots.forEach((slot) => {
      if (!slot || !slot.dateKey || !slot.timeSlot || !slot.groundType) {
        return;
      }
      const key = makeSlotKey(slot.dateKey, slot.timeSlot, slot.groundType);
      slots.set(key, {
        ...slot,
        date: normalizeDate(slot.date)
      });
    });

    storedBookings.forEach((booking) => {
      if (!booking || !booking._id) {
        return;
      }
      bookings.set(String(booking._id), {
        ...booking,
        date: normalizeDate(booking.date),
        createdAt: new Date(booking.createdAt)
      });
    });
  } catch (error) {
    console.error('In-memory store load error:', error.message);
  }
};

const initSlotsForDate = (dateInput) => {
  const date = normalizeDate(dateInput);
  const dateKey = toDateKey(date);
  let changed = false;

  for (let hour = 6; hour <= 23; hour++) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    ['full', 'half1', 'half2'].forEach((groundType) => {
      const key = makeSlotKey(dateKey, timeSlot, groundType);
      if (!slots.has(key)) {
        slots.set(key, {
          _id: `mem-slot-${slotCounter++}`,
          date,
          dateKey,
          timeSlot,
          groundType,
          isBooked: false,
          bookingId: null
        });
        changed = true;
      }
    });
  }

  if (changed) {
    persistStore();
  }
};

const getSlotsByDate = (dateInput) => {
  const dateKey = toDateKey(dateInput);
  return Array.from(slots.values())
    .filter((slot) => slot.dateKey === dateKey)
    .map(cloneSlot);
};

const upsertSlot = (dateInput, timeSlot, groundType, updates = {}) => {
  const date = normalizeDate(dateInput);
  const dateKey = toDateKey(date);
  const key = makeSlotKey(dateKey, timeSlot, groundType);
  const existing = slots.get(key);

  if (!existing) {
    slots.set(key, {
      _id: `mem-slot-${slotCounter++}`,
      date,
      dateKey,
      timeSlot,
      groundType,
      isBooked: false,
      bookingId: null,
      ...updates
    });
    persistStore();
    return cloneSlot(slots.get(key));
  }

  Object.assign(existing, updates);
  slots.set(key, existing);
  persistStore();
  return cloneSlot(existing);
};

const updateSlotById = (id, updates = {}) => {
  for (const [key, slot] of slots.entries()) {
    if (String(slot._id) === String(id)) {
      const next = { ...slot, ...updates };
      slots.set(key, next);
      persistStore();
      return cloneSlot(next);
    }
  }
  return null;
};

const createBooking = (payload) => {
  const booking = {
    _id: `mem-booking-${bookingCounter++}`,
    ...payload,
    status: payload.status || 'confirmed',
    createdAt: new Date()
  };
  bookings.set(String(booking._id), booking);
  persistStore();
  return cloneBooking(booking);
};

const getBookings = () => {
  return Array.from(bookings.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(cloneBooking);
};

const getBookingById = (id) => {
  const booking = bookings.get(String(id));
  return booking ? cloneBooking(booking) : null;
};

const updateBookingById = (id, updates = {}) => {
  const booking = bookings.get(String(id));
  if (!booking) {
    return null;
  }
  const next = { ...booking, ...updates };
  bookings.set(String(id), next);
  persistStore();
  return cloneBooking(next);
};

const cancelBookingById = (id) => {
  const booking = bookings.get(String(id));
  if (!booking) {
    return null;
  }
  booking.status = 'cancelled';
  bookings.set(String(id), booking);

  for (const [key, slot] of slots.entries()) {
    if (String(slot.bookingId) === String(id)) {
      slots.set(key, {
        ...slot,
        isBooked: false,
        bookingId: null
      });
    }
  }

  persistStore();
  return cloneBooking(booking);
};

loadStore();

module.exports = {
  normalizeDate,
  initSlotsForDate,
  getSlotsByDate,
  upsertSlot,
  updateSlotById,
  createBooking,
  getBookings,
  getBookingById,
  updateBookingById,
  cancelBookingById
};
