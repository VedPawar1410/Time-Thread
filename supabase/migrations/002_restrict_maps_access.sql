-- Only the backend may touch maps. It connects with the secret key, which
-- bypasses Row Level Security. RLS stays on with no policies, so the public
-- publishable key can no longer read or change anything.

DROP POLICY IF EXISTS "Allow public access to maps" ON public.maps;

REVOKE ALL ON public.maps FROM anon;
REVOKE ALL ON public.maps FROM authenticated;
