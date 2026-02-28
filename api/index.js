import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { action, payload } = req.body;

  //////////////////////////////////////////////////////
  // ПОЛУЧИТЬ КЛАН
  //////////////////////////////////////////////////////
  if (action === "getClan") {
    const { clan_id } = payload;

    const { data } = await supabase
      .from("clans")
      .select("*")
      .eq("id", clan_id)
      .single();

    return res.json(data);
  }

  //////////////////////////////////////////////////////
  // ВСЕ КЛАНЫ
  //////////////////////////////////////////////////////
  if (action === "getAllClans") {
    const { data } = await supabase.from("clans").select("*");
    return res.json(data || []);
  }

  //////////////////////////////////////////////////////
  // УЧАСТНИКИ
  //////////////////////////////////////////////////////
  if (action === "getMembers") {
    const { clan_id } = payload;

    const { data } = await supabase
      .from("users")
      .select("id,name,clan_role")
      .eq("clan_id", clan_id);

    return res.json(data || []);
  }

  //////////////////////////////////////////////////////
  // ЗАЯВКИ
  //////////////////////////////////////////////////////
  if (action === "getRequests") {
    const { clan_id } = payload;

    const { data } = await supabase
      .from("clan_requests")
      .select("*")
      .eq("clan_id", clan_id);

    return res.json(data || []);
  }

  //////////////////////////////////////////////////////
  // ПРИНЯТЬ ЗАЯВКУ
  //////////////////////////////////////////////////////
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

  //////////////////////////////////////////////////////
  // ОТКЛОНИТЬ
  //////////////////////////////////////////////////////
  if (action === "rejectRequest") {
    const { user_id } = payload;

    await supabase
      .from("clan_requests")
      .delete()
      .eq("user_id", user_id);

    return res.json({ success: true });
  }

  //////////////////////////////////////////////////////
  // СМЕНА РОЛИ
  //////////////////////////////////////////////////////
  if (action === "changeRole") {
    const { target_user_id, new_role } = payload;

    const allowedRoles = ["Участник", "Сторож", "Со-глава"];

    if (!allowedRoles.includes(new_role))
      return res.json({ error: "Неверная роль" });

    await supabase
      .from("users")
      .update({ clan_role: new_role })
      .eq("id", target_user_id);

    return res.json({ success: true });
  }

  //////////////////////////////////////////////////////
  // КИК
  //////////////////////////////////////////////////////
  if (action === "kickMember") {
    const { target_user_id } = payload;

    await supabase
      .from("users")
      .update({ clan_id: null, clan_role: null })
      .eq("id", target_user_id);

    return res.json({ success: true });
  }

  //////////////////////////////////////////////////////
  // ОБНОВИТЬ КЛАН
  //////////////////////////////////////////////////////
  if (action === "updateClanInfo") {
    const { clan_id, name, description } = payload;

    await supabase
      .from("clans")
      .update({ name, description })
      .eq("id", clan_id);

    return res.json({ success: true });
  }

  //////////////////////////////////////////////////////
  // ОБЪЯВИТЬ ВОЙНУ
  //////////////////////////////////////////////////////
  if (action === "declareWar") {
    const { attacker_id, defender_id } = payload;

    const { data: active } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${attacker_id},defender_id.eq.${attacker_id},attacker_id.eq.${defender_id},defender_id.eq.${defender_id}`);

    if (active.length > 0)
      return res.json({ error: "Один из кланов уже участвует в войне" });

    const now = new Date();
    const ends = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const cooldown = new Date(ends.getTime() + 12 * 60 * 60 * 1000);

    const { data } = await supabase.from("clan_wars").insert({
      attacker_id,
      defender_id,
      started_at: now,
      ends_at: ends,
      cooldown_until: cooldown
    }).select().single();

    return res.json(data);
  }

  //////////////////////////////////////////////////////
  // ПОЛУЧИТЬ ВОЙНЫ + АВТО ЛОГИКА
  //////////////////////////////////////////////////////
  if (action === "getClanWars") {
    const { clan_id } = payload;
    const now = new Date();

    const { data:wars } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`);

    for (let war of wars || []) {

      const started = new Date(war.started_at);
      const ends = new Date(war.ends_at);
      const cooldown = new Date(war.cooldown_until);

      // Если прошел кулдаун — удаляем войну
      if (now > cooldown) {
        await supabase.from("clan_wars").delete().eq("id", war.id);
      }
    }

    const { data: updated } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`);

    return res.json(updated || []);
  }

  //////////////////////////////////////////////////////
  // СООБЩЕНИЯ ДЛЯ ПРОФИЛЯ КЛАНА
  //////////////////////////////////////////////////////
  if (action === "getClanMessages") {

    const { clan_id } = payload;
    const now = new Date();

    const { data:wars } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`attacker_id.eq.${clan_id},defender_id.eq.${clan_id}`);

    if (!wars || wars.length === 0)
      return res.json([]);

    const war = wars[0];

    const started = new Date(war.started_at);
    const ends = new Date(war.ends_at);

    const { data:attacker } = await supabase
      .from("clans")
      .select("name")
      .eq("id", war.attacker_id)
      .single();

    const { data:defender } = await supabase
      .from("clans")
      .select("name")
      .eq("id", war.defender_id)
      .single();

    let messages = [];

    if (war.attacker_id === clan_id)
      messages.push(`Ваш клан объявил войну клану ${defender.name}`);
    else
      messages.push(`Вам объявил войну клан ${attacker.name}`);

    // 24 часа
    if (now - started >= 24 * 60 * 60 * 1000 &&
        now < ends) {
      messages.push("Совсем скоро появятся концепты написанные для битвы от участников вашего клана, выбери лучший");
    }

    // 48 часов
    if (now >= ends) {
      messages.push("Война окончена!");
    }

    return res.json(messages);
  }

  return res.json({ error: "Неизвестное действие" });
}
