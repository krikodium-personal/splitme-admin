import "jsr:@std/dotenv/load";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { waiter_id, email, password } = await req.json();
    if (!waiter_id || !email) {
      return new Response(
        JSON.stringify({ error: "waiter_id y email son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "password es requerido (mín. 6 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: waiterRow } = await supabase.from("waiters").select("user_id").eq("id", waiter_id).single();

    if (waiterRow?.user_id) {
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(waiterRow.user_id, { password });
      if (updateAuthError) {
        return new Response(
          JSON.stringify({ error: updateAuthError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { error: updateEmailError } = await supabase.from("waiters").update({ email: email.trim() }).eq("id", waiter_id);
      if (updateEmailError) {
        return new Response(JSON.stringify({ error: updateEmailError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase
      .from("waiters")
      .update({ user_id: authUser.user.id, email: email.trim() })
      .eq("id", waiter_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Usuario creado pero falló al vincular: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
