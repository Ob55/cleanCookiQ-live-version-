-- Must be its own transaction: Postgres rejects ADD VALUE inside a block
-- that later uses the new value.
ALTER TYPE institution_type ADD VALUE IF NOT EXISTS 'faith_based';
