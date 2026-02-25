module.exports = async (req, res) => {
  return res.status(200).json({
    message: "Функция работает",
    env_check: {
      has_url: !!process.env.SUPABASE_URL,
      has_key: !!process.env.SUPABASE_SERVICE_KEY
    }
  });
};
