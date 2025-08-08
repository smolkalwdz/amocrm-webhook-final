// Функция для получения всех воронок из AmoCRM
module.exports = async (req, res) => {
  const fetch = (await import('node-fetch')).default;
  const AMO_SUBDOMAIN = 'dungeonbron';
  const AMO_ACCESS_TOKEN = process.env.AMO_ACCESS_TOKEN;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (!AMO_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'AmoCRM токен не настроен' });
    }

    // Получаем все воронки
    const apiUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads/pipelines`;
    console.log(`🌐 Запрос воронок: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${AMO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`AmoCRM API error: ${response.status}`);
    }

    const data = await response.json();
    const pipelines = data._embedded?.pipelines || [];

    console.log(`📊 Найдено ${pipelines.length} воронок:`);
    pipelines.forEach(pipeline => {
      console.log(`   - ID: ${pipeline.id}, Название: ${pipeline.name}`);
      if (pipeline._embedded?.statuses) {
        console.log(`     Статусы:`);
        pipeline._embedded.statuses.forEach(status => {
          console.log(`       - ID: ${status.id}, Название: ${status.name}`);
        });
      }
    });

    res.status(200).json({
      success: true,
      pipelines: pipelines,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка получения воронок:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 