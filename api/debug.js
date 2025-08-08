// Очень простая отладочная функция
module.exports = async (req, res) => {
  console.log('🐛 DEBUG: Функция debug.js вызвана');
  console.log('Время вызова:', new Date().toISOString());
  console.log('Метод запроса:', req.method);
  console.log('URL:', req.url);
  
  // Проверяем переменные окружения
  console.log('AMO_ACCESS_TOKEN существует:', !!process.env.AMO_ACCESS_TOKEN);
  console.log('Длина токена:', process.env.AMO_ACCESS_TOKEN ? process.env.AMO_ACCESS_TOKEN.length : 0);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.status(200).json({
    success: true,
    message: 'Debug функция работает!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    tokenExists: !!process.env.AMO_ACCESS_TOKEN,
    tokenLength: process.env.AMO_ACCESS_TOKEN ? process.env.AMO_ACCESS_TOKEN.length : 0
  });
}; 