const Admin = require('../models/Admin');
const Tournament = require('../models/Tournament');
const Owner = require('../models/Owner');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.getDashboardStats = async (req, res) => {
  try {
    const tournamentCount = await Tournament.countDocuments();
    const ownerCount = await Owner.countDocuments();
    const adminCount = await Admin.countDocuments();
    
    res.status(200).json({
      tournaments: tournamentCount,
      owners: ownerCount,
      admins: adminCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAdmin = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    // Check if admin already exists (by name or email)
    let existingAdmin = await Admin.findOne({ 
      $or: [
        { name: name },
        { email: email && email !== '' ? email : undefined }
      ].filter(cond => Object.values(cond)[0] !== undefined)
    });

    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this name or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      name,
      email: email || undefined,
      password: hashedPassword,
      role: role || 'Admin'
    });

    await admin.save();
    res.status(201).json({ 
      message: 'Admin created successfully',
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.loginAdmin = async (req, res) => {
  const { identity, password } = req.body; // identity can be name or email
  try {
    const admin = await Admin.findOne({
      $or: [{ name: identity }, { email: identity }]
    });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role } = req.body;
  try {
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (name) admin.name = name;
    if (email !== undefined) admin.email = email === '' ? undefined : email;
    if (role) admin.role = role;
    if (password) {
      admin.password = await bcrypt.hash(password, 10);
    }

    await admin.save();
    res.status(200).json({ 
      message: 'Admin updated successfully',
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
