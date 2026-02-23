const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Contact = require('../models/Contact');
const Slot = require('../models/Slot');

// Admin credentials (in production, use environment variables and proper hashing)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'elitefootball2024'
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      res.json({
        success: true,
        message: 'Login successful',
        token: 'admin-token-' + Date.now()
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
});

// Get booking statistics
router.get('/stats', async (req, res) => {
  try {
    // Total bookings
    const totalBookings = await Booking.countDocuments({ status: 'confirmed' });
    
    // Weekend bookings
    const weekendBookings = await Booking.countDocuments({ isWeekend: true, status: 'confirmed' });
    
    // Weekday bookings
    const weekdayBookings = await Booking.countDocuments({ isWeekend: false, status: 'confirmed' });
    
    // Full ground bookings
    const fullGroundBookings = await Booking.countDocuments({ groundType: 'full', status: 'confirmed' });
    
    // Half ground bookings
    const halfGroundBookings = await Booking.countDocuments({ groundType: 'half', status: 'confirmed' });
    
    // Total slots (17 hours * 3 grounds * 365 days = 18615)
    const totalSlots = 17 * 3 * 365;
    
    // Booked slots
    const bookedSlots = await Slot.countDocuments({ isBooked: true });
    
    // Remaining slots
    const remainingSlots = totalSlots - bookedSlots;
    
    // Contact stats
    const totalContacts = await Contact.countDocuments();
    const emails = await Contact.distinct('email');
    const phones = await Contact.distinct('phone');

    res.json({
      success: true,
      stats: {
        totalBookings,
        weekendBookings,
        weekdayBookings,
        totalFullGroundBookings: fullGroundBookings,
        totalHalfGroundBookings: halfGroundBookings,
        totalAvailableSlots: totalSlots,
        totalBookedSlots: bookedSlots,
        remainingSlots,
        totalContactSubmissions: totalContacts,
        totalEmails: emails.length,
        totalPhones: phones.length,
        emailList: emails,
        phoneList: phones
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Get revenue data
router.get('/revenue', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Today's revenue
    const todayRevenue = await Booking.aggregate([
      { 
        $match: { 
          status: 'confirmed',
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    // Weekly revenue
    const weeklyRevenue = await Booking.aggregate([
      { 
        $match: { 
          status: 'confirmed',
          createdAt: { $gte: weekStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    // Monthly revenue
    const monthlyRevenue = await Booking.aggregate([
      { 
        $match: { 
          status: 'confirmed',
          createdAt: { $gte: monthStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    // Weekend revenue only
    const weekendRevenue = await Booking.aggregate([
      { 
        $match: { 
          status: 'confirmed',
          isWeekend: true
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    // Full ground revenue
    const fullGroundRevenue = await Booking.aggregate([
      { 
        $match: { 
          status: 'confirmed',
          groundType: 'full'
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    // Half ground revenue
    const halfGroundRevenue = await Booking.aggregate([
      { 
        $match: { 
          status: 'confirmed',
          groundType: 'half'
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    // Total revenue
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    res.json({
      success: true,
      revenue: {
        today: todayRevenue[0]?.total || 0,
        weekly: weeklyRevenue[0]?.total || 0,
        monthly: monthlyRevenue[0]?.total || 0,
        weekendOnly: weekendRevenue[0]?.total || 0,
        fullGround: fullGroundRevenue[0]?.total || 0,
        halfGround: halfGroundRevenue[0]?.total || 0,
        total: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue data',
      error: error.message
    });
  }
});

module.exports = router;
