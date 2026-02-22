const Setting = require('../models/Setting');
const path = require('path');
const fs = require('fs');

// Helper to get full image URL
const getImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('data:')) return imagePath; // Base64 (for migration period)
  
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${imagePath}`;
};

// Helper to delete image file
const deleteImageFile = (imagePath) => {
  if (!imagePath || imagePath.startsWith('data:') || imagePath.startsWith('http')) return;
  
  const filename = path.basename(imagePath);
  const filepath = path.join(__dirname, '..', 'uploads', filename);
  
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.find().lean();
    
    // Convert image paths to full URLs for settings with arrays of images
    const settingsWithUrls = settings.map(setting => {
      if (setting.key === 'defaultPosters' && Array.isArray(setting.value)) {
        return {
          ...setting,
          value: setting.value.map(poster => getImageUrl(req, poster) || poster)
        };
      }
      return setting;
    });
    
    res.json(settingsWithUrls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSettingByKey = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key }).lean();
    if (!setting) return res.status(404).json({ message: 'Setting not found' });
    
    // Convert image paths to full URLs
    if (setting.key === 'defaultPosters' && Array.isArray(setting.value)) {
      setting.value = setting.value.map(poster => getImageUrl(req, poster) || poster);
    }
    
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update or create setting
exports.updateSetting = async (req, res) => {
  try {
    let { key, value } = req.body;
    let setting = await Setting.findOne({ key });
    
    // Handle file uploads for defaultPosters
    if (key === 'defaultPosters') {
      let existingPosters = [];
      try {
        // If value is sent as stringified JSON from FormData
        existingPosters = typeof value === 'string' ? JSON.parse(value) : (Array.isArray(value) ? value : []);
      } catch (e) {
        existingPosters = setting && Array.isArray(setting.value) ? setting.value : [];
      }

      // Filter out full URLs to keep only partial paths or base64
      existingPosters = existingPosters.map(p => {
        if (typeof p === 'string' && p.includes('/uploads/')) {
          return '/uploads/' + p.split('/uploads/')[1];
        }
        return p;
      });

      const newPosters = req.files && req.files.length > 0 
        ? req.files.map(file => `/uploads/${file.filename}`) 
        : [];
      
      const combinedPosters = [...existingPosters, ...newPosters];
      
      if (setting) {
        setting.value = combinedPosters;
        await setting.save();
      } else {
        setting = new Setting({ key, value: combinedPosters });
        await setting.save();
      }
    } else {
      // Regular update for non-file settings
      if (setting) {
        setting.value = value;
        await setting.save();
      } else {
        setting = new Setting({ key, value });
        await setting.save();
      }
    }
    
    // Convert poster paths to full URLs in response
    const response = setting.toObject();
    if (response.key === 'defaultPosters' && Array.isArray(response.value)) {
      response.value = response.value.map(poster => getImageUrl(req, poster) || poster);
    }
    
    res.json(response);
  } catch (err) {
    // Clean up uploaded files if save failed
    if (req.files) {
      req.files.forEach(file => deleteImageFile(`/uploads/${file.filename}`));
    }
    res.status(500).json({ message: err.message });
  }
};
