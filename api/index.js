import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {

    // 🔥 Ручной парсинг body (фикс 400)
    let body = "";

    await new Promise((resolve) => {
      req.on("data", chunk => {
        body += chunk.toString();
      });
      req.on("end", resolve);
    });

    const parsed = body ? JSON.parse(body) : {};
    const action = parsed.action;
    const payload = parsed.payload || {};

    if (!action) {
      return res.status(400).json({ error:"Action not provided" });
    }

    // ================= USERS =================

    if (action === "getUser") {
      const { user_id } = payload;
      const { data, error } = await supabase.from("users").select("*").eq("id", user_id).single();
      if (error) throw error;
      return res.json(data);
    }

    if (action === "updateProfile") {
      const { user_id, name, description } = payload;
      await supabase.from("users").update({ name, description }).eq("id", user_id);
      return res.json({ success:true });
    }

    if (action === "leaveClan") {
      const { user_id } = payload;

      const { data:user } = await supabase.from("users").select("*").eq("id", user_id).single();

      await supabase.from("users")
        .update({ clan_id:null, clan_role:null })
        .eq("id", user_id);

      return res.json({ success:true });
    }

    // ================= CLANS =================

    if (action === "getClan") {
      const { clan_id } = payload;
      const { data } = await supabase.from("clans").select("*").eq("id", clan_id).maybeSingle();
      return res.json(data);
    }

    if (action === "getAllClans") {
      const { data } = await supabase.from("clans").select("*");
      return res.json(data || []);
    }

    if (action === "createClan") {
      const { name, description, owner_id } = payload;

      const { data:newClan, error } = await supabase
        .from("clans")
        .insert([{ name, description }])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("users")
        .update({ clan_id:newClan.id, clan_role:"Глава" })
        .eq("id", owner_id);

      return res.json(newClan);
    }

    // ================= CLAN WARS =================

    if (action === "declareWar") {

      const { attacker_id, defender_id } = payload;

      if (!attacker_id || !defender_id)
        return res.json({ error:"Не переданы ID кланов" });

      if (attacker_id === defender_id)
        return res.json({ error:"Нельзя объявить войну себе" });

      const { data:active } = await supabase
        .from("clan_wars")
        .select("id")
        .or(`attacker_id.eq.${attacker_id},defender_id.eq.${attacker_id},attacker_id.eq.${defender_id},defender_id.eq.${defender_id}`)
        .eq("status","active");

      if (active && active.length > 0)
        return res.json({ error:"Клан уже участвует в войне" });

      const now = new Date();
      const end = new Date(now.getTime() + 48*60*60*1000);
      const cooldown = new Date(end.getTime() + 12*60*60*1000);

      await supabase.from("clan_wars").insert([{
        attacker_id,
        defender_id,
        status:"active",
        created_at: now.toISOString(),
        ends_at: end.toISOString(),
        cooldown_until: cooldown.toISOString()
      }]);

      return res.json({ success:true });
    }

    if (action === "getActiveWar") {

      const { clan_id } = payload;

      const { data } = await supabase
        .from("clan_wars")
        .select("*")
        .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`)
        .eq("status","active")
        .maybeSingle();

      if (data) {
        const now = new Date();
        const end = new Date(data.ends_at);

        if (now >= end) {
          await supabase.from("clan_wars").update({ status:"finished" }).eq("id", data.id);
          return res.json(null);
        }
      }

      return res.json(data || null);
    }

    return res.status(400).json({ error:"Unknown action" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
