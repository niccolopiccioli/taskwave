DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  LOOP
    EXECUTE format('GRANT INSERT, SELECT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END
$$;
