const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['Published', 'Draft'], default: 'Published' },
    author: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('News', newsSchema);
