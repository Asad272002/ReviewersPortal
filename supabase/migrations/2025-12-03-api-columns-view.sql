-- Expose table/column metadata through a public view for PostgREST
create or replace view public.api_columns as
select
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale
from information_schema.columns c
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;

-- Optional: expose tables list via a view
create or replace view public.api_tables as
select
  t.table_name,
  t.table_type
from information_schema.tables t
where t.table_schema = 'public'
order by t.table_name;
