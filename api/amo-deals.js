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
    console.log(`🔍 Запрос сделок для филиала: ${branch}`);

    if (!AMO_ACCESS_TOKEN) {
      console.error('❌ AMO_ACCESS_TOKEN не настроен');
      return res.status(500).json({ 
        error: 'AmoCRM токен не настроен',
        deals: [] // Возвращаем пустой массив для демонстрации
      });
    }

    console.log(`✅ Токен найден: ${AMO_ACCESS_TOKEN.substring(0, 20)}...`);

    // Определяем pipeline_id в зависимости от филиала
    const pipelineId = branch === 'Полевая' ? '5096621' : '5096620'; // Замените на ваши ID воронок
    console.log(`🎯 Используем pipeline_id: ${pipelineId} для филиала ${branch}`);

    // Формируем URL для запроса
    const apiUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads?pipeline_id=${pipelineId}&status[]=47000707`;
    console.log(`🌐 Запрос к AmoCRM: ${apiUrl}`);

    // Получаем сделки из AmoCRM
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${AMO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 Ответ AmoCRM: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AmoCRM API error: ${response.status} - ${errorText}`);
      throw new Error(`AmoCRM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📊 Получены данные от AmoCRM:`, JSON.stringify(data, null, 2));
    
    const leads = data._embedded?.leads || [];
    console.log(`📊 Получено ${leads.length} сделок из AmoCRM для филиала ${branch}`);

    // Преобразуем сделки в нужный формат (БЕЗ фильтрации по дате)
    const deals = leads.map(lead => {
      const customFields = lead.custom_fields || [];
      console.log(`🔍 Обрабатываем сделку ${lead.id}:`, lead.name);
      
      const getFieldValue = (fieldName) => {
        const field = customFields.find(f => f.name === fieldName);
        return field ? field.values[0].value : '';
      };

      // Извлекаем дату и время из поля "Дата и время брони"
      const datetime = getFieldValue('Дата и время брони');
      console.log(`📅 Дата и время брони для ${lead.id}: ${datetime}`);
      
      let time = '19:00';
      let bookingDate = null;
      
      if (datetime) {
        try {
          if (typeof datetime === 'number' || !isNaN(datetime)) {
            const date = new Date(parseInt(datetime) * 1000);
            time = date.toTimeString().slice(0, 5);
            bookingDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
            console.log(`✅ Парсинг Unix timestamp: ${datetime} -> ${bookingDate} ${time}`);
          } else if (datetime.includes(' ')) {
            const parts = datetime.split(' ');
            if (parts.length >= 2) {
              time = parts[1].substring(0, 5);
              // Пытаемся извлечь дату из строки
              const datePart = parts[0];
              if (datePart.includes('.')) {
                const [day, month, year] = datePart.split('.');
                bookingDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                console.log(`✅ Парсинг строки даты: ${datetime} -> ${bookingDate} ${time}`);
              }
            }
          }
        } catch (e) {
          console.error('❌ Ошибка парсинга времени:', e);
        }
      }

      const deal = {
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
        status: lead.status_id,
        bookingDate: bookingDate // Добавляем дату брони
      };

      console.log(`📋 Создана сделка: ${deal.name} на ${deal.bookingDate} в ${deal.time}`);
      return deal;
    });

    console.log(`✅ Обработано ${deals.length} сделок (все доступные)`);

    res.status(200).json({
      success: true,
      deals: deals,
      timestamp: new Date().toISOString(),
      totalLeads: leads.length,
      processedDeals: deals.length
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
        status: '47000707',
        bookingDate: '2025-08-08'
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
        status: '47000707',
        bookingDate: '2025-08-09'
      }
    ].filter(deal => deal.branch === (branch || 'МСК'));

    console.log(`🔄 Возвращаем тестовые данные: ${mockDeals.length} сделок`);

    res.status(200).json({
      success: false,
      error: error.message,
      deals: mockDeals,
      timestamp: new Date().toISOString(),
      debug: {
        tokenConfigured: !!process.env.AMO_ACCESS_TOKEN,
        tokenLength: process.env.AMO_ACCESS_TOKEN ? process.env.AMO_ACCESS_TOKEN.length : 0,
        branch: branch,
        pipelineId: branch === 'Полевая' ? '5096621' : '5096620'
      }
    });
  }
}; 