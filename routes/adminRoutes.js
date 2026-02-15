const express = require('express');
const router = express.Router();
const { getAllAdmins, createAdmin, loginAdmin, getDashboardStats, updateAdmin, deleteAdmin } = require('../controllers/adminController');
const { auth, isSuperAdmin } = require('../middleware/auth');

router.post('/login', loginAdmin);
router.get('/stats', auth, getDashboardStats);
router.get('/', auth, getAllAdmins);
router.post('/', auth, isSuperAdmin, createAdmin);
router.put('/:id', auth, isSuperAdmin, updateAdmin);
router.delete('/:id', auth, isSuperAdmin, deleteAdmin);

module.exports = router;
