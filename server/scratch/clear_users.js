require('dotenv').config();
const pool = require('../src/config/db');

const clearAllData = async () => {
  try {
    console.log('🧹 Clearing all users from the database...');
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    console.log('✅ Database cleared.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing database:', err.message);
    process.exit(1);
  }
};

clearAllData();
