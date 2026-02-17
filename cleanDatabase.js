const mongoose = require('mongoose');
const Tournament = require('./models/Tournament');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

async function cleanDatabase() {
  try {
    console.log('Starting database cleanup...');
    
    const tournaments = await Tournament.find({}).lean();
    console.log(`Found ${tournaments.length} tournaments`);
    
    let fixedCount = 0;
    
    for (const tournament of tournaments) {
      let needsSave = false;
      const cleanedParticipants = [];
      
      for (let i = 0; i < tournament.participants.length; i++) {
        const participant = tournament.participants[i];
        const cleanedParticipant = { ...participant };
        
        // Clean dailyStartTimes
        if (participant.dailyStartTimes) {
          const cleanedTimes = [];
          
          if (Array.isArray(participant.dailyStartTimes)) {
            for (let j = 0; j < participant.dailyStartTimes.length; j++) {
              const time = participant.dailyStartTimes[j];
              
              // If it's already a valid string time, keep it
              if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) {
                cleanedTimes.push(time);
              }
              // If it's an object, extract the value
              else if (typeof time === 'object' && time !== null) {
                const values = Object.values(time);
                cleanedTimes.push(values[0] || '06:00');
                needsSave = true;
              }
              // If it's a string that looks like an object/array
              else if (typeof time === 'string' && (time.includes('{') || time.includes('['))) {
                try {
                  const parsed = JSON.parse(time);
                  if (typeof parsed === 'object' && parsed !== null) {
                    const values = Object.values(parsed);
                    cleanedTimes.push(values[0] || '06:00');
                  } else {
                    cleanedTimes.push('06:00');
                  }
                } catch (e) {
                  cleanedTimes.push('06:00');
                }
                needsSave = true;
              }
              // Fallback
              else {
                cleanedTimes.push('06:00');
                needsSave = true;
              }
            }
          } else {
            cleanedTimes.push('06:00');
            needsSave = true;
          }
          
          cleanedParticipant.dailyStartTimes = cleanedTimes;
        }
        
        // Ensure startTime is a string
        if (participant.startTime) {
          if (typeof participant.startTime === 'string' && /^\d{2}:\d{2}$/.test(participant.startTime)) {
            // Valid
          } else if (typeof participant.startTime === 'object') {
            const values = Object.values(participant.startTime);
            cleanedParticipant.startTime = values[0] || '06:00';
            needsSave = true;
          } else {
            cleanedParticipant.startTime = '06:00';
            needsSave = true;
          }
        }
        
        cleanedParticipants.push(cleanedParticipant);
      }
      
      if (needsSave) {
        const tournamentDoc = await Tournament.findById(tournament._id);
        tournamentDoc.participants = cleanedParticipants;
        tournamentDoc.markModified('participants');
        await tournamentDoc.save();
        fixedCount++;
        console.log(`✓ Fixed: ${tournament.name}`);
      }
    }
    
    console.log(`\nCleanup complete! Fixed ${fixedCount} tournament(s)`);
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  }
}

cleanDatabase();
