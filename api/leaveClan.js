import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" })

  const { user_id } = req.body

  await supabase
    .from("users")
    .update({
      clan_id: null,
      clan_role: "Участник"
    })
    .eq("id", user_id)

  res.status(200).json({ success: true })
}
