import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS")
    return res.status(200).end()

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" })

  const { user_id } = req.body

  const { data: user } = await supabase
    .from("users")
    .select("clan_role")
    .eq("id", user_id)
    .single()

  let newRole = "Участник"

  if (user.clan_role === "Со-глава")
    newRole = "Сторож"
  else if (user.clan_role === "Сторож")
    newRole = "Участник"

  await supabase
    .from("users")
    .update({ clan_role: newRole })
    .eq("id", user_id)

  res.status(200).json({ success: true })
}
