import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const { action, payload } = req.body

  try {

    // ================= USER =================

    if (action === "getUser") {
      const { user_id } = payload
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id)
        .single()
      return res.json(data)
    }

    if (action === "updateProfile") {
      const { user_id, name, description } = payload

      await supabase
        .from("users")
        .update({ name, description })
        .eq("id", user_id)

      return res.json({ success: true })
    }

    if (action === "leaveClan") {
      const { user_id } = payload

      const { data: user } = await supabase
        .from("users")
        .select("clan_id,name")
        .eq("id", user_id)
        .single()

      if (!user.clan_id) return res.json({ success: true })

      await supabase
        .from("users")
        .update({ clan_id: null, clan_role: null })
        .eq("id", user_id)

      await supabase
        .from("clan_news")
        .insert({
          clan_id: user.clan_id,
          text: user.name + " покинул клан",
          type: "leave"
        })

      return res.json({ success: true })
    }

    // ================= CLANS =================

    if (action === "getClan") {
      const { clan_id } = payload
      const { data } = await supabase
        .from("clans")
        .select("*")
        .eq("id", clan_id)
        .single()
      return res.json(data)
    }

    if (action === "getAllClans") {
      const { data } = await supabase
        .from("clans")
        .select("id,name")
      return res.json(data)
    }

    if (action === "findClanByName") {
      const { name } = payload
      const { data } = await supabase
        .from("clans")
        .select("*")
        .eq("name", name)
        .single()
      return res.json(data)
    }

    // ================= MEMBERS =================

    if (action === "getMembers") {
      const { clan_id } = payload
      const { data } = await supabase
        .from("users")
        .select("id,name,clan_role")
        .eq("clan_id", clan_id)
      return res.json(data)
    }

    // ================= REQUESTS =================

    if (action === "sendRequest") {
      const { user_id, clan_id } = payload

      await supabase
        .from("clan_requests")
        .insert({ user_id, clan_id })

      return res.json({ success: true })
    }

    if (action === "getRequests") {
      const { clan_id } = payload
      const { data } = await supabase
        .from("clan_requests")
        .select("*")
        .eq("clan_id", clan_id)
      return res.json(data)
    }

    if (action === "acceptRequest") {
      const { user_id, clan_id } = payload

      await supabase
        .from("users")
        .update({ clan_id, clan_role: "Участник" })
        .eq("id", user_id)

      await supabase
        .from("clan_requests")
        .delete()
        .eq("user_id", user_id)

      await supabase
        .from("clan_news")
        .insert({
          clan_id,
          text: user_id + " теперь участник клана!",
          type: "join"
        })

      return res.json({ success: true })
    }

    if (action === "rejectRequest") {
      const { user_id } = payload

      await supabase
        .from("clan_requests")
        .delete()
        .eq("user_id", user_id)

      return res.json({ success: true })
    }

    // ================= ROLES =================

    if (action === "promote") {
      const { user_id } = payload

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id)
        .single()

      if (user.clan_role === "Глава")
        return res.json({ error: "Нельзя повысить главу" })

      let newRole = null
      if (user.clan_role === "Участник") newRole = "Сторож"
      else if (user.clan_role === "Сторож") newRole = "Со-глава"

      if (!newRole) return res.json({ error: "Повышение невозможно" })

      await supabase
        .from("users")
        .update({ clan_role: newRole })
        .eq("id", user_id)

      await supabase
        .from("clan_news")
        .insert({
          clan_id: user.clan_id,
          text: user.name + " повышен до " + newRole,
          type: "promote"
        })

      return res.json({ success: true })
    }

    if (action === "demote") {
      const { user_id } = payload

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", user_id)
        .single()

      if (user.clan_role === "Глава")
        return res.json({ error: "Нельзя понизить главу" })

      let newRole = null
      if (user.clan_role === "Со-глава") newRole = "Сторож"
      else if (user.clan_role === "Сторож") newRole = "Участник"

      if (!newRole) return res.json({ error: "Понижение невозможно" })

      await supabase
        .from("users")
        .update({ clan_role: newRole })
        .eq("id", user_id)

      await supabase
        .from("clan_news")
        .insert({
          clan_id: user.clan_id,
          text: user.name + " понижен до " + newRole,
          type: "demote"
        })

      return res.json({ success: true })
    }

    // ================= NEWS =================

    if (action === "getNews") {
      const { clan_id } = payload
      const { data } = await supabase
        .from("clan_news")
        .select("*")
        .eq("clan_id", clan_id)
        .order("created_at", { ascending: false })
      return res.json(data)
    }

    return res.status(400).json({ error: "Unknown action" })

  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}
