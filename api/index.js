import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY // ← ВАЖНО
);

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { action, payload } = req.body || {};

  try {

    // ================= USERS =================

    if (action === "getUser") {
      const { user_id } = payload || {};
      if (!user_id) return res.json(null);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id)
        .maybeSingle();

      if (error) {
        console.error(error);
        return res.json(null);
      }

      return res.json(data || null);
    }

    if (action === "updateUser") {
      const { user_id, name, description } = payload || {};

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user_id)
        .select()
        .maybeSingle();

      if (error) console.error(error);

      return res.json(data || null);
    }

    if (action === "leaveClan") {
      const { user_id } = payload || {};

      await supabase
        .from("users")
        .update({ clan_id: null, clan_role: null })
        .eq("id", user_id);

      return res.json({ success: true });
    }

    // ================= CLANS =================

    if (action === "getClan") {
      const { clan_id } = payload || {};
      if (!clan_id) return res.json(null);

      const { data, error } = await supabase
        .from("clans")
        .select("*")
        .eq("id", clan_id)
        .maybeSingle();

      if (error) console.error(error);

      return res.json(data || null);
    }

    if (action === "getMembers") {
      const { clan_id } = payload || {};
      if (!clan_id) return res.json([]);

      const { data } = await supabase
        .from("users")
        .select("id,name,cups,concepts,clan_role")
        .eq("clan_id", clan_id);

      return res.json(data || []);
    }

    if (action === "getClanRequests") {
      const { clan_id } = payload || {};
      if (!clan_id) return res.json([]);

      const { data } = await supabase
        .from("clan_requests")
        .select("*")
        .eq("clan_id", clan_id);

      return res.json(data || []);
    }

    if (action === "acceptRequest") {
      const { request_id } = payload || {};

      const { data } = await supabase
        .from("clan_requests")
        .select("*")
        .eq("id", request_id)
        .maybeSingle();

      if (!data) return res.json({ error: "No request" });

      await supabase
        .from("users")
        .update({
          clan_id: data.clan_id,
          clan_role: "Участник"
        })
        .eq("id", data.user_id);

      await supabase
        .from("clan_requests")
        .delete()
        .eq("id", request_id);

      return res.json({ success: true });
    }

    if (action === "rejectRequest") {
      const { request_id } = payload || {};

      await supabase
        .from("clan_requests")
        .delete()
        .eq("id", request_id);

      return res.json({ success: true });
    }

    // ================= WAR =================

    if (action === "getCurrentWar") {
      const { clan_id } = payload || {};
      if (!clan_id) return res.json(null);

      const { data } = await supabase
        .from("clan_wars")
        .select("*")
        .or(`clan1_id.eq.${clan_id},clan2_id.eq.${clan_id}`)
        .maybeSingle();

      return res.json(data || null);
    }

    if (action === "declareWar") {
      const { clan1_id, clan2_id } = payload || {};
      if (!clan1_id || !clan2_id)
        return res.json({ error: "Missing id" });

      const now = new Date();
      const ends = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const { data } = await supabase
        .from("clan_wars")
        .insert([{
          clan1_id,
          clan2_id,
          phase: "submission",
          started_at: now,
          ends_at: ends
        }])
        .select()
        .maybeSingle();

      return res.json(data || null);
    }

    return res.json({ error: "Unknown action" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server crash" });
  }
}
