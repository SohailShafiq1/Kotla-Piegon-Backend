const Tournament = require('../models/Tournament');
const League = require('../models/League');
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

      // Ensure otherParticipant has pigeonTimes array
      if (!otherParticipant.pigeonTimes) otherParticipant.pigeonTimes = [];

      // Sync specific times based on matching flying dates
      (part.pigeonTimes || []).forEach((newTime, idx) => {
        if (!newTime) return;

        const dayIdx = Math.floor(idx / pigeonsPerDay);
        const pNum = idx % pigeonsPerDay;
        const currentDate = currentTournament.flyingDates[dayIdx];
        
        if (!currentDate || !other.flyingDates) return;

        // Find if 'other' tournament has this same date
        const otherDayIdx = other.flyingDates.findIndex(d => 
          d && d.toISOString().split('T')[0] === currentDate.toISOString().split('T')[0]
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

          // Sync individual start times as well if they exist
          if (part.dailyStartTimes && part.dailyStartTimes[dayIdx]) {
            if (!otherParticipant.dailyStartTimes) otherParticipant.dailyStartTimes = [];
            if (otherParticipant.dailyStartTimes[otherDayIdx] !== part.dailyStartTimes[dayIdx]) {
               otherParticipant.dailyStartTimes[otherDayIdx] = part.dailyStartTimes[dayIdx];
               otherChanged = true;
            }
          }
        }
      });

      // Also sync overall startTime if it exists and changed
      if (part.startTime && otherParticipant.startTime !== part.startTime) {
        otherParticipant.startTime = part.startTime;
        otherChanged = true;
      }

      if (otherChanged) {
        // Recalculate totals and winners for the synced tournament
        otherParticipant.totalTime = calculateGrandTotal(
          otherParticipant.pigeonTimes,
          otherPigeonsPerDay,
          other.startTime,
          other.numDays,
          other.numPigeons,
          otherParticipant
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
      .sort({ createdAt: -1 })
      .lean(); // Use lean() to get plain JS objects
    
    // Clean participants data before sending
    const cleanedTournaments = tournaments.map(t => {
      if (t.participants) {
        t.participants = t.participants.map(p => {
          const cleaned = { ...p };
          
          // Clean dailyStartTimes if corrupted
          if (p.dailyStartTimes && Array.isArray(p.dailyStartTimes)) {
            cleaned.dailyStartTimes = p.dailyStartTimes.map(time => {
              if (typeof time === 'string') return time;
              if (typeof time === 'object' && time !== null) {
                const values = Object.values(time).filter(v => typeof v === 'string');
                return values.length > 0 ? values[0] : '06:00';
              }
              return String(time || '06:00');
            });
          }
          
          return cleaned;
        });
      }
      return t;
    });
    
    res.status(200).json(cleanedTournaments);
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
    const tournament = await Tournament.findById(req.params.id)
      .populate('admin', 'name role')
      .lean(); // Use lean() to get plain JS object
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    
    // Clean participants data before sending
    if (tournament.participants) {
      tournament.participants = tournament.participants.map(p => {
        const cleaned = { ...p };
        
        // Clean dailyStartTimes if it exists and is corrupted
        if (p.dailyStartTimes && Array.isArray(p.dailyStartTimes)) {
          cleaned.dailyStartTimes = p.dailyStartTimes.map(time => {
            if (typeof time === 'string') return time;
            if (typeof time === 'object' && time !== null) {
              const values = Object.values(time).filter(v => typeof v === 'string');
              return values.length > 0 ? values[0] : '06:00';
            }
            return String(time || '06:00');
          });
        }
        
        return cleaned;
      });
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
    let hasPermission = req.admin.role === 'Super Admin' || tournament.admin.toString() === req.admin.id;
    
    // Check if user is a League Admin for this tournament's league
    if (!hasPermission && tournament.leagueName && tournament.leagueName !== 'Independent') {
      const league = await League.findOne({ name: tournament.leagueName });
      if (league && league.admin && league.admin.toString() === req.admin.id) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // List of fields to not update directly
    const restrictedFields = ['_id', '__v', 'createdAt', 'updatedAt'];

    // Clean participants array before updating to prevent corruption
    if (req.body.participants) {
      req.body.participants = req.body.participants.map(p => {
        const cleaned = {
          ownerId: p.ownerId,
          name: p.name,
          image: p.image || '',
          address: p.address || '',
          phone: p.phone || '',
          pigeonTimes: [],
          totalTime: p.totalTime || '00:00:00'
        };

        // Clean pigeonTimes
        if (p.pigeonTimes && Array.isArray(p.pigeonTimes)) {
          cleaned.pigeonTimes = p.pigeonTimes.map(t => String(t || ''));
        }

        // Clean dailyStartTimes - ensure plain string array
        if (p.dailyStartTimes && Array.isArray(p.dailyStartTimes)) {
          cleaned.dailyStartTimes = p.dailyStartTimes.map(t => {
            if (typeof t === 'string') return t;
            if (typeof t === 'object' && t !== null) {
              // Extract value from corrupted object structure
              const values = Object.values(t).filter(v => typeof v === 'string');
              return values.length > 0 ? values[0] : '06:00';
            }
            return String(t || '06:00');
          });
        }

        // Clean startTime
        if (p.startTime) {
          cleaned.startTime = String(p.startTime);
        }

        return cleaned;
      });
    }

    // Update fields - handle participants specially
    Object.keys(req.body).forEach(key => {
      if (!restrictedFields.includes(key)) {
        if (key === 'participants') {
          // Completely replace participants array
          tournament.participants = req.body.participants;
          tournament.markModified('participants');
        } else {
          tournament[key] = req.body[key];
        }
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
    let hasPermission = req.admin.role === 'Super Admin' || tournament.admin.toString() === req.admin.id;
    
    // Check if user is a League Admin for this tournament's league
    if (!hasPermission && tournament.leagueName && tournament.leagueName !== 'Independent') {
      const league = await League.findOne({ name: tournament.leagueName });
      if (league && league.admin && league.admin.toString() === req.admin.id) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Tournament.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
