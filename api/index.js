import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { action, payload } = req.body || {};

  try {

    if (!action) {
      return res.status(400).json({ error: "No action" });
    }

    // ================= CLANS =================

    if (action === "getClan") {
      const { clan_id } = payload;
      const { data } = await supabase
        .from("clans")
        .select("*")
        .eq("id", clan_id)
        .maybeSingle();
      return res.json(data);
    }

    if (action === "getAllClans") {
      const { data } = await supabase
        .from("clans")
        .select("*");
      return res.json(data || []);
    }

    if (action === "updateClanInfo") {
      const { clan_id, name, description } = payload;
      await supabase.from("clans")
        .update({ name, description })
        .eq("id", clan_id);
      return res.json({ success: true });
    }

    // ================= MEMBERS =================

    if (action === "getMembers") {
      const { clan_id } = payload;
      const { data } = await supabase
        .from("users")
        .select("id,name,clan_role")
        .eq("clan_id", clan_id);
      return res.json(data || []);
    }

    if (action === "changeRole") {
      const { target_user_id, new_role } = payload;

      await supabase
        .from("users")
        .update({ clan_role: new_role })
        .eq("id", target_user_id);

      return res.json({ success: true });
    }

    if (action === "kickMember") {
      const { target_user_id } = payload;

      await supabase
        .from("users")
        .update({ clan_id: null, clan_role: null })
        .eq("id", target_user_id);

      return res.json({ success: true });
    }

    // ================= REQUESTS =================

    if (action === "getRequests") {
      const { clan_id } = payload;

      const { data } = await supabase
        .from("clan_requests")
        .select("*")
        .eq("clan_id", clan_id);

      return res.json(data || []);
    }

    if (action === "acceptRequest") {
      const { user_id, clan_id } = payload;

      await supabase
        .from("users")
        .update({ clan_id, clan_role: "Участник" })
        .eq("id", user_id);

      await supabase
        .from("clan_requests")
        .delete()
        .eq("user_id", user_id);

      return res.json({ success: true });
    }

    if (action === "rejectRequest") {
      const { user_id } = payload;

      await supabase
        .from("clan_requests")
        .delete()
        .eq("user_id", user_id);

      return res.json({ success: true });
    }

    // ================= CLAN WARS =================

    if (action === "getClanWars") {

      const { clan_id } = payload;

      const { data } = await supabase
        .from("clan_wars")
        .select("*")
        .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`)
        .order("created_at", { ascending: false });

      return res.json(data || []);
    }

    if (action === "declareWar") {

      const { attacker_id, defender_id } = payload;

      if (!attacker_id || !defender_id) {
        return res.json({ error: "Нет ID" });
      }

      if (attacker_id === defender_id) {
        return res.json({ error: "Нельзя самому себе" });
      }

      const now = new Date();
      const ends = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const cooldown = new Date(ends.getTime() + 12 * 60 * 60 * 1000);

      await supabase.from("clan_wars").insert([{
        attacker_id,
        defender_id,
        created_at: now.toISOString(),
        ends_at: ends.toISOString(),
        cooldown_unti: cooldown.toISOString()
      }]);

      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
