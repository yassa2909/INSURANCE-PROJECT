require('dotenv').config();
const pool = require('../src/config/db');

const listUsers = async () => {
  try {
    const res = await pool.query('SELECT id, name, email, phone, is_verified, created_at FROM users ORDER BY created_at DESC');
    
    if (res.rowCount === 0) {
      console.log('📝 No users found in the database.');
    } else {
      console.log('📋 Registered Users List:');
      console.table(res.rows); // Prints a nice table in the console
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fetching users:', err.message);
    process.exit(1);
  }
};

listUsers();
