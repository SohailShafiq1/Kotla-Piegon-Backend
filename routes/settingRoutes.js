const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { auth } = require('../middleware/auth');

router.get('/', settingController.getSettings);
router.get('/:key', settingController.getSettingByKey);
router.post('/', auth, settingController.updateSetting);

module.exports = router;
