import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {

  /* =========================
     🔥 CORS (ОБЯЗАТЕЛЬНО)
  ========================== */

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, payload } = req.body;

  /* ===============================
     GET USER + ПРОВЕРКА КЛАНА
  =============================== */

  if (action === "getUser") {
    const { user_id } = payload;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .maybeSingle();

    if (error) return res.json({ error: error.message });
    if (!user) return res.json({ error: "Игрок не найден" });

    if (!user.clan_id) {
      return res.json({
        ...user,
        clan_exists: false,
        is_leader: false
      });
    }

    const { data: clan } = await supabase
      .from("clans")
      .select("id")
      .eq("id", user.clan_id)
      .maybeSingle();

    if (!clan) {
      return res.json({
        ...user,
        clan_exists: false,
        is_leader: false
      });
    }

    return res.json({
      ...user,
      clan_exists: true,
      is_leader: user.clan_role === "Глава"
    });
  }

  /* ===============================
     GET CLAN
  =============================== */

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

  /* ===============================
     GET MEMBERS
  =============================== */

  if (action === "getMembers") {
    const { clan_id } = payload;

    const { data, error } = await supabase
      .from("users")
      .select("id,name,clan_role")
      .eq("clan_id", clan_id);

    if (error) return res.json({ error: error.message });
    return res.json(data);
  }

  /* ===============================
     CHANGE ROLE
  =============================== */

  if (action === "changeRole") {
    const { target_user_id, new_role } = payload;

    const { error } = await supabase
      .from("users")
      .update({ clan_role: new_role })
      .eq("id", target_user_id);

    if (error) return res.json({ error: error.message });
    return res.json({ success: true });
  }

  /* ===============================
     KICK MEMBER
  =============================== */

  if (action === "kickMember") {
    const { target_user_id } = payload;

    const { error } = await supabase
      .from("users")
      .update({
        clan_id: null,
        clan_role: "Участник"
      })
      .eq("id", target_user_id);

    if (error) return res.json({ error: error.message });
    return res.json({ success: true });
  }

  /* ===============================
     UPDATE CLAN SETTINGS
  =============================== */

  if (action === "updateClanSettings") {
    const { clan_id, name, description, goal, custom_goal } = payload;

    const { error } = await supabase
      .from("clans")
      .update({
        name,
        description,
        goal,
        custom_goal
      })
      .eq("id", clan_id);

    if (error) return res.json({ error: error.message });
    return res.json({ success: true });
  }

  /* ===============================
     GET ALL CLANS
  =============================== */

  if (action === "getAllClans") {
    const { data, error } = await supabase
      .from("clans")
      .select("*");

    if (error) return res.json({ error: error.message });
    return res.json(data);
  }

  return res.json({ error: "Unknown action" });
}
