const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { auth } = require('../middleware/auth');

router.post('/', contactController.submitContact);
router.get('/', auth, contactController.getAllContacts);
router.delete('/:id', auth, contactController.deleteContact);

module.exports = router;
