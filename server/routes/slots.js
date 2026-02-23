const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Slot = require('../models/Slot');
const inMemoryStore = require('../utils/inMemoryStore');

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

const isDbConnected = () => mongoose.connection.readyState === 1;

// Get slots for a specific date
router.get('/:date', async (req, res) => {
  try {
    const { dayStart, dayEnd } = getDayRange(req.params.date);
    const slots = isDbConnected()
      ? await Slot.find({
          date: { $gte: dayStart, $lt: dayEnd }
        })
      : inMemoryStore.getSlotsByDate(dayStart);
    
    // Generate time slots from 6 AM to 11 PM
    const timeSlots = [];
    for (let hour = 6; hour <= 23; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    // Combine available and booked slots
    const result = timeSlots.map(time => {
      const fullSlot = slots.find(s => s.groundType === 'full' && s.timeSlot === time);
      const half1Slot = slots.find(s => s.groundType === 'half1' && s.timeSlot === time);
      const half2Slot = slots.find(s => s.groundType === 'half2' && s.timeSlot === time);
      
      return {
        time,
        full: {
          booked: fullSlot?.isBooked || false,
          bookingId: fullSlot?.bookingId
        },
        half1: {
          booked: half1Slot?.isBooked || false,
          bookingId: half1Slot?.bookingId
        },
        half2: {
          booked: half2Slot?.isBooked || false,
          bookingId: half2Slot?.bookingId
        }
      };
    });
    
    res.json({
      success: true,
      date: req.params.date,
      slots: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching slots',
      error: error.message
    });
  }
});

// Initialize slots for a date
router.post('/init/:date', async (req, res) => {
  try {
    const { dayStart } = getDayRange(req.params.date);

    if (!isDbConnected()) {
      inMemoryStore.initSlotsForDate(dayStart);
      return res.json({
        success: true,
        message: 'Slots initialized successfully (in-memory)'
      });
    }
    
    // Create slots for 6 AM to 11 PM for all ground types
    const slotsToCreate = [];
    for (let hour = 6; hour <= 23; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      slotsToCreate.push(
        { date: dayStart, timeSlot, groundType: 'full', isBooked: false },
        { date: dayStart, timeSlot, groundType: 'half1', isBooked: false },
        { date: dayStart, timeSlot, groundType: 'half2', isBooked: false }
      );
    }
    
    await Slot.insertMany(slotsToCreate, { ordered: false });
    
    res.json({
      success: true,
      message: 'Slots initialized successfully'
    });
  } catch (error) {
    // Slots might already exist
    if (error.code === 11000) {
      return res.json({
        success: true,
        message: 'Slots already exist for this date'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error initializing slots',
      error: error.message
    });
  }
});

// Update slot (book/release)
router.put('/:id', async (req, res) => {
  try {
    const { isBooked, bookingId } = req.body;
    const slot = isDbConnected()
      ? await Slot.findByIdAndUpdate(
          req.params.id,
          { isBooked, bookingId },
          { new: true }
        )
      : inMemoryStore.updateSlotById(req.params.id, { isBooked, bookingId });
    
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Slot updated successfully',
      slot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating slot',
      error: error.message
    });
  }
});

module.exports = router;
