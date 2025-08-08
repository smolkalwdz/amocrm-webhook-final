// Vercel Serverless Function для получения сделок из AmoCRM
module.exports = async (req, res) => {
  // Динамический импорт node-fetch
  const fetch = (await import('node-fetch')).default;

  // Настройки AmoCRM
  const AMO_SUBDOMAIN = 'dungeonbron'; // Ваш поддомен AmoCRM
  const AMO_ACCESS_TOKEN = process.env.AMO_ACCESS_TOKEN; // Токен доступа к AmoCRM

  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обрабатываем OPTIONS запросы
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Только GET запросы
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { branch } = req.query; // Получаем филиал из параметров

    if (!AMO_ACCESS_TOKEN) {
      console.error('❌ AMO_ACCESS_TOKEN не настроен');
      return res.status(500).json({ 
        error: 'AmoCRM токен не настроен',
        deals: [] // Возвращаем пустой массив для демонстрации
      });
    }

    // Определяем pipeline_id в зависимости от филиала
    const pipelineId = branch === 'Полевая' ? '5096621' : '5096620'; // Замените на ваши ID воронок

    // Получаем сделки из AmoCRM
    const response = await fetch(`https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads?pipeline_id=${pipelineId}&status[]=47000707`, {
      headers: {
        'Authorization': `Bearer ${AMO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`AmoCRM API error: ${response.status}`);
    }

    const data = await response.json();
    const leads = data._embedded?.leads || [];

    console.log(`📊 Получено ${leads.length} сделок из AmoCRM для филиала ${branch}`);

    // Преобразуем сделки в нужный формат
    const deals = leads.map(lead => {
      const customFields = lead.custom_fields || [];
      
      const getFieldValue = (fieldName) => {
        const field = customFields.find(f => f.name === fieldName);
        return field ? field.values[0].value : '';
      };

      // Извлекаем время из поля "Дата и время брони"
      const datetime = getFieldValue('Дата и время брони');
      let time = '19:00';
      if (datetime) {
        try {
          if (typeof datetime === 'number' || !isNaN(datetime)) {
            const date = new Date(parseInt(datetime) * 1000);
            time = date.toTimeString().slice(0, 5);
          } else if (datetime.includes(' ')) {
            time = datetime.split(' ')[1].substring(0, 5);
          }
        } catch (e) {
          console.error('Ошибка парсинга времени:', e);
        }
      }

      return {
        id: lead.id.toString(),
        name: getFieldValue('Имя Брони') || lead.name || 'Без имени',
        time: time,
        guests: parseInt(getFieldValue('Кол-во гостей')) || 1,
        phone: getFieldValue('Телефон') || '',
        comment: getFieldValue('Коммент к брони') || '',
        branch: branch,
        zone: getFieldValue('Зона') || 'Зона 1',
        hasVR: getFieldValue('VR') === 'Да',
        hasShisha: getFieldValue('Кальян') === 'Да',
        leadId: lead.id,
        status: lead.status_id
      };
    });

    console.log(`✅ Обработано ${deals.length} сделок`);

    res.status(200).json({
      success: true,
      deals: deals,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка получения сделок из AmoCRM:', error.message);
    
    // Возвращаем тестовые данные в случае ошибки
    const mockDeals = [
      {
        id: '1',
        name: 'Иван Петров',
        time: '19:00',
        guests: 4,
        phone: '+7 (999) 123-45-67',
        comment: 'День рождения',
        branch: branch || 'МСК',
        zone: 'Зона 3',
        hasVR: true,
        hasShisha: false,
        leadId: '1',
        status: '47000707'
      },
      {
        id: '2',
        name: 'Мария Сидорова',
        time: '20:30',
        guests: 2,
        phone: '+7 (999) 234-56-78',
        comment: 'Романтический ужин',
        branch: branch || 'Полевая',
        zone: 'Зона 1',
        hasVR: false,
        hasShisha: true,
        leadId: '2',
        status: '47000707'
      }
    ].filter(deal => deal.branch === (branch || 'МСК'));

    res.status(200).json({
      success: false,
      error: error.message,
      deals: mockDeals,
      timestamp: new Date().toISOString()
    });
  }
}; 