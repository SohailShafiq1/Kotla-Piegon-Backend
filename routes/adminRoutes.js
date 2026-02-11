const express = require('express');
const router = express.Router();
const { getAllAdmins, createAdmin } = require('../controllers/adminController');

router.get('/', getAllAdmins);
router.post('/', createAdmin);

module.exports = router;
