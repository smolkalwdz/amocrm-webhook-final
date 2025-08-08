// Отладочный endpoint для проверки всех сделок в воронке
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
    console.log(`🔍 Отладка воронки для филиала: ${branch}`);

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

    // Получаем ВСЕ сделки из воронки (без фильтрации)
    const leadsUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads?pipeline_id=${pipelineId}&limit=250`;
    console.log(`🌐 Запрос всех сделок: ${leadsUrl}`);

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
    const statusDetails = {};
    
    leads.forEach(lead => {
      const statusId = lead.status_id.toString();
      if (!statusCounts[statusId]) {
        statusCounts[statusId] = {
          count: 0,
          names: []
        };
      }
      statusCounts[statusId].count++;
      statusCounts[statusId].names.push(lead.name);
      
      // Сохраняем детали первой сделки для каждого статуса
      if (!statusDetails[statusId]) {
        statusDetails[statusId] = {
          id: lead.id,
          name: lead.name,
          status_id: lead.status_id,
          pipeline_id: lead.pipeline_id,
          created_at: lead.created_at,
          updated_at: lead.updated_at,
          custom_fields_values: lead.custom_fields_values || []
        };
      }
    });

    // Получаем названия статусов из воронки
    const statuses = pipelineData._embedded?.statuses || [];
    const statusNames = {};
    statuses.forEach(status => {
      statusNames[status.id] = status.name;
    });

    // Ищем статус "сегодня"
    const todayStatus = statuses.find(s => 
      s.name.toLowerCase().includes('сегодня') || 
      s.name.toLowerCase().includes('today')
    );

    res.status(200).json({
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
        isToday: status.name.toLowerCase().includes('сегодня') || status.name.toLowerCase().includes('today')
      })),
      todayStatus: todayStatus ? {
        id: todayStatus.id,
        name: todayStatus.name
      } : null,
      leadsAnalysis: {
        totalLeads: leads.length,
        statusCounts: Object.keys(statusCounts).map(statusId => ({
          statusId: statusId,
          statusName: statusNames[statusId] || 'Неизвестный статус',
          count: statusCounts[statusId].count,
          sampleNames: statusCounts[statusId].names.slice(0, 5),
          isToday: statusNames[statusId]?.toLowerCase().includes('сегодня') || statusNames[statusId]?.toLowerCase().includes('today')
        }))
      },
      sampleLeads: Object.keys(statusDetails).map(statusId => ({
        statusId: statusId,
        statusName: statusNames[statusId] || 'Неизвестный статус',
        sampleLead: statusDetails[statusId]
      })),
      timestamp: new Date().toISOString(),
      platform: 'Vercel'
    });

  } catch (error) {
    console.error('❌ Ошибка отладки воронки:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      platform: 'Vercel'
    });
  }
}; 