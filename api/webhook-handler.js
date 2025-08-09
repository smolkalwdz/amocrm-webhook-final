// Обработчик вебхуков от AmoCRM
module.exports = async (req, res) => {
  const fetch = (await import('node-fetch')).default;
  
  // Настройки AmoCRM
  const AMO_SUBDOMAIN = 'dungeonbron';
  const AMO_ACCESS_TOKEN = process.env.AMO_ACCESS_TOKEN;
  const WEBHOOK_SECRET = process.env.AMO_WEBHOOK_SECRET;
  
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Signature');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Метод не разрешен' });
    return;
  }
  
  try {
    // Проверяем подпись вебхука (если настроена)
    if (WEBHOOK_SECRET) {
      const signature = req.headers['x-webhook-signature'];
      if (!signature) {
        console.warn('⚠️ Вебхук без подписи');
      }
      // Здесь можно добавить проверку подписи
    }
    
    const webhookData = req.body;
    console.log('📥 Получен вебхук от AmoCRM:', JSON.stringify(webhookData, null, 2));
    
    // Проверяем тип события
    const eventType = webhookData.event_type || 'unknown';
    const leadId = webhookData.leads?.add?.[0]?.id || 
                   webhookData.leads?.update?.[0]?.id || 
                   webhookData.leads?.delete?.[0]?.id;
    
    if (!leadId) {
      console.warn('⚠️ Вебхук без ID сделки');
      return res.status(200).json({ 
        status: 'ignored', 
        message: 'Вебхук без ID сделки' 
      });
    }
    
    // Обрабатываем разные типы событий
    let action = 'unknown';
    if (webhookData.leads?.add) {
      action = 'add';
    } else if (webhookData.leads?.update) {
      action = 'update';
    } else if (webhookData.leads?.delete) {
      action = 'delete';
    }
    
    console.log(`🔄 Обрабатываем событие: ${action} для сделки ${leadId}`);
    
    // Получаем актуальные данные сделки
    let leadData = null;
    if (action !== 'delete') {
      try {
        const leadUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads/${leadId}`;
        const response = await fetch(leadUrl, {
          headers: {
            'Authorization': `Bearer ${AMO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const leadResponse = await response.json();
          leadData = leadResponse;
          console.log(`✅ Получены данные сделки ${leadId}:`, leadResponse.name);
        } else {
          console.error(`❌ Ошибка получения сделки ${leadId}:`, response.status);
        }
      } catch (error) {
        console.error(`❌ Ошибка API при получении сделки ${leadId}:`, error.message);
      }
    }
    
    // Определяем филиал по pipeline_id
    let branch = 'unknown';
    if (leadData) {
      const pipelineId = leadData.pipeline_id?.toString();
      if (pipelineId === '5096620') {
        branch = 'МСК';
      } else if (pipelineId === '5998579') {
        branch = 'Полевая';
      }
    }
    
    // Логируем результат обработки
    const result = {
      status: 'processed',
      timestamp: new Date().toISOString(),
      event: {
        type: eventType,
        action: action,
        leadId: leadId
      },
      lead: leadData ? {
        id: leadData.id,
        name: leadData.name,
        pipeline_id: leadData.pipeline_id,
        status_id: leadData.status_id,
        branch: branch
      } : null,
      message: `Событие ${action} для сделки ${leadId} обработано`
    };
    
    console.log('✅ Вебхук обработан:', result);
    
    // Здесь можно добавить логику для:
    // - Обновления данных в вашей системе
    // - Отправки уведомлений
    // - Синхронизации с другими сервисами
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Ошибка обработки вебхука:', error.message);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 