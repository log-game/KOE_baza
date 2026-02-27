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
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { action, payload } = req.body || {};

  try {

  // ================= USERS =================

  if (action === "getUser") {
    const { user_id } = payload || {};
    if (!user_id) return res.json(null);

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .maybeSingle();

    return res.json(data || null);
  }

  if (action === "updateUser") {
    const { user_id, name, description } = payload || {};

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const { data } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user_id)
      .select()
      .maybeSingle();

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

    const { data } = await supabase
      .from("clans")
      .select("*")
      .eq("id", clan_id)
      .maybeSingle();

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

  if (action === "updateClan") {
    const { clan_id, name, description } = payload || {};

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const { data } = await supabase
      .from("clans")
      .update(updates)
      .eq("id", clan_id)
      .select()
      .maybeSingle();

    return res.json(data || null);
  }

  // ================= NEWS =================

  if (action === "getNews") {
    const { clan_id } = payload || {};
    if (!clan_id) return res.json([]);

    const { data } = await supabase
      .from("clan_news")
      .select("*")
      .eq("clan_id", clan_id)
      .order("created_at", { ascending: false });

    return res.json(data || []);
  }

  // ================= WAR SYSTEM =================

  if (action === "declareWar") {

    const { clan1_id, clan2_id } = payload || {};
    if (!clan1_id || !clan2_id)
      return res.json({ error: "Missing clan id" });

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

  if (action === "getCurrentWar") {

    const { clan_id } = payload || {};
    if (!clan_id) return res.json(null);

    const { data } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`clan1_id.eq.${clan_id},clan2_id.eq.${clan_id}`)
      .maybeSingle();

    if (!data) return res.json(null);

    const now = new Date();
    const start = new Date(data.started_at);
    const hours = (now - start) / 1000 / 60 / 60;

    let phase = "submission";
    if (hours >= 24 && hours < 36) phase = "voting";
    if (hours >= 36 && hours < 48) phase = "cooldown";
    if (hours >= 48) {
      await supabase.from("clan_wars").delete().eq("id", data.id);
      return res.json(null);
    }

    if (phase !== data.phase) {
      await supabase
        .from("clan_wars")
        .update({ phase })
        .eq("id", data.id);
      data.phase = phase;
    }

    return res.json(data);
  }

  return res.json({ error: "Unknown action" });

  } catch (err) {
    console.error(err);
    return res.json(null);
  }
}
