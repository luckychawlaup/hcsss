import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to send the password reset email
async function sendResetEmail(recipientEmail: string, resetLink: string) {
  const client = new SmtpClient();
  
  // Your Zoho credentials
  const ZOHO_EMAIL = "luckychawlaup@zohomail.in";
  const ZOHO_APP_PASSWORD = "rd7Nu5UqjVH5";

  try {
    // Use connectTLS with port 587 for STARTTLS
    await client.connectTLS({
      hostname: "smtp.zoho.com",
      port: 465,
      username: ZOHO_EMAIL,
      password: ZOHO_APP_PASSWORD,
    });

    await client.send({
      from: `Hilton Convent School <${ZOHO_EMAIL}>`,
      to: recipientEmail,
      subject: "Set Your Password for Hilton Convent School",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to Hilton Convent School</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have been added as an administrator for the Hilton Convent School system. Please use the link below to set your password.</p>
            <p><a href="${resetLink}" class="button">Set Your Password</a></p>
            <p><strong>Important:</strong> This link is valid for one hour only.</p>
            <p>If you did not expect this email or have any questions, please contact the school administration.</p>
            <div class="footer">
              <p>This is an automated email from Hilton Convent School Admin System</p>
              <p>Please do not reply to this email</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await client.close();
    console.log(`Password reset email sent successfully to ${recipientEmail}`);
    return true;
    
  } catch (error) {
    console.error("SMTP Error Details:", {
      message: error.message,
      recipientEmail: recipientEmail,
      hostname: "smtp.zoho.com",
      port: 587
    });
    
    // Always ensure client is closed
    try {
      await client.close();
    } catch (closeError) {
      console.error("Error closing SMTP client:", closeError);
    }
    
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { mode, email, new_password, token, adminData } = await req.json();
    const origin = req.headers.get("origin") || "http://localhost:9002";

    // 1. Admin creation + password reset request
    if (mode === "create_and_request_reset") {
      if (!adminData?.email) {
        throw new Error("adminData.email is required");
      }
      
      const userEmail = adminData.email;

      // Check if user already exists
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      
      const existingUser = users.find(u => u.email === userEmail);
      if (existingUser) {
        throw new Error("An admin with this email already exists.");
      }

      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: crypto.randomUUID(), // Temporary password
        email_confirm: true,
        user_metadata: { 
          full_name: adminData.name, 
          role: adminData.role,
          created_by: "admin_system"
        }
      });

      if (createError) {
        throw new Error(`User creation failed: ${createError.message}`);
      }

      const userId = newUser.user.id;
      
      // Insert admin role data
      const { error: roleError } = await supabaseAdmin
        .from('admin_roles')
        .upsert([{ uid: userId, ...adminData }], { onConflict: 'uid' });
        
      if (roleError) {
        console.error("Failed to create admin role:", roleError);
        // Don't throw here, user is already created
      }

      // Generate reset token
      const resetToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      const { error: tokenError } = await supabaseAdmin
        .from("password_resets")
        .insert([{
          user_id: userId,
          token: resetToken,
          expires_at: expiresAt,
          used: false
        }]);

      if (tokenError) {
        throw new Error(`Failed to create reset token: ${tokenError.message}`);
      }

      const resetLink = `${origin}/auth/update-password?token=${resetToken}`;
      
      // Send email with better error handling
      try {
        await sendResetEmail(userEmail, resetLink);
        
        return new Response(JSON.stringify({
          success: true,
          message: "Admin created successfully and password setup email sent.",
          token: resetToken,
          email: userEmail
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        });
        
      } catch (emailError) {
        // Return success but note email failure
        return new Response(JSON.stringify({
          success: true,
          message: "Admin created successfully, but email failed to send. Please share the reset link manually.",
          token: resetToken,
          email: userEmail,
          resetLink: resetLink,
          emailError: emailError.message
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        });
      }
    }

    // 2. Request a password reset for an existing user
    if (mode === 'request') {
      if (!email) {
        throw new Error("Email is required for password reset request.");
      }
      
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      
      const user = users.find((u) => u.email === email);
      if (!user) {
        throw new Error("User not found with this email address.");
      }

      // Generate reset token
      const resetToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { error: tokenError } = await supabaseAdmin
        .from("password_resets")
        .insert([{
          user_id: user.id,
          token: resetToken,
          expires_at: expiresAt,
          used: false
        }]);

      if (tokenError) {
        throw new Error(`Failed to create reset token: ${tokenError.message}`);
      }

      const resetLink = `${origin}/auth/update-password?token=${resetToken}`;
      
      try {
        await sendResetEmail(email, resetLink);
        
        return new Response(JSON.stringify({
          success: true,
          message: "Password reset email sent successfully.",
          token: resetToken,
          email: email
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        });
        
      } catch (emailError) {
        return new Response(JSON.stringify({
          success: true,
          message: "Reset token generated, but email failed to send. Please share the reset link manually.",
          token: resetToken,
          email: email,
          resetLink: resetLink,
          emailError: emailError.message
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        });
      }
    }

    // 3. Password update using custom token
    if (mode === "reset") {
      if (!token || !new_password) {
        throw new Error("Token and new password are required.");
      }

      if (new_password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      const { data, error } = await supabaseAdmin
        .from("password_resets")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .single();

      if (error || !data) {
        throw new Error("Invalid or expired reset token.");
      }

      if (new Date(data.expires_at) < new Date()) {
        throw new Error("Reset token has expired. Please request a new password reset.");
      }

      // Update user password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user_id,
        { password: new_password }
      );

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      // Mark token as used
      const { error: markUsedError } = await supabaseAdmin
        .from("password_resets")
        .update({ used: true })
        .eq("id", data.id);

      if (markUsedError) {
        console.error("Failed to mark token as used:", markUsedError);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Password updated successfully. You can now log in with your new password."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    throw new Error("Invalid mode specified. Use 'create_and_request_reset', 'request', or 'reset'.");
    
  } catch (error) {
    console.error("Edge function error:", error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || String(error)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });
  }
});
