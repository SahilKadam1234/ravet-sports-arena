const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const inMemoryStore = require('../utils/inMemoryStore');

// Pricing constants
const PRICING = {
  full: 2000,
  half: 1000
};

const parseDateInput = (dateInput) => {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map((value) => Number.parseInt(value, 10));
    return new Date(year, month - 1, day);
  }
  return new Date(dateInput);
};

const getDayRange = (dateInput) => {
  const dayStart = parseDateInput(dateInput);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
};

const formatHourSlot = (hour) => `${hour.toString().padStart(2, '0')}:00`;
const isDbConnected = () => mongoose.connection.readyState === 1;

// Create a new booking
router.post('/', async (req, res) => {
  try {
    const { fullName, phoneNumber, email, groundType, date, timeSlot, hours, photoUrl, paymentMethod } = req.body;
    const bookingHours = Number.parseInt(hours, 10);
    const startHour = Number.parseInt(String(timeSlot || '').split(':')[0], 10);

    if (!fullName || !phoneNumber || !email || !groundType || !date || !timeSlot || !bookingHours || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking fields'
      });
    }

    if (!['full', 'half'].includes(groundType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ground type'
      });
    }

    if (Number.isNaN(startHour) || startHour < 6 || startHour > 23) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start time slot'
      });
    }

    if (bookingHours < 1 || startHour + bookingHours - 1 > 23) {
      return res.status(400).json({
        success: false,
        message: 'Selected hours overflow available slot timing (06:00-23:00)'
      });
    }

    const { dayStart, dayEnd } = getDayRange(date);
    const requestedSlots = [];
    for (let i = 0; i < bookingHours; i++) {
      requestedSlots.push(formatHourSlot(startHour + i));
    }

    const existingSlots = isDbConnected()
      ? await Slot.find({
          date: { $gte: dayStart, $lt: dayEnd },
          timeSlot: { $in: requestedSlots },
          groundType: { $in: ['full', 'half1', 'half2'] }
        })
      : inMemoryStore
          .getSlotsByDate(dayStart)
          .filter((slot) => requestedSlots.includes(slot.timeSlot));

    const slotMap = new Map();
    existingSlots.forEach((slot) => {
      const key = slot.timeSlot;
      const list = slotMap.get(key) || [];
      list.push(slot);
      slotMap.set(key, list);
    });

    if (groundType === 'full') {
      const unavailableSlots = requestedSlots.filter((slotTime) => {
        const slotList = slotMap.get(slotTime) || [];
        return slotList.some((s) => s.groundType === 'full' && s.isBooked);
      });

      if (unavailableSlots.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'One or more selected slots are already booked',
          unavailableSlots
        });
      }
    } else {
      const unavailableSlots = requestedSlots.filter((slotTime) => {
        const slotList = slotMap.get(slotTime) || [];
        const half1Booked = slotList.some((s) => s.groundType === 'half1' && s.isBooked);
        const half2Booked = slotList.some((s) => s.groundType === 'half2' && s.isBooked);
        return half1Booked && half2Booked;
      });

      if (unavailableSlots.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'No half ground slots available for selected time',
          unavailableSlots
        });
      }
    }

    // Calculate total price
    const pricePerHour = groundType === 'full' ? PRICING.full : PRICING.half;
    const totalPrice = pricePerHour * bookingHours;

    // Create booking
    const bookingPayload = {
      fullName,
      phoneNumber,
      email,
      groundType,
      date: dayStart,
      timeSlot,
      hours: bookingHours,
      photoUrl,
      paymentMethod,
      totalPrice
    };

    const booking = isDbConnected()
      ? await new Booking(bookingPayload).save()
      : inMemoryStore.createBooking(bookingPayload);

    // Mark slots as booked
    if (groundType === 'full') {
      // Book full ground
      for (const slotTime of requestedSlots) {
        if (isDbConnected()) {
          await Slot.findOneAndUpdate(
            { date: dayStart, timeSlot: slotTime, groundType: 'full' },
            { $set: { isBooked: true, bookingId: booking._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } else {
          inMemoryStore.upsertSlot(dayStart, slotTime, 'full', {
            isBooked: true,
            bookingId: booking._id
          });
        }
      }
    } else {
      // Book half ground (can be half1 or half2)
      for (const slotTime of requestedSlots) {
        const slotList = slotMap.get(slotTime) || [];
        const half1 = slotList.find((s) => s.groundType === 'half1');
        const targetGround = !half1 || !half1.isBooked ? 'half1' : 'half2';

        if (isDbConnected()) {
          await Slot.findOneAndUpdate(
            { date: dayStart, timeSlot: slotTime, groundType: targetGround },
            { $set: { isBooked: true, bookingId: booking._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } else {
          inMemoryStore.upsertSlot(dayStart, slotTime, targetGround, {
            isBooked: true,
            bookingId: booking._id
          });
        }

        const updatedList = slotMap.get(slotTime) || [];
        const existing = updatedList.find((s) => s.groundType === targetGround);
        if (existing) {
          existing.isBooked = true;
          existing.bookingId = booking._id;
        } else {
          updatedList.push({ groundType: targetGround, isBooked: true, bookingId: booking._id });
          slotMap.set(slotTime, updatedList);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully!',
      booking
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
});

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const bookings = isDbConnected()
      ? await Booking.find().sort({ createdAt: -1 })
      : inMemoryStore.getBookings();
    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
});

// Get single booking
router.get('/:id', async (req, res) => {
  try {
    const booking = isDbConnected()
      ? await Booking.findById(req.params.id)
      : inMemoryStore.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    res.json({
      success: true,
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    });
  }
});

// Update booking status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = isDbConnected()
      ? await Booking.findByIdAndUpdate(
          req.params.id,
          { status },
          { new: true }
        )
      : inMemoryStore.updateBookingById(req.params.id, { status });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    res.json({
      success: true,
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating booking',
      error: error.message
    });
  }
});

// Delete/cancel booking
router.delete('/:id', async (req, res) => {
  try {
    const booking = isDbConnected()
      ? await Booking.findByIdAndUpdate(
          req.params.id,
          { status: 'cancelled' },
          { new: true }
        )
      : inMemoryStore.cancelBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Free up the slots
    if (isDbConnected()) {
      await Slot.updateMany(
        { bookingId: booking._id },
        { isBooked: false, bookingId: null }
      );
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
});

module.exports = router;
