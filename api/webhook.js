// Vercel Serverless Function
module.exports = async (req, res) => {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обрабатываем OPTIONS запросы
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Только POST запросы
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('Получены данные из AmoCRM:', JSON.stringify(req.body, null, 2));
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received!',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 