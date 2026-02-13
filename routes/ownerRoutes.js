const express = require('express');
const router = express.Router();
const { 
  getAllOwners, 
  searchOwners, 
  createOwner, 
  updateOwner, 
  deleteOwner 
} = require('../controllers/ownerController');
const { auth } = require('../middleware/auth');

router.get('/', auth, getAllOwners);
router.get('/search', auth, searchOwners);
router.post('/', auth, createOwner);
router.put('/:id', auth, updateOwner);
router.delete('/:id', auth, deleteOwner);

module.exports = router;
