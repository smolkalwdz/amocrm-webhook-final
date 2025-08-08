// Vercel Serverless Function для получения сделок из AmoCRM
// ПОКАЗЫВАЕМ ТОЛЬКО БРОНИ НА СЕГОДНЯ
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

    // Получаем сегодняшнюю дату
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`📅 Сегодняшняя дата: ${todayString}`);

    // Преобразуем сделки в нужный формат и фильтруем по дате
    const deals = leads
      .map(lead => {
        const customFields = lead.custom_fields_values || [];
        console.log(`🔍 Обрабатываем сделку ${lead.id}:`, lead.name);
        console.log(`📋 Все поля сделки ${lead.id}:`, customFields.map(f => `${f.field_name}: ${f.values[0]?.value}`));
        
        // Ищем поле с датой брони
        const dateField = customFields.find(f => 
          f.field_name.toLowerCase().includes('дата') || 
          f.field_name.toLowerCase().includes('брони') ||
          f.field_name.toLowerCase().includes('время')
        );
        if (dateField) {
          console.log(`🎯 Найдено поле с датой: "${dateField.field_name}" = ${dateField.values[0]?.value}`);
        }
        
        const getFieldValue = (fieldName) => {
          const field = customFields.find(f => f.field_name === fieldName);
          const value = field ? field.values[0].value : '';
          console.log(`🔍 Поле "${fieldName}" для ${lead.id}:`, value);
          return value;
        };

        // Ищем поле с датой брони (пробуем разные варианты названий)
        let datetime = getFieldValue('Дата и время брони');
        if (!datetime) datetime = getFieldValue('Дата брони');
        if (!datetime) datetime = getFieldValue('Время брони');
        if (!datetime) datetime = getFieldValue('Дата');
        if (!datetime) datetime = getFieldValue('Время');
        
        // Проверяем стандартные поля сделки
        console.log(`📅 Стандартные поля сделки ${lead.id}:`);
        console.log(`   - created_at: ${lead.created_at}`);
        console.log(`   - updated_at: ${lead.updated_at}`);
        console.log(`   - closed_at: ${lead.closed_at}`);
        console.log(`   - status_id: ${lead.status_id}`);
        console.log(`   - pipeline_id: ${lead.pipeline_id}`);
        
        console.log(`📅 Сырые данные даты для ${lead.id}:`, datetime, `(тип: ${typeof datetime})`);
        
        let time = '19:00';
        let bookingDate = null;
        
        if (datetime) {
          try {
            if (typeof datetime === 'number' || !isNaN(datetime)) {
              // Если это Unix timestamp
              const date = new Date(parseInt(datetime) * 1000);
              time = date.toTimeString().slice(0, 5);
              bookingDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
              console.log(`✅ Парсинг Unix timestamp: ${datetime} -> ${bookingDate} ${time}`);
            } else if (typeof datetime === 'string') {
              if (datetime.includes(' ')) {
                // Если это строка "DD.MM.YYYY HH:MM"
                const parts = datetime.split(' ');
                if (parts.length >= 2) {
                  time = parts[1].substring(0, 5);
                  const datePart = parts[0];
                  if (datePart.includes('.')) {
                    const [day, month, year] = datePart.split('.');
                    bookingDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    console.log(`✅ Парсинг строки даты: ${datetime} -> ${bookingDate} ${time}`);
                  }
                }
              } else if (datetime.includes('.')) {
                // Только дата без времени
                const [day, month, year] = datetime.split('.');
                bookingDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                console.log(`✅ Парсинг только даты: ${datetime} -> ${bookingDate}`);
              }
            }
          } catch (e) {
            console.error('❌ Ошибка парсинга времени:', e);
          }
        } else {
          console.log(`⚠️ Поле "Дата и время брони" пустое для сделки ${lead.id}`);
        }

        const deal = {
          id: lead.id.toString(),
          name: getFieldValue('Имя Брони') || lead.name || 'Без имени',
          time: time,
          guests: parseInt(getFieldValue('Кол-во гостей')) || 1,
          phone: getFieldValue('Телефон') || '',
          comment: getFieldValue('Коммент к брони') || '',
          branch: getFieldValue('Филиал') || branch,
          zone: getFieldValue('Зона') || 'Зона 1',
          hasVR: getFieldValue('VR') === 'Да',
          hasShisha: getFieldValue('Кальян') === 'Да',
          leadId: lead.id,
          status: lead.status_id,
          bookingDate: bookingDate
        };

        console.log(`📋 Создана сделка: ${deal.name} на ${deal.bookingDate} в ${deal.time}`);
        return deal;
      })
      .filter(deal => {
        // Фильтруем только сделки на сегодня
        const isToday = deal.bookingDate === todayString;
        console.log(`🔍 Фильтр даты: ${deal.name} - ${deal.bookingDate} === ${todayString} = ${isToday}`);
        return isToday;
      });

    console.log(`✅ Обработано ${deals.length} сделок на сегодня (${todayString})`);
    if (deals.length > 0) {
      console.log(`📊 Сделки на сегодня:`, deals.map(d => `${d.name} (${d.bookingDate} ${d.time})`));
    } else {
      console.log(`⚠️ Нет сделок на сегодня (${todayString})`);
    }

    res.status(200).json({
      success: true,
      deals: deals,
      timestamp: new Date().toISOString(),
      today: todayString,
      totalLeads: leads.length,
      filteredDeals: deals.length,
      platform: 'Vercel'
    });

  } catch (error) {
    console.error('❌ Ошибка получения сделок из AmoCRM:', error.message);
    
    // Возвращаем тестовые данные в случае ошибки (только на сегодня)
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const mockDeals = [
      {
        id: '1',
        name: 'Иван Петров (Тест Vercel)',
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
        bookingDate: todayString
      },
      {
        id: '2',
        name: 'Мария Сидорова (Тест Vercel)',
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
        bookingDate: todayString
      }
    ].filter(deal => deal.branch === (branch || 'МСК'));

    console.log(`🔄 Возвращаем тестовые данные: ${mockDeals.length} сделок`);

    res.status(200).json({
      success: false,
      error: error.message,
      deals: mockDeals,
      timestamp: new Date().toISOString(),
      today: todayString,
      platform: 'Vercel',
      debug: {
        tokenConfigured: !!process.env.AMO_ACCESS_TOKEN,
        tokenLength: process.env.AMO_ACCESS_TOKEN ? process.env.AMO_ACCESS_TOKEN.length : 0,
        branch: branch,
        pipelineId: branch === 'Полевая' ? '5096621' : '5096620'
      }
    });
  }
}; 