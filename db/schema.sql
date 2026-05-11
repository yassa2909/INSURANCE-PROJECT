-- Run this script in your PostgreSQL database to set up the schema
-- Connect with: psql -U postgres -d otp_auth_db

-- Create database (run separately as superuser if needed)
-- CREATE DATABASE otp_auth_db;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id         UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255)             NOT NULL,
  email      VARCHAR(255)             UNIQUE NOT NULL,
  phone      VARCHAR(20)              UNIQUE NOT NULL,
  is_verified BOOLEAN                 DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- Sample query to verify
-- SELECT * FROM users ORDER BY created_at DESC;
