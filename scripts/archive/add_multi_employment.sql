-- Migration: Add Multi-Employment Support
-- Created: 2025-01-09
-- Description: Adds Employment table and related fields for multi-restaurant support

-- Step 1: Add new columns to existing tables
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tip_points INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS seniority INT DEFAULT 0;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS company_fiscal_code VARCHAR(16) UNIQUE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'REGISTERED',
  ADD COLUMN IF NOT EXISTS owner_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(50);

-- Step 2: Create Employment table
CREATE TABLE IF NOT EXISTS employments (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'PENDING',
  role VARCHAR(50) DEFAULT 'DIPENDENTE',
  department VARCHAR(100),
  requested_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(50),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employments_user ON employments(user_id);
CREATE INDEX IF NOT EXISTS idx_employments_restaurant ON employments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_employments_status ON employments(status);
CREATE INDEX IF NOT EXISTS idx_employments_active ON employments(status) WHERE status = 'ACTIVE';

-- Step 4: Add comments for documentation
COMMENT ON TABLE employments IS 'Manages user employment relationships with restaurants';
COMMENT ON COLUMN employments.status IS 'Employment status: PENDING, APPROVED, ACTIVE, REJECTED, TERMINATED';
COMMENT ON COLUMN employments.role IS 'User role in this specific restaurant';
