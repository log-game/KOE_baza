import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST" });
  }

  const { action, payload } = req.body || {};

  try {

    // ============================
    // USER
    // ============================

    if (action === "getUser") {

      const { user_id } = payload;

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id);

      return res.json(data && data.length ? data[0] : null);
    }

    if (action === "updateProfile") {

      const { user_id, name, description } = payload;

      await supabase
        .from("users")
        .update({ name, description })
        .eq("id", user_id);

      return res.json({ success: true });
    }

    // ============================
    // CLANS
    // ============================

    if (action === "getAllClans") {

      const { data } = await supabase
        .from("clans")
        .select("id,name");

      return res.json(data || []);
    }

    if (action === "getClan") {

      const { clan_id } = payload;

      const { data } = await supabase
        .from("clans")
        .select("*")
        .eq("id", clan_id);

      return res.json(data && data.length ? data[0] : null);
    }

    if (action === "getMembers") {

      const { clan_id } = payload;

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("clan_id", clan_id);

      return res.json(data || []);
    }

    // ============================
    // ЗАЯВКИ В КЛАН
    // ============================

    if (action === "applyClan") {

      const { user_id, clan_id } = payload;

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id);

      const user = userData && userData.length ? userData[0] : null;

      if (!user) {
        return res.json({ error: "Пользователь не найден" });
      }

      if (user.clan_id) {
        return res.json({ error: "Вы уже в клане" });
      }

      await supabase
        .from("clan_requests")
        .insert([{ user_id, clan_id }]);

      return res.json({ success: true });
    }

    if (action === "getClanRequests") {

      const { clan_id } = payload;

      const { data } = await supabase
        .from("clan_requests")
        .select("*")
        .eq("clan_id", clan_id);

      return res.json(data || []);
    }

    if (action === "acceptRequest") {

      const { request_id } = payload;

      const { data } = await supabase
        .from("clan_requests")
        .select("*")
        .eq("id", request_id);

      const request = data && data.length ? data[0] : null;

      if (!request) {
        return res.json({ error: "Заявка не найдена" });
      }

      await supabase
        .from("users")
        .update({
          clan_id: request.clan_id,
          clan_role: "Участник"
        })
        .eq("id", request.user_id);

      await supabase
        .from("clan_requests")
        .delete()
        .eq("id", request_id);

      return res.json({ success: true });
    }

    if (action === "rejectRequest") {

      const { request_id } = payload;

      await supabase
        .from("clan_requests")
        .delete()
        .eq("id", request_id);

      return res.json({ success: true });
    }

    // ============================
    // ВЫХОД ИЗ КЛАНА
    // ============================

    if (action === "leaveClan") {

      const { user_id } = payload;

      await supabase
        .from("users")
        .update({
          clan_id: null,
          clan_role: null
        })
        .eq("id", user_id);

      return res.json({ success: true });
    }

    // ============================
    // УПРАВЛЕНИЕ УЧАСТНИКАМИ
    // ============================

    if (action === "kickMember") {

      const { target_user_id } = payload;

      await supabase
        .from("users")
        .update({
          clan_id: null,
          clan_role: null
        })
        .eq("id", target_user_id);

      return res.json({ success: true });
    }

    if (action === "changeRole") {

      const { target_user_id, new_role } = payload;

      await supabase
        .from("users")
        .update({
          clan_role: new_role
        })
        .eq("id", target_user_id);

      return res.json({ success: true });
    }

    // ============================
    // УДАЛЕНИЕ КЛАНА
    // ============================

    if (action === "deleteClan") {

      const { clan_id } = payload;

      await supabase
        .from("users")
        .update({
          clan_id: null,
          clan_role: null
        })
        .eq("clan_id", clan_id);

      await supabase
        .from("clan_requests")
        .delete()
        .eq("clan_id", clan_id);

      await supabase
        .from("clans")
        .delete()
        .eq("id", clan_id);

      return res.json({ success: true });
    }

    return res.json({ error: "Unknown action" });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
