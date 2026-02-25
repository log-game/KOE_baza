const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Разрешаем запросы с любого домена
    'Access-Control-Allow-Methods': 'POST,OPTIONS', // Разрешаем POST
    'Access-Control-Allow-Headers': 'Content-Type' // Разрешаем Content-Type
  };

  // Для preflight-запросов OPTIONS просто отвечаем
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader(headers).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if(req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { user_id, new_name, new_description } = req.body;

    if (!user_id || (!new_name && !new_description)) {
      return res.status(400).json({ error: 'Недостаточно данных' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const updateData = {};
    if (new_name) updateData.name = new_name;
    if (new_description) updateData.description = new_description;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ data });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
