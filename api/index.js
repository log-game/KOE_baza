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
      return res.status(400).json({ error: "No action provided" });
    }

    // ================= CLANS =================

    if (action === "getClan") {
      const { clan_id } = payload;

      const { data, error } = await supabase
        .from("clans")
        .select("*")
        .eq("id", clan_id)
        .maybeSingle();

      if (error) return res.json({ error: error.message });
      return res.json(data);
    }

    if (action === "getAllClans") {
      const { data, error } = await supabase
        .from("clans")
        .select("*");

      if (error) return res.json({ error: error.message });
      return res.json(data || []);
    }

    // ================= MEMBERS =================

    if (action === "getMembers") {
      const { clan_id } = payload;

      const { data, error } = await supabase
        .from("users")
        .select("id,name,clan_role")
        .eq("clan_id", clan_id);

      if (error) return res.json({ error: error.message });
      return res.json(data || []);
    }

    // ================= REQUESTS =================

    if (action === "getRequests") {
      const { clan_id } = payload;

      const { data, error } = await supabase
        .from("clan_requests")
        .select("*")
        .eq("clan_id", clan_id);

      if (error) return res.json({ error: error.message });
      return res.json(data || []);
    }

    // ================= GET WARS =================

    if (action === "getClanWars") {

      const { clan_id } = payload;

      const { data, error } = await supabase
        .from("clan_wars")
        .select("*")
        .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`)
        .order("created_at", { ascending: false });

      if (error) return res.json({ error: error.message });
      return res.json(data || []);
    }

    // ================= DECLARE WAR =================

    if (action === "declareWar") {

      const { attacker_id, defender_id } = payload;

      if (!attacker_id || !defender_id) {
        return res.json({ error: "attacker_id or defender_id missing" });
      }

      if (attacker_id === defender_id) {
        return res.json({ error: "Cannot attack yourself" });
      }

      const now = new Date();
      const ends = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const cooldown = new Date(ends.getTime() + 12 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("clan_wars")
        .insert([{
          attacker_id: attacker_id,
          defender_id: defender_id,
          ends_at: ends.toISOString(),
          cooldown_until: cooldown.toISOString()
        }])
        .select();

      if (error) {
        console.error("WAR INSERT ERROR:", error);
        return res.json({ error: error.message });
      }

      return res.json({ success: true, war: data });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    console.error("SERVER CRASH:", err);
    return res.status(500).json({ error: err.message });
  }
}
