const express = require('express');
const router = express.Router();
const { 
  getAllTournaments, 
  createTournament, 
  getTournamentById, 
  updateTournament, 
  deleteTournament 
} = require('../controllers/tournamentController');

router.get('/', getAllTournaments);
router.post('/', createTournament);
router.get('/:id', getTournamentById);
router.put('/:id', updateTournament);
router.delete('/:id', deleteTournament);

module.exports = router;
