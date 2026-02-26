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

 const { current_id, new_id, clan_id } = req.body

 await supabase
  .from("users")
  .update({ clan_role:"Глава" })
  .eq("id", new_id)

 await supabase
  .from("users")
  .update({ clan_role:"Со-глава" })
  .eq("id", current_id)

 await supabase
  .from("clan_news")
  .insert({
    clan_id,
    text:"Клан передан новому главе",
    type:"transfer"
  })

 res.status(200).json({success:true})
}
