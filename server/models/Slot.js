const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  groundType: {
    type: String,
    enum: ['full', 'half1', 'half2'],
    required: true
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate bookings
slotSchema.index({ date: 1, timeSlot: 1, groundType: 1 }, { unique: true });

module.exports = mongoose.model('Slot', slotSchema);
