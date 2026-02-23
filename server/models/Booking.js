const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  groundType: {
    type: String,
    enum: ['full', 'half'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  hours: {
    type: Number,
    required: true,
    default: 1
  },
  photoUrl: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'upi'],
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'pending'],
    default: 'confirmed'
  },
  isWeekend: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate isWeekend before saving
bookingSchema.pre('save', function(next) {
  const day = this.date.getDay();
  this.isWeekend = (day === 0 || day === 6); // Sunday = 0, Saturday = 6
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
