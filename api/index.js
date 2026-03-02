import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, payload } = req.body;

  /* ===============================
     1️⃣ ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЯ
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

    // Если clan_id пустой
    if (!user.clan_id) {
      return res.json({
        ...user,
        clan_exists: false,
        is_leader: false
      });
    }

    // Проверяем существует ли клан
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
     2️⃣ ПОЛУЧИТЬ КЛАН
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
     3️⃣ УЧАСТНИКИ
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
     4️⃣ СМЕНА РОЛИ
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
     5️⃣ ВЫГНАТЬ
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
     6️⃣ ОБНОВИТЬ НАСТРОЙКИ КЛАНА
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
     7️⃣ ВСЕ КЛАНЫ
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
