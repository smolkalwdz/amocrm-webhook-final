// Проверка здоровья системы и конфигурации AmoCRM
module.exports = async (req, res) => {
  const fetch = (await import('node-fetch')).default;
  
  // Настройки AmoCRM
  const AMO_SUBDOMAIN = 'dungeonbron';
  const AMO_ACCESS_TOKEN = process.env.AMO_ACCESS_TOKEN;
  
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Метод не разрешен' });
    return;
  }
  
  try {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      platform: 'Vercel',
      status: 'checking',
      checks: {}
    };
    
    // Проверка 1: Наличие токена
    healthCheck.checks.accessToken = {
      status: AMO_ACCESS_TOKEN ? 'ok' : 'error',
      message: AMO_ACCESS_TOKEN ? 'Токен настроен' : 'Токен не настроен'
    };
    
    // Проверка 2: Подключение к AmoCRM API
    if (AMO_ACCESS_TOKEN) {
      try {
        const testUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/account`;
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': `Bearer ${AMO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        healthCheck.checks.amoApi = {
          status: response.ok ? 'ok' : 'error',
          message: response.ok ? 'API доступен' : `API недоступен: ${response.status}`,
          responseTime: Date.now()
        };
      } catch (error) {
        healthCheck.checks.amoApi = {
          status: 'error',
          message: `Ошибка подключения: ${error.message}`
        };
      }
    }
    
    // Проверка 3: Конфигурация филиалов
    try {
      const config = require('./config.js');
      healthCheck.checks.config = {
        status: 'ok',
        message: `Настроено ${Object.keys(config.branches).length} филиалов`,
        branches: Object.keys(config.branches)
      };
    } catch (error) {
      healthCheck.checks.config = {
        status: 'error',
        message: `Ошибка конфигурации: ${error.message}`
      };
    }
    
    // Проверка 4: Переменные окружения
    healthCheck.checks.environment = {
      status: 'ok',
      message: 'Переменные окружения проверены',
      variables: {
        AMO_ACCESS_TOKEN: AMO_ACCESS_TOKEN ? '***' : 'не настроен',
        NODE_ENV: process.env.NODE_ENV || 'не указан',
        VERCEL_ENV: process.env.VERCEL_ENV || 'не указан'
      }
    };
    
    // Определяем общий статус
    const allChecks = Object.values(healthCheck.checks);
    const errorChecks = allChecks.filter(check => check.status === 'error');
    
    if (errorChecks.length === 0) {
      healthCheck.status = 'healthy';
      healthCheck.message = 'Все системы работают нормально';
    } else if (errorChecks.length < allChecks.length) {
      healthCheck.status = 'degraded';
      healthCheck.message = `Частичные проблемы: ${errorChecks.length} из ${allChecks.length} проверок не прошли`;
    } else {
      healthCheck.status = 'unhealthy';
      healthCheck.message = 'Критические проблемы в системе';
    }
    
    // Возвращаем результат
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
    
  } catch (error) {
    console.error('❌ Ошибка проверки здоровья системы:', error.message);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      platform: 'Vercel',
      status: 'error',
      error: error.message
    });
  }
}; 