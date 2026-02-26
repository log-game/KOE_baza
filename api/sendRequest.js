import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" })

  const { user_id, clan_id } = req.body

  const { data: user } = await supabase
    .from("users")
    .select("name")
    .eq("id", user_id)
    .single()

  const { error } = await supabase
    .from("clan_requests")
    .insert({
      user_id,
      clan_id,
      user_name: user.name
    })

  if (error)
    return res.status(500).json({ error })

  res.status(200).json({ success: true })
}
