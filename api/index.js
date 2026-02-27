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

  const { action, payload } = req.body;

  try {

    // ===== USER =====

    if (action === "getUser") {
      const { user_id } = payload;
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id)
        .single();
      return res.json(data);
    }

    if (action === "updateProfile") {
      const { user_id, name, description } = payload;
      await supabase
        .from("users")
        .update({ name, description })
        .eq("id", user_id);
      return res.json({ success: true });
    }

    if (action === "leaveClan") {
      const { user_id } = payload;

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id)
        .single();

      if (user.clan_role === "Глава") {
        const { data: co } = await supabase
          .from("users")
          .select("*")
          .eq("clan_id", user.clan_id)
          .eq("clan_role", "Со-глава")
          .limit(1);

        if (co && co.length > 0) {
          await supabase
            .from("users")
            .update({ clan_role: "Глава" })
            .eq("id", co[0].id);
        }
      }

      await supabase
        .from("users")
        .update({ clan_id: null, clan_role: null })
        .eq("id", user_id);

      return res.json({ success: true });
    }

    // ===== CLAN =====

    if (action === "getClan") {
      const { clan_id } = payload;
      const { data } = await supabase
        .from("clans")
        .select("*")
        .eq("id", clan_id)
        .single();
      return res.json(data);
    }

    if (action === "updateClanInfo") {
      const { clan_id, name, description } = payload;

      await supabase
        .from("clans")
        .update({ name, description })
        .eq("id", clan_id);

      return res.json({ success: true });
    }

    if (action === "updateGoal") {
      const { clan_id, goal } = payload;

      await supabase
        .from("clans")
        .update({ goal })
        .eq("id", clan_id);

      return res.json({ success: true });
    }

    if (action === "deleteClan") {
      const { clan_id } = payload;

      await supabase.from("users")
        .update({ clan_id: null, clan_role: null })
        .eq("clan_id", clan_id);

      await supabase.from("clan_requests")
        .delete()
        .eq("clan_id", clan_id);

      await supabase.from("clan_news")
        .delete()
        .eq("clan_id", clan_id);

      await supabase.from("clans")
        .delete()
        .eq("id", clan_id);

      return res.json({ success: true });
    }

    // ===== MEMBERS =====

    if (action === "getMembers") {
      const { clan_id } = payload;

      const { data } = await supabase
        .from("users")
        .select("id,name,clan_role")
        .eq("clan_id", clan_id);

      return res.json(data);
    }

    if (action === "kickMember") {
      const { user_id } = payload;

      await supabase
        .from("users")
        .update({ clan_id: null, clan_role: null })
        .eq("id", user_id);

      return res.json({ success: true });
    }

    if (action === "transferClan") {
      const { clan_id, new_owner_id } = payload;

      const { data: oldOwner } = await supabase
        .from("users")
        .select("*")
        .eq("clan_id", clan_id)
        .eq("clan_role", "Глава")
        .single();

      await supabase
        .from("users")
        .update({ clan_role: "Со-глава" })
        .eq("id", oldOwner.id);

      await supabase
        .from("users")
        .update({ clan_role: "Глава" })
        .eq("id", new_owner_id);

      return res.json({ success: true });
    }

    // ===== REQUESTS =====

    if (action === "getRequests") {
      const { clan_id } = payload;

      const { data } = await supabase
        .from("clan_requests")
        .select("*")
        .eq("clan_id", clan_id);

      return res.json(data);
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

    return res.status(400).json({ error: "Unknown action" });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
