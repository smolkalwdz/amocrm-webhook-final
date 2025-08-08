// Простая тестовая функция для Vercel
module.exports = async (req, res) => {
  console.log('✅ Simple test function called on Vercel');
  
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обрабатываем OPTIONS запросы
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Simple test works on Vercel!',
    timestamp: new Date().toISOString(),
    platform: 'Vercel'
  });
}; 