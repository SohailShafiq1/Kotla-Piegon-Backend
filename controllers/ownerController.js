const Owner = require('../models/Owner');

// Get all owners
exports.getAllOwners = async (req, res) => {
  try {
    const owners = await Owner.find().sort({ name: 1 });
    res.status(200).json(owners);
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
    }).limit(10);
    
    res.status(200).json(owners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new owner
exports.createOwner = async (req, res) => {
  try {
    const { name, image, address, phone } = req.body;
    
    // Check if owner already exists
    const existingOwner = await Owner.findOne({ name });
    if (existingOwner) {
      return res.status(400).json({ message: 'An owner with this name already exists' });
    }

    const newOwner = new Owner({ name, image, address, phone });
    const savedOwner = await newOwner.save();
    res.status(201).json(savedOwner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update owner
exports.updateOwner = async (req, res) => {
  try {
    const owner = await Owner.findById(req.params.id);
    if (!owner) return res.status(404).json({ message: 'Owner not found' });

    Object.keys(req.body).forEach(key => {
      owner[key] = req.body[key];
    });

    const updatedOwner = await owner.save();
    res.status(200).json(updatedOwner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete owner
exports.deleteOwner = async (req, res) => {
  try {
    await Owner.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Owner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
