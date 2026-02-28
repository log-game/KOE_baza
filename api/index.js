import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const body = req.body || {};
  const action = body.action;
  const payload = body.payload || {};

  try {

    // ================= USER =================

    if (action === "getUser") {

      const { user_id } = payload;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id);

      if (error) return res.json(null);
      return res.json(data?.[0] || null);
    }

    if (action === "updateProfile") {

      const { user_id, name, description } = payload;

      await supabase
        .from("users")
        .update({ name, description })
        .eq("id", user_id);

      return res.json({ success: true });
    }

    // ================= CLANS =================

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

      return res.json(data?.[0] || null);
    }

    if (action === "getMembers") {

      const { clan_id } = payload;

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("clan_id", clan_id);

      return res.json(data || []);
    }

    // ================= REQUESTS =================

    if (action === "applyClan") {

      const { user_id, clan_id } = payload;

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id);

      const user = data?.[0];

      if (!user) return res.json({ error: "Нет пользователя" });
      if (user.clan_id) return res.json({ error: "Уже в клане" });

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

      const request = data?.[0];
      if (!request) return res.json({ error: "Нет заявки" });

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

    // ================= LEAVE =================

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

    // ================= MANAGEMENT =================

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
        .update({ clan_role: new_role })
        .eq("id", target_user_id);

      return res.json({ success: true });
    }

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

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
