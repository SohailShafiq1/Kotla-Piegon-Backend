const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { 
  getAllTournaments, 
  createTournament, 
  getTournamentById, 
  updateTournament, 
  deleteTournament 
} = require('../controllers/tournamentController');
const { auth, isSuperAdmin } = require('../middleware/auth');

router.get('/', getAllTournaments);
router.post('/', auth, isSuperAdmin, upload.array('posters', 10), createTournament);
router.get('/:id', getTournamentById);
router.put('/:id', auth, upload.array('posters', 10), updateTournament);
router.delete('/:id', auth, isSuperAdmin, deleteTournament);

module.exports = router;
