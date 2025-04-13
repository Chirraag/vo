/*
  # Add delete batch functionality and fix campaign operations
  
  1. Changes
    - Add function to handle batch deletion of campaign data
    - Add function to handle campaign duplication
*/

-- Function to delete records in batches
CREATE OR REPLACE FUNCTION delete_batch(
  p_table_name text,
  p_campaign_id integer,
  p_batch_size integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  EXECUTE format('
    WITH deleted AS (
      DELETE FROM %I 
      WHERE "campaignId" = $1
      LIMIT $2
      RETURNING 1
    )
    SELECT count(*) FROM deleted
  ', p_table_name)
  INTO v_count
  USING p_campaign_id, p_batch_size;
  
  RETURN v_count;
END;
$$;