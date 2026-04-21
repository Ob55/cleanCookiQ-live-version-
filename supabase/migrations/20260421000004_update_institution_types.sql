-- Set the 2nd and 3rd registered institutions to hospital and prison (correctional)
DO $$
DECLARE
  inst_ids uuid[];
BEGIN
  SELECT array_agg(id ORDER BY created_at) INTO inst_ids FROM institutions;
  IF array_length(inst_ids, 1) >= 2 THEN
    UPDATE institutions SET institution_type = 'hospital' WHERE id = inst_ids[2];
  END IF;
  IF array_length(inst_ids, 1) >= 3 THEN
    UPDATE institutions SET institution_type = 'prison' WHERE id = inst_ids[3];
  END IF;
END $$;
