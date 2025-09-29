
export const PASSWORD_RESETS_TABLE_SETUP_SQL = `
-- Create a table to store password reset tokens
CREATE TABLE IF NOT EXISTS public.password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to be safe
DROP POLICY IF EXISTS "Allow function to manage tokens" ON public.password_resets;

-- Policy: Allow service_role (from edge functions) to do everything
CREATE POLICY "Allow function to manage tokens"
ON public.password_resets FOR ALL
USING (true)
WITH CHECK (true);
`;
