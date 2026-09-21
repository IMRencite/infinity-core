select jsonb_build_object(
  'indexes', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename,
      'name', indexname,
      'def', indexdef
    ) order by tablename, indexname), '[]'::jsonb)
    from pg_indexes
    where schemaname = 'public'
      and tablename in (
        'communication_obligations',
        'communication_outbound_ownership',
        'communication_outbound_ledger',
        'communication_outbound_attempts',
        'communication_shadow_attempts'
      )
  ),
  'constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', table_name,
      'name', constraint_name,
      'type', constraint_type
    ) order by table_name, constraint_name), '[]'::jsonb)
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name in (
        'communication_obligations',
        'communication_outbound_ownership',
        'communication_outbound_ledger',
        'communication_outbound_attempts',
        'communication_shadow_attempts'
      )
  )
);
