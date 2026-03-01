import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, payload } = req.body;

  if (!action) {
    return res.status(400).json({ error: "No action provided" });
  }

  try {

  // ================= GET CLAN =================
  if (action === "getClan") {
    const { clan_id } = payload;
    const { data } = await supabase
      .from("clans")
      .select("*")
      .eq("id", clan_id)
      .single();

    return res.json(data);
  }

  // ================= GET MEMBERS =================
  if (action === "getMembers") {
    const { clan_id } = payload;
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("clan_id", clan_id);

    return res.json(data || []);
  }

  // ================= GET CLANS =================
  if (action === "getClans") {
    const { data } = await supabase
      .from("clans")
      .select("id,name");

    return res.json(data || []);
  }

  // ================= UPDATE CLAN =================
  if (action === "updateClan") {
    const { clan_id, name, description } = payload;

    await supabase
      .from("clans")
      .update({ name, description })
      .eq("id", clan_id);

    return res.json({ success: true });
  }

  // ================= UPDATE MEMBER ROLE =================
  if (action === "updateRole") {
    const { user_id, role } = payload;

    await supabase
      .from("users")
      .update({ clan_role: role })
      .eq("id", user_id);

    return res.json({ success: true });
  }

  // ================= KICK MEMBER =================
  if (action === "kickMember") {
    const { user_id } = payload;

    await supabase
      .from("users")
      .update({ clan_id: null, clan_role: null })
      .eq("id", user_id);

    return res.json({ success: true });
  }

  // ================= GET REQUESTS =================
  if (action === "getRequests") {
    const { clan_id } = payload;

    const { data } = await supabase
      .from("clan_requests")
      .select("*")
      .eq("clan_id", clan_id);

    return res.json(data || []);
  }

  // ================= APPROVE REQUEST =================
  if (action === "approveRequest") {
    const { request_id, user_id, clan_id } = payload;

    await supabase
      .from("users")
      .update({ clan_id, clan_role: "Участник" })
      .eq("id", user_id);

    await supabase
      .from("clan_requests")
      .delete()
      .eq("id", request_id);

    return res.json({ success: true });
  }

  // ================= DECLINE REQUEST =================
  if (action === "declineRequest") {
    const { request_id } = payload;

    await supabase
      .from("clan_requests")
      .delete()
      .eq("id", request_id);

    return res.json({ success: true });
  }

  // ================= GET ACTIVE WAR =================
  if (action === "getActiveWar") {
    const { clan_id } = payload;

    const { data } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`)
      .eq("status", "active")
      .maybeSingle();

    return res.json(data || null);
  }

  // ================= DECLARE WAR =================
  if (action === "declareWar") {
    const { attacker_id, defender_id } = payload;

    const now = new Date();
    const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    await supabase.from("clan_wars").insert({
      attacker_id,
      defender_id,
      status: "active",
      started_at: now,
      ends_at: end
    });

    return res.json({ success: true });
  }

  // ================= AUTO FINISH WAR =================
  if (action === "finishWar") {
    const { war_id } = payload;

    await supabase
      .from("clan_wars")
      .update({ status: "finished" })
      .eq("id", war_id);

    return res.json({ success: true });
  }

  return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
