const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
require('dotenv').config();

const tournamentRoutes = require('./routes/tournamentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const newsRoutes = require('./routes/newsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const leagueRoutes = require('./routes/leagueRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------- CORS SETUP --------------------
const allowedOrigins = [
  'http://localhost:5173', // local dev
  'https://ustadwaseemjuttkotla.netlify.app', // production
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // allow requests
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

// -------------------- BODY PARSER --------------------
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// -------------------- ROUTES --------------------
app.get('/api/test', (req, res) => res.send('ok'));

app.use('/api/tournaments', tournamentRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/leagues', leagueRoutes);

// -------------------- DATABASE CONNECTION --------------------
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

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
