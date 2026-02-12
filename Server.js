const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
require('dotenv').config();

const tournamentRoutes = require('./routes/tournamentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.get('/api/test', (req, res) => res.send('ok'));
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/admins', adminRoutes);

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piegon_db')
  .then(async () => {
    console.log('MongoDB Connected Successfully');
    
    // Initialize Super Admin if none exists
    try {
      const adminCount = await Admin.countDocuments();
      if (adminCount === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const superAdmin = new Admin({
          name: 'Super Admin',
          email: 'admin@piegon.com',
          password: hashedPassword,
          role: 'Super Admin'
        });
        await superAdmin.save();
        console.log('Default Super Admin created: admin@piegon.com / admin123');
      }
    } catch (err) {
      console.error('Error initializing Super Admin:', err);
    }
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
