const mongoose = require('mongoose');

// Generate a random 4-character alphanumeric shortCode
const generateShortCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0,O,1,I,L
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const tournamentSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true
  },
  leagueName: {
    type: String,
    default: "Independent",
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
  firstWinner: {
    type: String,
    default: ""
  },
  firstTime: {
    type: String,
    default: ""
  },
  lastWinner: {
    type: String,
    default: ""
  },
  lastTime: {
    type: String,
    default: ""
  },
  dailyWinners: [{
    date: Date,
    firstWinner: String,
    firstTime: String,
    lastWinner: String,
    lastTime: String
  }],
  status: {
    type: String,
    enum: ['Active', 'Paused', 'Upcoming', 'Completed'],
    default: 'Active'
  },
  showOnHome: {
    type: Boolean,
    default: true
  },
  headline: {
    type: String,
    default: ""
  },
  participants: [{
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
    name: { type: String, required: true },
    image: { type: String },
    address: { type: String },
    phone: { type: String },
    pigeonTimes: [{ type: String }],
    startTime: { type: String },
    dailyStartTimes: [{ type: String }],
    totalTime: { type: String, default: "00:00:00" }
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

// Pre-save hook to generate unique shortCode
tournamentSchema.pre('save', async function() {
  if (!this.shortCode) {
    let code = generateShortCode();
    let attempts = 0;
    
    // Ensure uniqueness
    while (attempts < 10) {
      const existing = await mongoose.model('Tournament').findOne({ shortCode: code });
      if (!existing) break;
      code = generateShortCode();
      attempts++;
    }
    
    this.shortCode = code;
  }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
