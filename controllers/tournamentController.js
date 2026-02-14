const Tournament = require('../models/Tournament');
const { calculateGrandTotal, calculateWinners } = require('../utils/calculations');

// Helper to sync times across tournaments
const syncPigeonTimesAcrossTournaments = async (currentTournament, updatedParticipants) => {
  const pigeonsPerDay = currentTournament.numPigeons || 0;
  
  for (const part of updatedParticipants) {
    if (!part.ownerId) continue;

    // Find other tournaments where this person is enrolled
    const otherTournaments = await Tournament.find({
      _id: { $ne: currentTournament._id },
      'participants.ownerId': part.ownerId
    });

    for (const other of otherTournaments) {
      let otherChanged = false;
      const otherPigeonsPerDay = other.numPigeons || 0;
      
      const otherParticipant = other.participants.find(p => p.ownerId && p.ownerId.toString() === part.ownerId.toString());
      if (!otherParticipant) continue;

      // Sync specific times based on matching flying dates
      part.pigeonTimes.forEach((newTime, idx) => {
        if (!newTime) return;

        const dayIdx = Math.floor(idx / pigeonsPerDay);
        const pNum = idx % pigeonsPerDay;
        const currentDate = currentTournament.flyingDates[dayIdx];
        
        if (!currentDate) return;

        // Find if 'other' tournament has this same date
        const otherDayIdx = other.flyingDates.findIndex(d => 
          d.toISOString().split('T')[0] === currentDate.toISOString().split('T')[0]
        );

        if (otherDayIdx !== -1) {
          const otherIdx = (otherDayIdx * otherPigeonsPerDay) + pNum;
          
          // Only sync if it's not a helper pigeon overflow for the other tournament
          if (pNum < otherPigeonsPerDay) {
            if (otherParticipant.pigeonTimes[otherIdx] !== newTime) {
              otherParticipant.pigeonTimes[otherIdx] = newTime;
              otherChanged = true;
            }
          }
        }
      });

      if (otherChanged) {
        // Recalculate totals and winners for the synced tournament
        otherParticipant.totalTime = calculateGrandTotal(
          otherParticipant.pigeonTimes,
          otherPigeonsPerDay,
          other.startTime,
          other.numDays,
          other.numPigeons
        );

        const { firstWinner, firstTime, lastWinner, lastTime } = calculateWinners(other.participants, other.startTime);
        other.firstWinner = firstWinner;
        other.firstTime = firstTime;
        other.lastWinner = lastWinner;
        other.lastTime = lastTime;

        await other.save();
      }
    }
  }
};

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

    // List of fields to not update directly
    const restrictedFields = ['_id', '__v', 'createdAt', 'updatedAt'];

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (!restrictedFields.includes(key)) {
        tournament[key] = req.body[key];
      }
    });

    const updatedTournament = await tournament.save();

    // After saving, if participants/times were updated, sync across other tournaments
    if (req.body.participants) {
      await syncPigeonTimesAcrossTournaments(updatedTournament, req.body.participants);
    }

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
