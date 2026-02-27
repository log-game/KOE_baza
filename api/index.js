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

  const { action, payload } = req.body;

  try {

  // =========================
  // USERS
  // =========================

  if (action === "getUser") {
    const { user_id } = payload;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .single();

    if (error) throw error;
    return res.json(data);
  }

  if (action === "updateUser") {
    const { user_id, updates } = payload;

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user_id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  }

  if (action === "getMembers") {
    const { clan_id } = payload;

    const { data, error } = await supabase
      .from("users")
      .select("id,name,cups,concepts,clan_role")
      .eq("clan_id", clan_id);

    if (error) throw error;
    return res.json(data || []);
  }

  if (action === "joinClan") {
    const { user_id, clan_id } = payload;

    const { error } = await supabase
      .from("users")
      .update({ clan_id, clan_role: "Участник" })
      .eq("id", user_id);

    if (error) throw error;

    await supabase.from("clan_news").insert([{
      clan_id,
      text: "Новый участник вступил в клан",
      type: "system"
    }]);

    return res.json({ success: true });
  }

  if (action === "leaveClan") {
    const { user_id } = payload;

    const { data:user } = await supabase
      .from("users")
      .select("clan_id")
      .eq("id", user_id)
      .single();

    await supabase
      .from("users")
      .update({ clan_id: null, clan_role: null })
      .eq("id", user_id);

    return res.json({ success: true });
  }

  // =========================
  // ROLE MANAGEMENT
  // =========================

  if (action === "changeRole") {
    const { current_user_id, target_user_id, new_role } = payload;

    const { data:current } = await supabase
      .from("users")
      .select("clan_role,clan_id")
      .eq("id", current_user_id)
      .single();

    if (!current || current.clan_role !== "Глава")
      return res.status(403).json({ error: "Нет прав" });

    await supabase
      .from("users")
      .update({ clan_role: new_role })
      .eq("id", target_user_id);

    return res.json({ success: true });
  }

  if (action === "kickMember") {
    const { current_user_id, target_user_id } = payload;

    const { data:current } = await supabase
      .from("users")
      .select("clan_role")
      .eq("id", current_user_id)
      .single();

    if (!current || current.clan_role !== "Глава")
      return res.status(403).json({ error: "Нет прав" });

    await supabase
      .from("users")
      .update({ clan_id: null, clan_role: null })
      .eq("id", target_user_id);

    return res.json({ success: true });
  }

  // =========================
  // CLANS
  // =========================

  if (action === "getClan") {
    const { clan_id } = payload;

    const { data, error } = await supabase
      .from("clans")
      .select("*")
      .eq("id", clan_id)
      .single();

    if (error) throw error;
    return res.json(data);
  }

  if (action === "createClan") {
    const { name, description, user_id } = payload;

    const { data:clan } = await supabase
      .from("clans")
      .insert([{
        name,
        description,
        points: 0,
        concepts: 0
      }])
      .select()
      .single();

    await supabase
      .from("users")
      .update({
        clan_id: clan.id,
        clan_role: "Глава"
      })
      .eq("id", user_id);

    return res.json(clan);
  }

  // =========================
  // NEWS
  // =========================

  if (action === "getNews") {
    const { clan_id } = payload;

    const { data, error } = await supabase
      .from("clan_news")
      .select("*")
      .eq("clan_id", clan_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data || []);
  }

  if (action === "addNews") {
    const { clan_id, text, type } = payload;

    await supabase.from("clan_news").insert([{
      clan_id,
      text,
      type: type || "default"
    }]);

    return res.json({ success: true });
  }

  // =========================
  // WAR SYSTEM
  // =========================

  if (action === "declareWar") {
    const { clan1_id, clan2_id } = payload;

    const now = new Date();
    const ends = new Date(now.getTime() + 48*60*60*1000);

    const { data:war } = await supabase
      .from("clan_wars")
      .insert([{
        clan1_id,
        clan2_id,
        phase: "submission",
        started_at: now,
        ends_at: ends
      }])
      .select()
      .single();

    await supabase.from("clan_news").insert([
      {
        clan_id: clan1_id,
        text: "🔥 Вы объявили войну другому клану",
        type: "war"
      },
      {
        clan_id: clan2_id,
        text: "⚔ Вам объявлена война!",
        type: "war"
      }
    ]);

    return res.json(war);
  }

  if (action === "getCurrentWar") {
    const { clan_id } = payload;

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
    if (hours >= 48) phase = "finished";

    if (phase === "finished") {
      await supabase.from("clan_wars").delete().eq("id", data.id);
      return res.json(null);
    }

    if (phase !== data.phase) {
      await supabase.from("clan_wars")
        .update({ phase })
        .eq("id", data.id);
      data.phase = phase;
    }

    return res.json(data);
  }

  // =========================

  return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
