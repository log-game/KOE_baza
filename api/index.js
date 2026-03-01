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

  if (!action) return res.status(400).json({ error:"No action provided" });

  try {

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

    if (user.clan_role === "Глава") {
      const { data:co } = await supabase
        .from("users")
        .select("*")
        .eq("clan_id", user.clan_id)
        .eq("clan_role","Со-глава")
        .limit(1);

      if (co && co.length > 0) {
        await supabase.from("users").update({ clan_role:"Глава" }).eq("id", co[0].id);
      }
    }

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

  if (action === "updateClanInfo") {
    const { clan_id, name, description } = payload;
    await supabase.from("clans").update({ name, description }).eq("id", clan_id);
    return res.json({ success:true });
  }

  if (action === "updateGoal") {
    const { clan_id, goal } = payload;
    await supabase.from("clans").update({ goal }).eq("id", clan_id);
    return res.json({ success:true });
  }

  if (action === "deleteClan") {
    const { clan_id } = payload;

    await supabase.from("users").update({ clan_id:null, clan_role:null }).eq("clan_id", clan_id);
    await supabase.from("clan_requests").delete().eq("clan_id", clan_id);
    await supabase.from("clan_news").delete().eq("clan_id", clan_id);
    await supabase.from("clan_wars").delete().or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`);
    await supabase.from("clans").delete().eq("id", clan_id);

    return res.json({ success:true });
  }

  // ================= MEMBERS =================

  if (action === "getMembers") {
    const { clan_id } = payload;
    const { data } = await supabase
      .from("users")
      .select("id,name,clan_role,cups,concepts")
      .eq("clan_id", clan_id);
    return res.json(data || []);
  }

  if (action === "changeRole") {

    const { current_user_id, target_user_id, new_role } = payload;

    if (current_user_id === target_user_id)
      return res.json({ error:"Нельзя изменить свою роль" });

    const allowedRoles = ["Участник","Сторож","Со-глава"];
    if (!allowedRoles.includes(new_role))
      return res.json({ error:"Недопустимая роль" });

    const { data:target } = await supabase.from("users").select("*").eq("id", target_user_id).single();
    if (!target) return res.json({ error:"Пользователь не найден" });
    if (target.clan_role === "Глава")
      return res.json({ error:"Нельзя изменить роль главы" });

    await supabase.from("users").update({ clan_role:new_role }).eq("id", target_user_id);
    return res.json({ success:true });
  }

  if (action === "kickMember") {

    const { current_user_id, target_user_id } = payload;

    if (current_user_id === target_user_id)
      return res.json({ error:"Нельзя выгнать себя" });

    const { data:target } = await supabase.from("users").select("*").eq("id", target_user_id).single();

    if (target.clan_role === "Глава")
      return res.json({ error:"Нельзя выгнать главу" });

    await supabase.from("users")
      .update({ clan_id:null, clan_role:null })
      .eq("id", target_user_id);

    return res.json({ success:true });
  }

  // ================= REQUESTS =================

  if (action === "getRequests") {
    const { clan_id } = payload;
    const { data } = await supabase.from("clan_requests").select("*").eq("clan_id", clan_id);
    return res.json(data || []);
  }

  if (action === "applyClan") {
    const { user_id, clan_id } = payload;

    const { data:user } = await supabase.from("users").select("*").eq("id", user_id).single();
    if (user.clan_id)
      return res.json({ error:"Вы уже в клане" });

    await supabase.from("clan_requests").insert([{ user_id, clan_id }]);
    return res.json({ success:true });
  }

  if (action === "acceptRequest") {
    const { user_id, clan_id } = payload;

    await supabase.from("users").update({ clan_id, clan_role:"Участник" }).eq("id", user_id);
    await supabase.from("clan_requests").delete().eq("user_id", user_id);

    return res.json({ success:true });
  }

  if (action === "rejectRequest") {
    const { user_id } = payload;
    await supabase.from("clan_requests").delete().eq("user_id", user_id);
    return res.json({ success:true });
  }

  // ================= CLAN WARS =================

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

  if (action === "declareWar") {

    const { attacker_id, defender_id } = payload;

    if (!attacker_id || !defender_id)
      return res.json({ error:"Не переданы ID" });

    if (attacker_id === defender_id)
      return res.json({ error:"Нельзя объявить войну себе" });

    const { data:active } = await supabase
      .from("clan_wars")
      .select("id")
      .or(`attacker_id.eq.${attacker_id},defender_id.eq.${attacker_id},attacker_id.eq.${defender_id},defender_id.eq.${defender_id}`)
      .eq("status","active");

    if (active && active.length > 0)
      return res.json({ error:"Один из кланов уже в войне" });

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

  return res.status(400).json({ error:"Unknown action" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
