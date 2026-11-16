-- Convert listing IDs and every constrained foreign key to PostgreSQL UUIDs.
BEGIN;

CREATE TEMP TABLE _listing_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _listing_id_uuid_map (old_id)
SELECT id::text FROM public.listings;

CREATE TEMP TABLE _listing_fk_restore (
  source_schema TEXT NOT NULL,
  source_table TEXT NOT NULL,
  constraint_name TEXT NOT NULL,
  constraint_definition TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO _listing_fk_restore (source_schema, source_table, constraint_name, constraint_definition)
SELECT source_ns.nspname, source.relname, constraint_row.conname,
       pg_get_constraintdef(constraint_row.oid)
FROM pg_constraint AS constraint_row
JOIN pg_class AS source ON source.oid = constraint_row.conrelid
JOIN pg_namespace AS source_ns ON source_ns.oid = source.relnamespace
WHERE constraint_row.contype = 'f'
  AND constraint_row.confrelid = 'public.listings'::regclass;

CREATE TEMP TABLE _listing_fk_columns (
  source_schema TEXT NOT NULL,
  source_table TEXT NOT NULL,
  constraint_name TEXT NOT NULL,
  column_name TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO _listing_fk_columns (source_schema, source_table, constraint_name, column_name)
SELECT source_ns.nspname, source.relname, constraint_row.conname, source_attribute.attname
FROM pg_constraint AS constraint_row
JOIN pg_class AS source ON source.oid = constraint_row.conrelid
JOIN pg_namespace AS source_ns ON source_ns.oid = source.relnamespace
JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY AS source_key(attnum, position) ON true
JOIN LATERAL unnest(constraint_row.confkey) WITH ORDINALITY AS target_key(attnum, position)
  ON target_key.position = source_key.position
JOIN pg_attribute AS source_attribute
  ON source_attribute.attrelid = source.oid AND source_attribute.attnum = source_key.attnum
JOIN pg_attribute AS target_attribute
  ON target_attribute.attrelid = constraint_row.confrelid AND target_attribute.attnum = target_key.attnum
WHERE constraint_row.contype = 'f'
  AND constraint_row.confrelid = 'public.listings'::regclass
  AND target_attribute.attname = 'id';

DO $$
DECLARE
  foreign_key RECORD;
  source_column RECORD;
BEGIN
  FOR foreign_key IN
    SELECT * FROM _listing_fk_restore
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
      foreign_key.source_schema, foreign_key.source_table, foreign_key.constraint_name);

    FOR source_column IN
      SELECT column_name FROM _listing_fk_columns
      WHERE source_schema = foreign_key.source_schema
        AND source_table = foreign_key.source_table
        AND constraint_name = foreign_key.constraint_name
    LOOP
      EXECUTE format(
        'UPDATE %I.%I AS target SET %I = mapping.new_id::text FROM _listing_id_uuid_map AS mapping WHERE target.%I::text = mapping.old_id',
        foreign_key.source_schema, foreign_key.source_table,
        source_column.column_name, source_column.column_name
      );
      EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE UUID USING %I::uuid',
        foreign_key.source_schema, foreign_key.source_table,
        source_column.column_name, source_column.column_name);
    END LOOP;
  END LOOP;
END $$;

UPDATE public.listings AS target
SET id = mapping.new_id::text
FROM _listing_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.listings
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
DECLARE
  foreign_key RECORD;
BEGIN
  FOR foreign_key IN
    SELECT * FROM _listing_fk_restore
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
      foreign_key.source_schema, foreign_key.source_table,
      foreign_key.constraint_name, foreign_key.constraint_definition);
  END LOOP;
END $$;

COMMIT;
