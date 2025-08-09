// Специальный отладочный endpoint для тестирования статуса "сегодня"
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
    const { branch } = req.query;
    console.log(`🔍 Тестируем статус 'сегодня' для филиала: ${branch}`);

    if (!AMO_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'AmoCRM токен не настроен' });
    }

    // Определяем pipeline_id в зависимости от филиала
    let pipelineId;
    if (branch === 'Полевая') {
      pipelineId = '5998579'; // Полевая 72
    } else if (branch === 'МСК') {
      pipelineId = '5096620'; // Московское ш. 43
    } else {
      return res.status(400).json({ error: 'Неизвестный филиал' });
    }

    // Получаем информацию о воронке и её статусах
    const pipelineUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads/pipelines/${pipelineId}`;
    console.log(`🌐 Запрос информации о воронке: ${pipelineUrl}`);

    const pipelineResponse = await fetch(pipelineUrl, {
      headers: {
        'Authorization': `Bearer ${AMO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!pipelineResponse.ok) {
      const errorText = await pipelineResponse.text();
      console.error(`❌ Ошибка AmoCRM API: ${pipelineResponse.status} - ${errorText}`);
      throw new Error(`Ошибка AmoCRM API: ${pipelineResponse.status} - ${errorText}`);
    }

    const pipelineData = await pipelineResponse.json();
    console.log(`📊 Получены данные о воронке:`, JSON.stringify(pipelineData, null, 2));

    // Получаем все сделки из воронки
    const leadsUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads?pipeline_id=${pipelineId}&limit=250`;
    console.log(`🌐 Запрос сделок: ${leadsUrl}`);

    const leadsResponse = await fetch(leadsUrl, {
      headers: {
        'Authorization': `Bearer ${AMO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!leadsResponse.ok) {
      const errorText = await leadsResponse.text();
      throw new Error(`Ошибка AmoCRM API: ${leadsResponse.status} - ${errorText}`);
    }

    const leadsData = await leadsResponse.json();
    const leads = leadsData._embedded?.leads || [];

    // Анализируем статусы
    const statusCounts = {};
    leads.forEach(lead => {
      const statusId = lead.status_id.toString();
      if (!statusCounts[statusId]) {
        statusCounts[statusId] = 0;
      }
      statusCounts[statusId]++;
    });

    // Получаем названия статусов из воронки
    const statuses = pipelineData._embedded?.statuses || [];
    const statusNames = {};
    statuses.forEach(status => {
      statusNames[status.id] = status.name;
    });

    // Ищем статус "сегодня" по разным критериям
    const todayStatuses = statuses.filter(s => 
      s.name.toLowerCase().includes('сегодня') || 
      s.name.toLowerCase().includes('today') ||
      s.name.toLowerCase().includes('сейчас') ||
      s.name.toLowerCase().includes('now')
    );

    // Проверяем конкретный статус ID 45762658
    const specificStatus = statuses.find(s => s.id.toString() === '45762658');
    
    // Проверяем сделки в статусе "сегодня"
    const todayLeads = leads.filter(lead => {
      const statusName = statusNames[lead.status_id] || '';
      return statusName.toLowerCase().includes('сегодня') || 
             statusName.toLowerCase().includes('today') ||
             lead.status_id.toString() === '45762658';
    });

    const result = {
      success: true,
      pipeline: {
        id: pipelineData.id,
        name: pipelineData.name
      },
      statuses: statuses.map(status => ({
        id: status.id,
        name: status.name,
        color: status.color,
        sort: status.sort,
        isToday: status.name.toLowerCase().includes('сегодня') || 
                status.name.toLowerCase().includes('today')
      })),
      todayStatuses: todayStatuses.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color
      })),
      specificStatus45762658: specificStatus ? {
        id: specificStatus.id,
        name: specificStatus.name,
        color: specificStatus.color
      } : null,
      leadsAnalysis: {
        totalLeads: leads.length,
        statusCounts: Object.keys(statusCounts).map(statusId => ({
          statusId: statusId,
          statusName: statusNames[statusId] || 'Неизвестный статус',
          count: statusCounts[statusId],
          isToday: statusNames[statusId]?.toLowerCase().includes('сегодня') || 
                  statusNames[statusId]?.toLowerCase().includes('today')
        })),
        todayLeads: todayLeads.map(lead => ({
          id: lead.id,
          name: lead.name,
          status_id: lead.status_id,
          status_name: statusNames[lead.status_id] || 'Неизвестный статус'
        }))
      },
      recommendations: [],
      timestamp: new Date().toISOString(),
      platform: 'Vercel'
    };

    // Добавляем рекомендации
    if (todayLeads.length === 0) {
      result.recommendations.push('⚠️ Сделки в статусе "сегодня" НЕ НАЙДЕНЫ!');
      result.recommendations.push('🔍 Возможные причины:');
      result.recommendations.push('- Сделки не активны');
      result.recommendations.push('- Проблема с правами доступа');
      result.recommendations.push('- Сделки в другом статусе');
      
      if (specificStatus) {
        result.recommendations.push(`- Статус ID 45762658 существует: "${specificStatus.name}"`);
        result.recommendations.push(`- Но в нем нет сделок (возможно, все сделки закрыты или перемещены)`);
      } else {
        result.recommendations.push('- Статус ID 45762658 НЕ НАЙДЕН в воронке');
        result.recommendations.push('- Проверьте правильность ID статуса');
      }
    } else {
      result.recommendations.push(`✅ Найдено ${todayLeads.length} сделок в статусе "сегодня"`);
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Ошибка тестирования статуса "сегодня":', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      platform: 'Vercel'
    });
  }
}; 