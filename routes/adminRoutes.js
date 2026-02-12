const express = require('express');
const router = express.Router();
const { getAllAdmins, createAdmin, loginAdmin } = require('../controllers/adminController');
const { auth, isSuperAdmin } = require('../middleware/auth');

router.post('/login', loginAdmin);
router.get('/', auth, getAllAdmins);
router.post('/', auth, isSuperAdmin, createAdmin);

module.exports = router;
