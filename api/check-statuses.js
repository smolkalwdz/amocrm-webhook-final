// Vercel Serverless Function для проверки статусов в AmoCRM
module.exports = async (req, res) => {
  // Динамический импорт node-fetch
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
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { branch } = req.query;
    console.log(`🔍 Проверяем статусы для филиала: ${branch}`);

    if (!AMO_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'AmoCRM токен не настроен' });
    }

    // Определяем pipeline_id в зависимости от филиала
    let pipelineId;
    if (branch === 'Полевая') {
      pipelineId = '5998579'; // Полевая 72
    } else if (branch === 'МСК') {
      pipelineId = '5096620'; // Московское ш. 43
    }

    // Получаем информацию о воронке и её статусах
    const pipelineUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads/pipelines/${pipelineId}`;
    console.log(`🌐 Запрос информации о воронке: ${pipelineUrl}`);

    const response = await fetch(pipelineUrl, {
      headers: {
        'Authorization': `Bearer ${AMO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AmoCRM API error: ${response.status} - ${errorText}`);
      throw new Error(`AmoCRM API error: ${response.status} - ${errorText}`);
    }

    const pipelineData = await response.json();
    console.log(`📊 Получены данные о воронке:`, JSON.stringify(pipelineData, null, 2));

    // Получаем все сделки из воронки для анализа статусов
    const leadsUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads?pipeline_id=${pipelineId}`;
    console.log(`🌐 Запрос сделок: ${leadsUrl}`);

    const leadsResponse = await fetch(leadsUrl, {
      headers: {
        'Authorization': `Bearer ${AMO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!leadsResponse.ok) {
      const errorText = await leadsResponse.text();
      throw new Error(`AmoCRM API error: ${leadsResponse.status} - ${errorText}`);
    }

    const leadsData = await leadsResponse.json();
    const leads = leadsData._embedded?.leads || [];

    // Анализируем статусы
    const statusCounts = {};
    leads.forEach(lead => {
      const statusId = lead.status_id.toString();
      if (!statusCounts[statusId]) {
        statusCounts[statusId] = {
          count: 0,
          names: []
        };
      }
      statusCounts[statusId].count++;
      if (!statusCounts[statusId].names.includes(lead.name)) {
        statusCounts[statusId].names.push(lead.name);
      }
    });

    // Получаем названия статусов из воронки
    const statuses = pipelineData._embedded?.statuses || [];
    const statusNames = {};
    statuses.forEach(status => {
      statusNames[status.id] = status.name;
    });

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
        sort: status.sort
      })),
      leadsAnalysis: {
        totalLeads: leads.length,
        statusCounts: Object.keys(statusCounts).map(statusId => ({
          statusId: statusId,
          statusName: statusNames[statusId] || 'Неизвестный статус',
          count: statusCounts[statusId].count,
          sampleNames: statusCounts[statusId].names.slice(0, 3)
        }))
      },
      timestamp: new Date().toISOString(),
      platform: 'Vercel'
    });

  } catch (error) {
    console.error('❌ Ошибка проверки статусов:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      platform: 'Vercel'
    });
  }
}; 