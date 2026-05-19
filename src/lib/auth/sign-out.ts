import { createClient } from "@/lib/supabase/client";

/** Sign out via Supabase and hard-navigate (clears client session state). */
export async function signOutAndRedirect(redirectTo = "/login"): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.auth.signOut();
  } catch {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  }
  window.location.href = redirectTo;
}
