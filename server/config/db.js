const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // For production, use environment variable for MongoDB URI
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/elitefootballarena';
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected Successfully!');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    // For demo purposes, continue without database
    console.log('Continuing without database connection...');
  }
};

module.exports = connectDB;
