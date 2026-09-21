select jsonb_build_object(
  'tables', (
    select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
    from information_schema.tables
    where table_schema = 'public' and table_name like 'askreview%'
  ),
  'columns', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', table_name,
      'column', column_name,
      'type', data_type,
      'nullable', is_nullable
    ) order by table_name, ordinal_position), '[]'::jsonb)
    from information_schema.columns
    where table_schema = 'public' and table_name like 'askreview%'
  ),
  'constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', table_name,
      'name', constraint_name,
      'type', constraint_type
    ) order by table_name, constraint_name), '[]'::jsonb)
    from information_schema.table_constraints
    where table_schema = 'public' and table_name like 'askreview%'
  ),
  'indexes', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename,
      'name', indexname
    ) order by tablename, indexname), '[]'::jsonb)
    from pg_indexes
    where schemaname = 'public' and tablename like 'askreview%'
  ),
  'rls', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', relname,
      'rls', relrowsecurity
    ) order by relname), '[]'::jsonb)
    from pg_class
    where relname like 'askreview%' and relkind = 'r'
  ),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename,
      'name', policyname,
      'cmd', cmd
    ) order by tablename, policyname), '[]'::jsonb)
    from pg_policies
    where tablename like 'askreview%'
  ),
  'occupancynpv_customers_present', (
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'occupancynpv_customers'
    )
  )
) as readback;
