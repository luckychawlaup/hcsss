import { createClient } from "./client";

export const getRedirectUrl = () => {
    let url =
      process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
      process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
      'http://localhost:9002'
    // Make sure to include `https` in production URLs.
    url = url.includes('http') ? url : `https://${url}`
    // Make sure to include a trailing `/`.
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`
    url = `${url}auth/callback`
    return url
}


export const registerTeacher = async (email: string, fullName: string, key: string) => {
    const supabase = createClient();
    
    // Server-side validation of the registration key
    const { data: teacher, error: keyError } = await supabase
        .from('teachers')
        .select('id, email, auth_uid')
        .eq('id', key)
        .eq('email', email)
        .single();

    if (keyError || !teacher) {
        throw new Error("Invalid registration key or email. Please check your details and try again.");
    }

    if (teacher.auth_uid) {
        throw new Error("This registration key has already been used. Please contact administration if you believe this is an error.");
    }
    
    // We don't sign up a new user here. We just direct them to set a password
    // for the account that was already created for them.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl()
    });

    if (resetError) {
        throw new Error(`Could not initiate password setup: ${resetError.message}`);
    }

    return { message: "Password setup email sent. Please check your inbox." };
};
