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
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { action, payload } = req.body;

  try {

  // =====================================================
  // =================== USERS ===========================
  // =====================================================

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

    await supabase
      .from("users")
      .update({ name, description })
      .eq("id", user_id);

    return res.json({ success: true });
  }

  if (action === "leaveClan") {

    const { user_id } = payload;

    const { data:user } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .single();

    if (!user.clan_id)
      return res.json({ error: "Вы не состоите в клане" });

    // если глава — передаём со-главе
    if (user.clan_role === "Глава") {

      const { data:co } = await supabase
        .from("users")
        .select("*")
        .eq("clan_id", user.clan_id)
        .eq("clan_role","Со-глава")
        .limit(1);

      if (co.length > 0) {
        await supabase
          .from("users")
          .update({ clan_role:"Глава" })
          .eq("id", co[0].id);
      }
    }

    await supabase
      .from("users")
      .update({ clan_id:null, clan_role:null })
      .eq("id", user_id);

    return res.json({ success:true });
  }

  // =====================================================
  // =================== CLANS ===========================
  // =====================================================

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

  if (action === "createClan") {

    const { name, description, owner_id } = payload;

    const { data:newClan } = await supabase
      .from("clans")
      .insert([{ name, description }])
      .select()
      .single();

    await supabase
      .from("users")
      .update({ clan_id:newClan.id, clan_role:"Глава" })
      .eq("id", owner_id);

    return res.json(newClan);
  }

  if (action === "updateClanInfo") {

    const { clan_id, name, description } = payload;

    await supabase
      .from("clans")
      .update({ name, description })
      .eq("id", clan_id);

    return res.json({ success:true });
  }

  if (action === "updateGoal") {

    const { clan_id, goal } = payload;

    await supabase
      .from("clans")
      .update({ goal })
      .eq("id", clan_id);

    return res.json({ success:true });
  }

  if (action === "deleteClan") {

    const { clan_id } = payload;

    await supabase
      .from("users")
      .update({ clan_id:null, clan_role:null })
      .eq("clan_id", clan_id);

    await supabase
      .from("clan_requests")
      .delete()
      .eq("clan_id", clan_id);

    await supabase
      .from("clan_news")
      .delete()
      .eq("clan_id", clan_id);

    await supabase
      .from("clan_wars")
      .delete()
      .or(`clan1_id.eq.${clan_id},clan2_id.eq.${clan_id}`);

    await supabase
      .from("clans")
      .delete()
      .eq("id", clan_id);

    return res.json({ success:true });
  }

  // =====================================================
  // ================= MEMBERS ===========================
  // =====================================================

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
      return res.json({ error:"Нельзя менять свою роль" });

    const { data:target } = await supabase
      .from("users")
      .select("*")
      .eq("id", target_user_id)
      .single();

    if (target.clan_role === "Глава")
      return res.json({ error:"Нельзя изменить роль главы" });

    await supabase
      .from("users")
      .update({ clan_role:new_role })
      .eq("id", target_user_id);

    return res.json({ success:true });
  }

  if (action === "kickMember") {

    const { target_user_id } = payload;

    const { data:target } = await supabase
      .from("users")
      .select("*")
      .eq("id", target_user_id)
      .single();

    if (target.clan_role === "Глава")
      return res.json({ error:"Нельзя выгнать главу" });

    await supabase
      .from("users")
      .update({ clan_id:null, clan_role:null })
      .eq("id", target_user_id);

    return res.json({ success:true });
  }

  if (action === "transferClan") {

    const { clan_id, new_owner_id } = payload;

    const { data:oldOwner } = await supabase
      .from("users")
      .select("*")
      .eq("clan_id", clan_id)
      .eq("clan_role","Глава")
      .single();

    await supabase
      .from("users")
      .update({ clan_role:"Со-глава" })
      .eq("id", oldOwner.id);

    await supabase
      .from("users")
      .update({ clan_role:"Глава" })
      .eq("id", new_owner_id);

    return res.json({ success:true });
  }

  // =====================================================
  // ================= REQUESTS ==========================
  // =====================================================

  if (action === "applyClan") {

    const { user_id, clan_id } = payload;

    const { data:user } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .single();

    if (user.clan_id)
      return res.json({ error:"Вы уже состоите в клане" });

    await supabase
      .from("clan_requests")
      .insert([{ user_id, clan_id }]);

    return res.json({ success:true });
  }

  if (action === "getRequests") {

    const { clan_id } = payload;

    const { data } = await supabase
      .from("clan_requests")
      .select("*")
      .eq("clan_id", clan_id);

    return res.json(data || []);
  }

  if (action === "acceptRequest") {

    const { user_id, clan_id } = payload;

    await supabase
      .from("users")
      .update({ clan_id, clan_role:"Участник" })
      .eq("id", user_id);

    await supabase
      .from("clan_requests")
      .delete()
      .eq("user_id", user_id);

    return res.json({ success:true });
  }

  if (action === "rejectRequest") {

    const { user_id } = payload;

    await supabase
      .from("clan_requests")
      .delete()
      .eq("user_id", user_id);

    return res.json({ success:true });
  }

  // =====================================================
  // ================= NEWS ==============================
  // =====================================================

  if (action === "getNews") {

    const { clan_id } = payload;

    const { data } = await supabase
      .from("clan_news")
      .select("*")
      .eq("clan_id", clan_id)
      .order("created_at", { ascending:false });

    return res.json(data || []);
  }

  if (action === "addNews") {

    const { clan_id, text, type } = payload;

    await supabase
      .from("clan_news")
      .insert([{ clan_id, text, type:type||"default" }]);

    return res.json({ success:true });
  }

  // =====================================================
  // ================= WAR SYSTEM ========================
  // =====================================================

  if (action === "declareWar") {

    const { clan1_id, clan2_id } = payload;

    const now = new Date();
    const ends = new Date(now.getTime() + 48*60*60*1000);

    const { data:war } = await supabase
      .from("clan_wars")
      .insert([{
        clan1_id,
        clan2_id,
        status:"active",
        started_at:now,
        ends_at:ends
      }])
      .select()
      .single();

    await supabase.from("clan_news").insert([
      { clan_id:clan1_id, text:`🔥 Объявлена битва концептов`, type:"war" }
    ]);

    return res.json(war);
  }

  if (action === "getCurrentWar") {

    const { clan_id } = payload;

    const { data } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`clan1_id.eq.${clan_id},clan2_id.eq.${clan_id}`)
      .eq("status","active")
      .maybeSingle();

    return res.json(data);
  }

  if (action === "getCooldownWar") {

    const { clan_id } = payload;

    const { data } = await supabase
      .from("clan_wars")
      .select("*")
      .or(`clan1_id.eq.${clan_id},clan2_id.eq.${clan_id}`)
      .eq("status","cooldown")
      .maybeSingle();

    return res.json(data);
  }

  return res.status(400).json({ error:"Unknown action" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
