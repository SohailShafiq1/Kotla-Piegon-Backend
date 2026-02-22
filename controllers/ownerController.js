const Owner = require('../models/Owner');
const path = require('path');
const fs = require('fs');

// Helper to get full image URL
const getImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath; // Already full URL
  if (imagePath.startsWith('data:')) return imagePath; // Base64 (for migration period)
  
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${imagePath}`;
};

// Helper to delete old image file
const deleteImageFile = (imagePath) => {
  if (!imagePath || imagePath.startsWith('data:') || imagePath.startsWith('http')) return;
  
  const filename = path.basename(imagePath);
  const filepath = path.join(__dirname, '..', 'uploads', filename);
  
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
};

// Get all owners
exports.getAllOwners = async (req, res) => {
  try {
    const owners = await Owner.find().sort({ name: 1 }).lean();
    
    // Convert image paths to full URLs
    const ownersWithUrls = owners.map(owner => ({
      ...owner,
      image: owner.image ? getImageUrl(req, owner.image) : null
    }));
    
    res.status(200).json(ownersWithUrls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search owners by name
exports.searchOwners = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(200).json([]);
    
    const owners = await Owner.find({ 
      name: { $regex: query, $options: 'i' } 
    }).limit(10).lean();
    
    // Convert image paths to full URLs
    const ownersWithUrls = owners.map(owner => ({
      ...owner,
      image: owner.image ? getImageUrl(req, owner.image) : null
    }));
    
    res.status(200).json(ownersWithUrls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new owner
exports.createOwner = async (req, res) => {
  try {
    console.log('--- CREATE OWNER ---');
    console.log('📥 Content-Type:', req.headers['content-type']);
    console.log('📥 Request Body:', req.body);
    console.log('📥 Request File:', req.file);
    const { name, address, phone } = req.body;
    
    // Check if owner already exists
    const existingOwner = await Owner.findOne({ name });
    if (existingOwner) {
      return res.status(400).json({ message: 'An owner with this name already exists' });
    }

    // If file was uploaded, store relative path
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const newOwner = new Owner({ 
      name, 
      image: imagePath, 
      address, 
      phone 
    });
    
    const savedOwner = await newOwner.save();
    
    // Return with full URL
    const ownerResponse = {
      ...savedOwner.toObject(),
      image: savedOwner.image ? getImageUrl(req, savedOwner.image) : null
    };
    
    res.status(201).json(ownerResponse);
  } catch (error) {
    // Clean up uploaded file if save failed
    if (req.file) {
      deleteImageFile(`/uploads/${req.file.filename}`);
    }
    res.status(400).json({ message: error.message });
  }
};

// Update owner
exports.updateOwner = async (req, res) => {
  try {
    console.log('--- UPDATE OWNER ---');
    console.log('📥 Content-Type:', req.headers['content-type']);
    console.log('📥 Update Owner Body:', req.body);
    console.log('📥 Update Owner File:', req.file);
    const owner = await Owner.findById(req.params.id);
    if (!owner) return res.status(404).json({ message: 'Owner not found' });

    const oldImagePath = owner.image;

    // Update fields from request body
    if (req.body.name) owner.name = req.body.name;
    if (req.body.address !== undefined) owner.address = req.body.address;
    if (req.body.phone !== undefined) owner.phone = req.body.phone;

    // If new file was uploaded, update image path and delete old file
    if (req.file) {
      owner.image = `/uploads/${req.file.filename}`;
      
      // Delete old image file (if it exists and is not base64)
      if (oldImagePath) {
        deleteImageFile(oldImagePath);
      }
    }

    const updatedOwner = await owner.save();
    
    // Return with full URL
    const ownerResponse = {
      ...updatedOwner.toObject(),
      image: updatedOwner.image ? getImageUrl(req, updatedOwner.image) : null
    };
    
    res.status(200).json(ownerResponse);
  } catch (error) {
    // Clean up uploaded file if save failed
    if (req.file) {
      deleteImageFile(`/uploads/${req.file.filename}`);
    }
    res.status(400).json({ message: error.message });
  }
};

// Delete owner
exports.deleteOwner = async (req, res) => {
  try {
    const owner = await Owner.findById(req.params.id);
    if (!owner) return res.status(404).json({ message: 'Owner not found' });
    
    // Delete associated image file
    if (owner.image) {
      deleteImageFile(owner.image);
    }
    
    await Owner.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Owner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
