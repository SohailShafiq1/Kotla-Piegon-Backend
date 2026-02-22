const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const settingController = require('../controllers/settingController');
const { auth } = require('../middleware/auth');

router.get('/', settingController.getSettings);
router.get('/:key', settingController.getSettingByKey);
router.post('/', auth, upload.array('posters', 10), settingController.updateSetting);

module.exports = router;
