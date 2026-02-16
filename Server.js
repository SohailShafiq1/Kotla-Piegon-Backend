const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
require('dotenv').config();

// Routes
const tournamentRoutes = require('./routes/tournamentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const newsRoutes = require('./routes/newsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const leagueRoutes = require('./routes/leagueRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// ==================== CORS CONFIG ====================
const allowedOrigins = [
  'http://localhost:5173',
  'https://ustadwaseemjuttkotla.com',
  'https://www.ustadwaseemjuttkotla.com',
  'https://ustadwaseemjuttkotla.netlify.app',
  'https://api.ustadwaseemjuttkotla.com'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Note: app.options is handled automatically by the cors middleware above.
// No extra app.options('*') line is needed, which prevents the PathError crash.

// ==================== BODY PARSER ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==================== ROUTES ====================
app.get('/api/test', (req, res) => {
  res.json({ message: "API Working" });
});

app.use('/api/tournaments', tournamentRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/leagues', leagueRoutes);

// ==================== DATABASE ====================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected Successfully');

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
        console.log('Default Super Admin created');
      }
    } catch (err) {
      console.error('Error initializing Super Admin:', err);
    }
    
    // Start Server only after DB is connected
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
  });