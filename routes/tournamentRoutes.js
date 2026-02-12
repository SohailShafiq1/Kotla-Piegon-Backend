const express = require('express');
const router = express.Router();
const { 
  getAllTournaments, 
  createTournament, 
  getTournamentById, 
  updateTournament, 
  deleteTournament 
} = require('../controllers/tournamentController');
const { auth, isSuperAdmin } = require('../middleware/auth');

router.get('/', getAllTournaments);
router.post('/', auth, isSuperAdmin, createTournament);
router.get('/:id', getTournamentById);
router.put('/:id', auth, updateTournament);
router.delete('/:id', auth, isSuperAdmin, deleteTournament);

module.exports = router;
