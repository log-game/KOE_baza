import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" })

  const { request_id } = req.body

  const { data: request } = await supabase
    .from("clan_requests")
    .select("*")
    .eq("id", request_id)
    .single()

  if (!request)
    return res.status(404).json({ error: "Request not found" })

  await supabase
    .from("users")
    .update({
      clan_id: request.clan_id,
      clan_role: "Участник"
    })
    .eq("id", request.user_id)

  await supabase
    .from("clan_requests")
    .update({ status: "accepted" })
    .eq("id", request_id)

  res.status(200).json({ success: true })
}
