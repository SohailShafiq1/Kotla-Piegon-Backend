const Tournament = require('../models/Tournament');

// Get all tournaments
exports.getAllTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('admin', 'name role')
      .sort({ createdAt: -1 });
    res.status(200).json(tournaments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new tournament
exports.createTournament = async (req, res) => {
  try {
    const tournamentData = { ...req.body };
    
    // If no admin is specified, default to the creator
    if (!tournamentData.admin) {
      tournamentData.admin = req.admin.id;
    }
    
    const newTournament = new Tournament(tournamentData);
    const savedTournament = await newTournament.save();
    res.status(201).json(savedTournament);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get single tournament
exports.getTournamentById = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('admin', 'name role');
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    
    // Check permissions
    if (req.admin.role !== 'Super Admin' && tournament.admin._id.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.status(200).json(tournament);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update tournament
exports.updateTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    // Check permissions
    if (req.admin.role !== 'Super Admin' && tournament.admin.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedTournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.status(200).json(updatedTournament);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete tournament
exports.deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    // Check permissions
    if (req.admin.role !== 'Super Admin' && tournament.admin.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Tournament.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
