-- Add localTouchEnabled column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS local_touch_enabled BOOLEAN DEFAULT FALSE;