/**
 * Migration Script: Convert Base64 Images to File-Based Storage
 * 
 * This script:
 * 1. Finds all documents with base64-encoded images
 * 2. Converts base64 strings to image files
 * 3. Saves files in the uploads folder
 * 4. Updates database to store file paths instead of base64
 * 
 * Usage: node migrate-images.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import models
const Owner = require('./models/Owner');
const Tournament = require('./models/Tournament');
const Setting = require('./models/Setting');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

/**
 * Convert base64 string to image file
 * @param {string} base64String - The base64 encoded image string
 * @returns {string} - Path to saved file (e.g., '/uploads/uuid.jpg')
 */
function base64ToFile(base64String) {
  try {
    // Check if it's a valid base64 image string
    if (!base64String || !base64String.startsWith('data:image/')) {
      return null;
    }

    // Extract mime type and base64 data
    const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.warn('⚠️  Invalid base64 format');
      return null;
    }

    const mimeType = matches[1]; // e.g., 'jpeg', 'png', 'webp'
    const base64Data = matches[2];

    // Determine file extension
    let ext = `.${mimeType}`;
    if (mimeType === 'jpeg') ext = '.jpg';

    // Generate unique filename
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Convert base64 to buffer and write to file
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filepath, buffer);

    console.log(`  ✅ Saved: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);
    
    // Return relative path for database
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('  ❌ Error converting base64 to file:', error.message);
    return null;
  }
}

/**
 * Migrate Owner images
 */
async function migrateOwners() {
  console.log('\n📋 Migrating Owner images...');
  
  try {
    const owners = await Owner.find({});
    console.log(`Found ${owners.length} owners to check`);
    
    let migratedCount = 0;
    let skippedCount = 0;

    for (const owner of owners) {
      if (owner.image && owner.image.startsWith('data:image/')) {
        console.log(`\n👤 Migrating: ${owner.name}`);
        
        const filePath = base64ToFile(owner.image);
        
        if (filePath) {
          owner.image = filePath;
          await owner.save();
          migratedCount++;
        } else {
          console.log('  ⚠️  Migration failed, keeping base64');
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Owners migration complete:`);
    console.log(`   - Migrated: ${migratedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    
    return { migrated: migratedCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ Error migrating owners:', error.message);
    throw error;
  }
}

/**
 * Migrate Tournament posters and participant images
 */
async function migrateTournaments() {
  console.log('\n📋 Migrating Tournament images...');
  
  try {
    const tournaments = await Tournament.find({});
    console.log(`Found ${tournaments.length} tournaments to check`);
    
    let postersMigratedCount = 0;
    let participantsMigratedCount = 0;
    let skippedCount = 0;

    for (const tournament of tournaments) {
      let modified = false;
      console.log(`\n🏆 Processing: ${tournament.name}`);
      
      // Migrate posters
      if (tournament.posters && Array.isArray(tournament.posters)) {
        const newPosters = [];
        
        for (const poster of tournament.posters) {
          if (poster && poster.startsWith('data:image/')) {
            console.log('  📸 Migrating poster...');
            const filePath = base64ToFile(poster);
            
            if (filePath) {
              newPosters.push(filePath);
              postersMigratedCount++;
              modified = true;
            } else {
              newPosters.push(poster); // Keep original if migration fails
            }
          } else {
            newPosters.push(poster); // Keep non-base64 posters
          }
        }
        
        tournament.posters = newPosters;
      }
      
      // Migrate participant images
      if (tournament.participants && Array.isArray(tournament.participants)) {
        for (const participant of tournament.participants) {
          if (participant.image && participant.image.startsWith('data:image/')) {
            console.log(`  👤 Migrating participant: ${participant.name}`);
            const filePath = base64ToFile(participant.image);
            
            if (filePath) {
              participant.image = filePath;
              participantsMigratedCount++;
              modified = true;
            }
          }
        }
      }
      
      if (modified) {
        tournament.markModified('posters');
        tournament.markModified('participants');
        await tournament.save();
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Tournaments migration complete:`);
    console.log(`   - Posters migrated: ${postersMigratedCount}`);
    console.log(`   - Participant images migrated: ${participantsMigratedCount}`);
    console.log(`   - Tournaments skipped: ${skippedCount}`);
    
    return { 
      posters: postersMigratedCount, 
      participants: participantsMigratedCount, 
      skipped: skippedCount 
    };
  } catch (error) {
    console.error('❌ Error migrating tournaments:', error.message);
    throw error;
  }
}

/**
 * Migrate Settings (defaultPosters)
 */
async function migrateSettings() {
  console.log('\n📋 Migrating Settings images...');
  
  try {
    const posterSetting = await Setting.findOne({ key: 'defaultPosters' });
    
    if (!posterSetting) {
      console.log('No defaultPosters setting found');
      return { migrated: 0, skipped: 0 };
    }

    if (!Array.isArray(posterSetting.value)) {
      console.log('defaultPosters is not an array');
      return { migrated: 0, skipped: 0 };
    }

    console.log(`Found ${posterSetting.value.length} default posters to check`);
    
    let migratedCount = 0;
    const newPosters = [];

    for (const poster of posterSetting.value) {
      if (poster && poster.startsWith('data:image/')) {
        console.log('  📸 Migrating default poster...');
        const filePath = base64ToFile(poster);
        
        if (filePath) {
          newPosters.push(filePath);
          migratedCount++;
        } else {
          newPosters.push(poster); // Keep original if migration fails
        }
      } else {
        newPosters.push(poster); // Keep non-base64 posters
      }
    }

    if (migratedCount > 0) {
      posterSetting.value = newPosters;
      await posterSetting.save();
    }

    console.log(`\n✅ Settings migration complete:`);
    console.log(`   - Migrated: ${migratedCount}`);
    console.log(`   - Skipped: ${posterSetting.value.length - migratedCount}`);
    
    return { migrated: migratedCount, skipped: posterSetting.value.length - migratedCount };
  } catch (error) {
    console.error('❌ Error migrating settings:', error.message);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('\n========================================');
  console.log('🚀 Starting Image Migration');
  console.log('========================================');
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🔗 Database: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***@')}`); // Hide credentials
  
  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Run migrations
    const ownerResults = await migrateOwners();
    const tournamentResults = await migrateTournaments();
    const settingsResults = await migrateSettings();

    // Summary
    console.log('\n========================================');
    console.log('✅ MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`\n📊 Summary:`);
    console.log(`   Owners migrated: ${ownerResults.migrated}`);
    console.log(`   Tournament posters migrated: ${tournamentResults.posters}`);
    console.log(`   Participant images migrated: ${tournamentResults.participants}`);
    console.log(`   Default posters migrated: ${settingsResults.migrated}`);
    console.log(`\n   Total images converted: ${
      ownerResults.migrated + 
      tournamentResults.posters + 
      tournamentResults.participants + 
      settingsResults.migrated
    }`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, base64ToFile };
