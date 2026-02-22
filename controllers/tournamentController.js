const Tournament = require('../models/Tournament');
const League = require('../models/League');
const { calculateGrandTotal, calculateWinners } = require('../utils/calculations');
const path = require('path');
const fs = require('fs');

// Helper to get full image URL
const getImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath; // Already full URL
  if (imagePath.startsWith('data:')) return imagePath; // Base64 (for migration period)

  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${imagePath}`;
};

// Helper to delete image file
const deleteImageFile = (imagePath) => {
  if (!imagePath || imagePath.startsWith('data:') || imagePath.startsWith('http')) return;

  const filename = path.basename(imagePath);
  const filepath = path.join(__dirname, '..', 'uploads', filename);

  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
};

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

    // Clean participants data and convert poster paths to full URLs
    const cleanedTournaments = tournaments.map(t => {
      // Convert poster paths to full URLs
      if (t.posters && Array.isArray(t.posters)) {
        t.posters = t.posters.map(poster => getImageUrl(req, poster) || poster);
      }

      // Convert participant images to full URLs
      if (t.participants) {
        t.participants = t.participants.map(p => {
          const cleaned = { ...p };

          // Convert image path to full URL
          if (p.image) {
            cleaned.image = getImageUrl(req, p.image) || p.image;
          }

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

      // Drop massive participants array if summary=true
      if (req.query.summary === 'true') {
        t.participantCount = t.participants ? t.participants.length : 0;
        delete t.participants;
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

    // Parse stringified JSON fields from FormData
    ['participants', 'flyingDates', 'posters', 'dailyWinners'].forEach(field => {
      if (typeof tournamentData[field] === 'string') {
        try {
          tournamentData[field] = JSON.parse(tournamentData[field]);
        } catch (e) {
          // If not valid JSON, keep as is (might be a single string)
          if (field === 'posters') tournamentData[field] = [tournamentData[field]];
        }
      }
    });

    // If no admin is specified, default to the creator
    if (!tournamentData.admin) {
      tournamentData.admin = req.admin.id;
    }

    // Handle uploaded poster files
    if (req.files && req.files.length > 0) {
      const uploadedPosters = req.files.map(file => `/uploads/${file.filename}`);
      const existingPosters = Array.isArray(tournamentData.posters) ? tournamentData.posters : [];
      tournamentData.posters = [...existingPosters, ...uploadedPosters];
    }

    const newTournament = new Tournament(tournamentData);
    const savedTournament = await newTournament.save();

    // Convert poster paths to full URLs in response
    const response = savedTournament.toObject();
    if (response.posters) {
      response.posters = response.posters.map(poster => getImageUrl(req, poster) || poster);
    }

    res.status(201).json(response);
  } catch (error) {
    // Clean up uploaded files if save failed
    if (req.files) {
      req.files.forEach(file => deleteImageFile(`/uploads/${file.filename}`));
    }
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

    // Convert poster paths to full URLs
    if (tournament.posters && Array.isArray(tournament.posters)) {
      tournament.posters = tournament.posters.map(poster => getImageUrl(req, poster) || poster);
    }

    // Clean participants data before sending
    if (tournament.participants) {
      tournament.participants = tournament.participants.map(p => {
        const cleaned = { ...p };

        // Convert image path to full URL
        if (p.image) {
          cleaned.image = getImageUrl(req, p.image) || p.image;
        }

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

    // Parse stringified JSON fields from FormData
    ['participants', 'flyingDates', 'posters', 'dailyWinners'].forEach(field => {
      if (typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (e) {
          // If not valid JSON, keep as is
          if (field === 'posters') req.body[field] = [req.body[field]];
        }
      }
    });

    // Handle uploaded poster files
    if (req.files && req.files.length > 0) {
      const existingPosters = Array.isArray(req.body.posters) ? req.body.posters : (tournament.posters || []);
      const newPosters = req.files.map(file => `/uploads/${file.filename}`);

      // Combine existing and new posters
      req.body.posters = [...existingPosters, ...newPosters];
    }

    // List of fields to not update directly
    const restrictedFields = ['_id', '__v', 'createdAt', 'updatedAt'];

    // Clean participants array before updating to prevent corruption
    if (req.body.participants && Array.isArray(req.body.participants)) {
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

    // Convert poster paths to full URLs in response
    const response = updatedTournament.toObject();
    if (response.posters) {
      response.posters = response.posters.map(poster => getImageUrl(req, poster) || poster);
    }
    if (response.participants) {
      response.participants = response.participants.map(p => ({
        ...p,
        image: p.image ? getImageUrl(req, p.image) || p.image : null
      }));
    }

    res.status(200).json(response);
  } catch (error) {
    // Clean up uploaded files if save failed
    if (req.files) {
      req.files.forEach(file => deleteImageFile(`/uploads/${file.filename}`));
    }
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
