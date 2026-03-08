require('dotenv').config();
const { generateBatch } = require('./scanner');

async function seed() {
  console.log('🌱 Seeding database with sample opportunities...');
  try {
    await generateBatch(30);
    console.log('✅ Successfully seeded 30 opportunities');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
