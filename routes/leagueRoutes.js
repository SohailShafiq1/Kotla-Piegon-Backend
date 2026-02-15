const express = require('express');
const router = express.Router();
const leagueController = require('../controllers/leagueController');
const { auth, isSuperAdmin } = require('../middleware/auth');

router.post('/', auth, isSuperAdmin, leagueController.createLeague);
router.get('/', leagueController.getLeagues);
router.delete('/:id', auth, isSuperAdmin, leagueController.deleteLeague);

module.exports = router;
