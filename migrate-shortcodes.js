/**
 * Migration Script: Generate Short Codes for Existing Tournaments
 * 
 * This script generates unique 6-character short codes for any
 * tournaments that don't have one yet.
 * 
 * Usage: node migrate-shortcodes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Tournament = require('./models/Tournament');

// Generate a random 4-character alphanumeric shortCode
const generateShortCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0,O,1,I,L
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

async function migrateShortCodes() {
  try {
    console.log('🚀 Starting short code migration...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/piegon';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all tournaments without a shortCode
    const tournaments = await Tournament.find({ 
      $or: [
        { shortCode: { $exists: false } },
        { shortCode: null },
        { shortCode: '' }
      ]
    });

    console.log(`📋 Found ${tournaments.length} tournaments without short codes\n`);

    if (tournaments.length === 0) {
      console.log('✅ All tournaments already have short codes!');
      return;
    }

    // Keep track of used codes to ensure uniqueness
    const existingCodes = new Set(
      (await Tournament.find({ shortCode: { $exists: true, $ne: null, $ne: '' } })
        .select('shortCode')
        .lean())
        .map(t => t.shortCode)
    );

    let updated = 0;
    let failed = 0;

    for (const tournament of tournaments) {
      try {
        let code = generateShortCode();
        let attempts = 0;

        // Ensure uniqueness
        while (existingCodes.has(code) && attempts < 100) {
          code = generateShortCode();
          attempts++;
        }

        if (attempts >= 100) {
          console.error(`❌ Could not generate unique code for: ${tournament.name}`);
          failed++;
          continue;
        }

        // Update the tournament
        await Tournament.updateOne(
          { _id: tournament._id },
          { $set: { shortCode: code } }
        );

        existingCodes.add(code);
        updated++;
        console.log(`✅ ${tournament.name}: ${code}`);
      } catch (err) {
        console.error(`❌ Error updating ${tournament.name}:`, err.message);
        failed++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📋 Total: ${tournaments.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateShortCodes();
