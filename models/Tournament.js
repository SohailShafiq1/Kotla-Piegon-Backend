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
  startTime: {
    type: String,
    default: "06:00"
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
    default: 0,
    validate: {
      validator: function(v) {
        return v <= this.numPigeons;
      },
      message: 'Note time pigeons cannot exceed the number of flying pigeons'
    }
  },
  helperPigeons: {
    type: Number,
    default: 0
  },
  totalPigeons: {
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
  participants: [{
    name: { type: String, required: true },
    image: { type: String },
    address: { type: String },
    phone: { type: String }
  }],
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
