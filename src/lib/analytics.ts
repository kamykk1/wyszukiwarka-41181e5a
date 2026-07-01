import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "nsz_analytics_session";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function trackEvent(
  event_name: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id ?? null;
    await supabase.from("analytics_events").insert({
      event_name,
      payload,
      user_id,
      session_id: getSessionId(),
    });
  } catch (err) {
    // Fail silently — analytics never break the app
    console.debug("[analytics] failed", event_name, err);
  }
}
