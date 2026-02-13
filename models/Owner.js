const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true,
    unique: true
  },
  image: {
    type: String // Base64 or URL
  },
  address: {
    type: String
  },
  phone: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Owner', ownerSchema);
