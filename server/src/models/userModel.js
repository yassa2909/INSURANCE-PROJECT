const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const createUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      is_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await pool.query(query);
  console.log('✅ Users table ready');
};

const findUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email ILIKE $1', [email]);
  return result.rows[0] || null;
};

const findUserByPhone = async (phone) => {
  const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return result.rows[0] || null;
};

const findUserById = async (id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const createUser = async ({ name, email, phone, password }) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password, is_verified)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, name, email, phone, is_verified, created_at`,
      [name, email, phone, hashedPassword]
    );
    return result.rows[0];
  } catch (err) {
    console.error('createUser DB error:', err);
    throw err;
  }
};

const markUserAsVerified = async (phone) => {
  const result = await pool.query(
    'UPDATE users SET is_verified = true WHERE phone = $1 RETURNING *',
    [phone]
  );
  return result.rows[0];
};

module.exports = {
  createUsersTable,
  findUserByEmail,
  findUserByPhone,
  findUserById,
  createUser,
  markUserAsVerified,
};
