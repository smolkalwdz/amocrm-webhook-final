// Простая тестовая функция для проверки AmoCRM
module.exports = async (req, res) => {
  console.log('🧪 ТЕСТ: Функция test-amo вызвана');
  
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const AMO_ACCESS_TOKEN = process.env.AMO_ACCESS_TOKEN;
    
    console.log('🔍 Проверяем токен AmoCRM...');
    console.log('Токен настроен:', !!AMO_ACCESS_TOKEN);
    console.log('Длина токена:', AMO_ACCESS_TOKEN ? AMO_ACCESS_TOKEN.length : 0);
    
    if (AMO_ACCESS_TOKEN) {
      console.log('Первые 20 символов токена:', AMO_ACCESS_TOKEN.substring(0, 20));
    }

    res.status(200).json({
      success: true,
      message: 'Тестовая функция работает!',
      timestamp: new Date().toISOString(),
      tokenConfigured: !!AMO_ACCESS_TOKEN,
      tokenLength: AMO_ACCESS_TOKEN ? AMO_ACCESS_TOKEN.length : 0,
      tokenPreview: AMO_ACCESS_TOKEN ? AMO_ACCESS_TOKEN.substring(0, 20) + '...' : 'Нет токена'
    });

  } catch (error) {
    console.error('❌ Ошибка в тестовой функции:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 