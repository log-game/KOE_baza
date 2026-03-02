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

  // ================= USERS =================

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

  if (action === "updateProfile") {
    const { user_id, name, description } = payload;
    await supabase.from("users")
      .update({ name, description })
      .eq("id", user_id);
    return res.json({ success:true });
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

  // ================= CLAN WARS =================

  if (action === "declareWar") {

    const attacker_id = payload?.attacker_id;
    const defender_id = payload?.defender_id;

    if (!attacker_id || !defender_id) {
      return res.json({ error: "Нет ID" });
    }

    if (attacker_id === defender_id) {
      return res.json({ error: "Нельзя самому себе" });
    }

    const { data: existing } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${attacker_id},defender_id.eq.${attacker_id}`);

    if (existing && existing.length > 0) {
      return res.json({ error: "Уже в войне" });
    }

    const now = new Date();
    const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    await supabase.from("clan_wars").insert([{
      attacker_id,
      defender_id,
      created_at: now.toISOString(),
      ends_at: end.toISOString()
    }]);

    return res.json({ success:true });
  }

  if (action === "getActiveWar") {

    const clan_id = payload?.clan_id;

    const { data } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`)
      .limit(1)
      .maybeSingle();

    if (!data) return res.json(null);

    const now = new Date();
    const end = new Date(data.ends_at);

    if (now >= end) {
      await supabase.from("clan_wars").delete().eq("id", data.id);
      return res.json(null);
    }

    return res.json(data);
  }

  return res.status(400).json({ error:"Unknown action" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
