/*
  # Enable real-time for campaign management tables
  
  1. Changes
    - Enable real-time for campaigns table
    - Enable real-time for call_logs table  
    - Enable real-time for user_dialing_credits table
*/

ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE user_dialing_credits;

-- Enable real-time for specific columns
ALTER TABLE campaigns REPLICA IDENTITY FULL;
ALTER TABLE call_logs REPLICA IDENTITY FULL;
ALTER TABLE user_dialing_credits REPLICA IDENTITY FULL;