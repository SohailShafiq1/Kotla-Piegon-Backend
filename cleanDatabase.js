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
      
      console.log(`\n--- Checking tournament: ${tournament.name} ---`);
      
      for (let i = 0; i < tournament.participants.length; i++) {
        const participant = tournament.participants[i];
        const cleanedParticipant = { ...participant };
        
        console.log(`  Participant ${i} (${participant.name}):`);
        console.log(`    dailyStartTimes type:`, typeof participant.dailyStartTimes, Array.isArray(participant.dailyStartTimes));
        console.log(`    dailyStartTimes value:`, JSON.stringify(participant.dailyStartTimes));
        
        // Clean dailyStartTimes
        if (participant.dailyStartTimes) {
          const cleanedTimes = [];
          
          if (Array.isArray(participant.dailyStartTimes)) {
            for (let j = 0; j < participant.dailyStartTimes.length; j++) {
              const time = participant.dailyStartTimes[j];
              console.log(`      Time [${j}] type:`, typeof time, `value:`, JSON.stringify(time));
              
              // If it's already a valid string time, keep it
              if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) {
                cleanedTimes.push(time);
              }
              // If it's an object, extract the value
              else if (typeof time === 'object' && time !== null) {
                console.log(`        ⚠️  Found corrupted object time!`);
                const values = Object.values(time);
                cleanedTimes.push(values[0] || '06:00');
                needsSave = true;
              }
              // If it's a string that looks like an object/array
              else if (typeof time === 'string' && (time.includes('{') || time.includes('['))) {
                console.log(`        ⚠️  Found corrupted stringified time!`);
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
                console.log(`        ⚠️  Unexpected format, using default`);
                cleanedTimes.push('06:00');
                needsSave = true;
              }
            }
          } else {
            console.log(`      ⚠️  dailyStartTimes is not an array!`);
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
            console.log(`    ⚠️  startTime is object:`, JSON.stringify(participant.startTime));
            const values = Object.values(participant.startTime);
            cleanedParticipant.startTime = values[0] || '06:00';
            needsSave = true;
          } else {
            console.log(`    ⚠️  Invalid startTime format`);
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
        console.log(`  ✓ Fixed and saved tournament: ${tournament.name}`);
      } else {
        console.log(`  ✓ Tournament is clean`);
      }
    }
    
    console.log(`\n========================================`);
    console.log(`Cleanup complete! Fixed ${fixedCount} tournament(s)`);
    console.log(`========================================\n`);
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  }
}

cleanDatabase();
