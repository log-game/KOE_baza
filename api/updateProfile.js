import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { user_id, new_name, new_description } = req.body;

  if (!user_id || (!new_name && !new_description)) {
    return res.status(400).json({ error: 'Недостаточно данных' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const updateData = {};
  if(new_name) updateData.name = new_name;
  if(new_description) updateData.description = new_description;

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user_id)
    .select()
    .single();

  if(error){
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ data });
}
