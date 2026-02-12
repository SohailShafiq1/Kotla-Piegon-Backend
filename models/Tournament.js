const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true
  },
  posters: [{
    type: String // URLs to images
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  numDays: {
    type: Number,
    min: 1,
    max: 12,
    default: 1
  },
  flyingDates: [{
    type: Date
  }],
  numPigeons: {
    type: Number,
    default: 0
  },
  noteTimePigeons: {
    type: Number,
    default: 0
  },
  helperPigeons: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Paused', 'Upcoming', 'Completed'],
    default: 'Upcoming'
  },
  showOnHome: {
    type: Boolean,
    default: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
