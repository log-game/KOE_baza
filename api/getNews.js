import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
 process.env.SUPABASE_URL,
 process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req,res){

 res.setHeader("Access-Control-Allow-Origin","*")
 res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS")
 res.setHeader("Access-Control-Allow-Headers","Content-Type")

 if(req.method==="OPTIONS")
  return res.status(200).end()

 const { clan_id } = req.body

 const { data } = await supabase
  .from("clan_news")
  .select("*")
  .eq("clan_id", clan_id)
  .order("created_at",{ascending:false})

 res.status(200).json(data)
}
