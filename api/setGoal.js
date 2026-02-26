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

 const { clan_id, goal, custom_goal, author } = req.body

 await supabase
  .from("clans")
  .update({ goal, custom_goal })
  .eq("id", clan_id)

 await supabase
  .from("clan_news")
  .insert({
    clan_id,
    text: author + " назначил новую цель клана",
    type:"goal"
  })

 res.status(200).json({success:true})
}
