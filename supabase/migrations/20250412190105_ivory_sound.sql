/*
  # Add soft delete functionality for campaigns

  1. Changes
    - Add function to remove user association from campaigns
    - Add function to handle batch removal of user association
    - Add RPC for soft delete operation
*/

-- Function to remove user association from a campaign
CREATE OR REPLACE FUNCTION remove_campaign_user_association(campaign_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaigns
  SET 
    "userId" = NULL,
    userid = NULL
  WHERE id = campaign_id;
END;
$$;

-- Function to handle batch removal of user association
CREATE OR REPLACE FUNCTION remove_campaign_user_association_batch(
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
  WITH updated_rows AS (
    UPDATE campaigns
    SET 
      "userId" = NULL,
      userid = NULL
    WHERE id = p_campaign_id
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated_rows;
  
  RETURN v_count;
END;
$$;