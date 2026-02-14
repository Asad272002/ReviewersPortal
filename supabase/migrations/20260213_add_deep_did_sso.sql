-- Add deep_did column to user tables to support DEEP-SSO

-- 1. Add deep_did to partners table
ALTER TABLE partners 
ADD COLUMN deep_did TEXT UNIQUE;

-- 2. Add deep_did to awarded_team table
ALTER TABLE awarded_team 
ADD COLUMN deep_did TEXT UNIQUE;

-- 3. Add deep_did to user_app table
ALTER TABLE user_app 
ADD COLUMN deep_did TEXT UNIQUE;

-- Create an index for faster lookups
CREATE INDEX idx_partners_deep_did ON partners(deep_did);
CREATE INDEX idx_awarded_team_deep_did ON awarded_team(deep_did);
CREATE INDEX idx_user_app_deep_did ON user_app(deep_did);
