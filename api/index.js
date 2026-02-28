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

  //////////////////////////////////////////////////////
  // USERS
  //////////////////////////////////////////////////////

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

  //////////////////////////////////////////////////////
  // CLANS
  //////////////////////////////////////////////////////

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

  //////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////

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

    const { data:target } = await supabase
      .from("users")
      .select("*")
      .eq("id", target_user_id)
      .single();

    if (!target) return res.json({ error:"Пользователь не найден" });

    if (target.clan_role === "Глава")
      return res.json({ error:"Нельзя изменить роль главы" });

    await supabase
      .from("users")
      .update({ clan_role:new_role })
      .eq("id", target_user_id);

    return res.json({ success:true });
  }

  //////////////////////////////////////////////////////
  // CLAN WARS
  //////////////////////////////////////////////////////

  if (action === "declareWar") {

    const { attacker_id, defender_id } = payload;

    if (attacker_id === defender_id)
      return res.json({ error:"Нельзя объявить войну себе" });

    const now = new Date();
    const end = new Date(now.getTime() + 48*60*60*1000);
    const cooldown = new Date(end.getTime() + 12*60*60*1000);

    // Проверка атакующего
    const { data:attackerWars } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${attacker_id},defender_id.eq.${attacker_id}`);

    if (attackerWars.length > 0)
      return res.json({ error:"Ваш клан уже участвует в войне" });

    // Проверка защитника
    const { data:defenderWars } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${defender_id},defender_id.eq.${defender_id}`);

    if (defenderWars.length > 0)
      return res.json({ error:"Этот клан уже участвует в войне" });

    await supabase.from("clan_wars").insert([{
      attacker_id,
      defender_id,
      created_at: now.toISOString(),
      ends_at: end.toISOString(),
      cooldown_until: cooldown.toISOString()
    }]);

    return res.json({ success:true });
  }

  if (action === "getClanWars") {

    const { clan_id } = payload;
    const now = new Date();

    const { data:wars } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`);

    for (let w of wars || []) {

      const created = new Date(w.created_at);
      const ends = new Date(w.ends_at);
      const cooldown = new Date(w.cooldown_until);

      const { data:attacker } = await supabase.from("clans").select("name").eq("id", w.attacker_id).single();
      const { data:defender } = await supabase.from("clans").select("name").eq("id", w.defender_id).single();

      // Сообщение при старте (1 раз)
      if (now - created < 60*1000) {

        if (w.attacker_id === clan_id) {
          await supabase.from("clan_news").insert([{
            clan_id,
            text:`⚔️ Ваш клан объявил войну клану ${defender?.name}`
          }]);
        } else {
          await supabase.from("clan_news").insert([{
            clan_id,
            text:`⚔️ Вам объявил войну клан ${attacker?.name}`
          }]);
        }
      }

      // 24 часа
      if (now - created > 24*60*60*1000 && now < ends) {
        await supabase.from("clan_news").insert([{
          clan_id,
          text:`🔥 Совсем скоро появятся концепты написанные для битвы от участников вашего клана, выбери лучший`
        }]);
      }

      // 48 часов
      if (now > ends && now < cooldown) {
        await supabase.from("clan_news").insert([{
          clan_id,
          text:`🏁 Война окончена!`
        }]);
      }

      // Удаление после кулдауна
      if (now > cooldown) {
        await supabase.from("clan_wars").delete().eq("id", w.id);
      }

    }

    const { data:updated } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`);

    return res.json(updated || []);
  }

  return res.status(400).json({ error:"Unknown action" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
