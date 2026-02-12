const express = require('express');
const router = express.Router();
const { 
  getAllTournaments, 
  createTournament, 
  getTournamentById, 
  updateTournament, 
  deleteTournament 
} = require('../controllers/tournamentController');
const { auth } = require('../middleware/auth');

router.get('/', getAllTournaments);
router.post('/', auth, createTournament);
router.get('/:id', getTournamentById);
router.put('/:id', auth, updateTournament);
router.delete('/:id', auth, deleteTournament);

module.exports = router;
