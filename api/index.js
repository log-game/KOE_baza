import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if(req.method === "OPTIONS") return res.status(200).end()
  if(req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const { action, payload } = req.body

  try {
    // ---------------- GET USER ----------------
    if(action === "getUser"){
      const { user_id } = payload
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id)
        .single()
      if(error) return res.status(404).json({ error: error.message })
      return res.json(user)
    }

    // ---------------- GET CLAN ----------------
    if(action === "getClan"){
      const { clan_id } = payload
      const { data: clan, error } = await supabase
        .from("clans")
        .select("*")
        .eq("id", clan_id)
        .single()
      if(error) return res.status(404).json({ error: error.message })
      return res.json(clan)
    }

    // ---------------- PROMOTE ----------------
    if(action === "promote"){
      const { user_id } = payload
      const { data: user } = await supabase
        .from("users")
        .select("id, name, clan_role, clan_id")
        .eq("id", user_id)
        .single()
      if(!user) return res.status(404).json({ error: "Пользователь не найден" })
      if(user.clan_role === "Глава") return res.status(400).json({ error: "Нельзя повысить главу" })

      let newRole = null
      if(user.clan_role === "Участник") newRole = "Сторож"
      else if(user.clan_role === "Сторож") newRole = "Со-глава"
      else return res.status(400).json({ error: "Дальнейшее повышение невозможно" })

      await supabase
        .from("users")
        .update({ clan_role: newRole })
        .eq("id", user_id)

      await supabase
        .from("clan_news")
        .insert({
          clan_id: user.clan_id,
          text: user.name + " повышен в звании, теперь он " + newRole,
          type: "promote"
        })

      return res.json({ success: true })
    }

    // ---------------- DEMOTE ----------------
    if(action === "demote"){
      const { user_id } = payload
      const { data: user } = await supabase
        .from("users")
        .select("id, name, clan_role, clan_id")
        .eq("id", user_id)
        .single()
      if(!user) return res.status(404).json({ error: "Пользователь не найден" })
      if(user.clan_role === "Глава") return res.status(400).json({ error: "Нельзя понизить главу" })

      let newRole = null
      if(user.clan_role === "Со-глава") newRole = "Сторож"
      else if(user.clan_role === "Сторож") newRole = "Участник"
      else return res.status(400).json({ error: "Дальнейшее понижение невозможно" })

      await supabase
        .from("users")
        .update({ clan_role: newRole })
        .eq("id", user_id)

      await supabase
        .from("clan_news")
        .insert({
          clan_id: user.clan_id,
          text: user.name + " понижен в звании, теперь он " + newRole,
          type: "demote"
        })

      return res.json({ success: true })
    }

    // ---------------- TRANSFER CLAN ----------------
    if(action === "transferClan"){
      const { current_id, new_id, clan_id } = payload

      await supabase
        .from("users")
        .update({ clan_role: "Глава" })
        .eq("id", new_id)

      await supabase
        .from("users")
        .update({ clan_role: "Со-глава" })
        .eq("id", current_id)

      await supabase
        .from("clan_news")
        .insert({
          clan_id,
          text: "Клан передан новому главе",
          type: "transfer"
        })

      return res.json({ success: true })
    }

    // ---------------- SET GOAL ----------------
    if(action === "setGoal"){
      const { clan_id, goal, custom_goal, author } = payload

      await supabase
        .from("clans")
        .update({ goal, custom_goal })
        .eq("id", clan_id)

      await supabase
        .from("clan_news")
        .insert({
          clan_id,
          text: author + " назначил новую цель клана",
          type: "goal"
        })

      return res.json({ success: true })
    }

    // ---------------- GET NEWS ----------------
    if(action === "getNews"){
      const { clan_id } = payload
      const { data } = await supabase
        .from("clan_news")
        .select("*")
        .eq("clan_id", clan_id)
        .order("created_at", { ascending: false })
      return res.json(data)
    }

    return res.status(400).json({ error: "Неизвестное действие" })

  } catch(e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}
