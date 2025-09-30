
// This file is no longer needed as the custom password reset system has been removed.
// The standard Supabase password reset flow is now used for all roles.
export const PASSWORD_RESETS_TABLE_SETUP_SQL = `
-- The password_resets table is no longer used and can be safely deleted from your database.
DROP TABLE IF EXISTS public.password_resets;
`;
