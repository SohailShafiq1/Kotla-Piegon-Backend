const express = require('express');
const router = express.Router();
const { getAllTournaments, createTournament } = require('../controllers/tournamentController');

router.get('/', getAllTournaments);
router.post('/', createTournament);

module.exports = router;
