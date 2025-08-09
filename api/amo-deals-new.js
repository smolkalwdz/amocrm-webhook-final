// Vercel Serverless Function для получения сделок из AmoCRM
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
    const { branch, status } = req.query; // Получаем филиал и статус из параметров
    console.log(`🔍 Запрос сделок для филиала: ${branch}, статус: ${status || 'по умолчанию'}`);
    console.log(`🔍 Все параметры запроса:`, req.query);
    console.log(`🔍 User-Agent:`, req.headers['user-agent']);
    console.log(`🔍 Origin:`, req.headers['origin']);

    if (!AMO_ACCESS_TOKEN) {
      console.error('❌ AMO_ACCESS_TOKEN не настроен');
      return res.status(500).json({ 
        error: 'AmoCRM токен не настроен',
        deals: [] // Возвращаем пустой массив для демонстрации
      });
    }

    console.log(`✅ Токен найден: ${AMO_ACCESS_TOKEN.substring(0, 20)}...`);

    // Определяем pipeline_id и status_id в зависимости от филиала
    let pipelineId, statusId;
    if (branch === 'Полевая') {
      pipelineId = '5998579'; // Полевая 72
      statusId = '52167655'; // Сегодня
    } else if (branch === 'МСК') {
      pipelineId = '5096620'; // Московское ш. 43
      
      // Позволяем переопределить статус через параметр
      if (status) {
        statusId = status;
        console.log(`🎯 Используем переопределенный status_id: ${statusId}`);
      } else {
        // Используем статус "сегодня" для МСК
        statusId = '45762658'; // Сегодня
        console.log(`📝 Для МСК показываем сделки из статуса "сегодня" (45762658)`);
      }
    }
    console.log(`🎯 Используем pipeline_id: ${pipelineId} и status_id: ${statusId} для филиала ${branch}`);

    // Получаем ВСЕ сделки из воронки (без фильтра по статусу в URL)
    const apiUrl = `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads?pipeline_id=${pipelineId}&limit=250`;
    console.log(`🌐 Запрос к AmoCRM (все сделки): ${apiUrl}`);
    console.log(`🎯 Будем фильтровать по статусу ID: ${statusId} на сервере`);

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
    
    const allLeads = data._embedded?.leads || [];
    console.log(`📊 Получено ${allLeads.length} сделок из AmoCRM для филиала ${branch}`);

    // Получаем сегодняшнюю дату
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`📅 Сегодняшняя дата: ${todayString}`);

    // Анализируем статусы всех полученных сделок
    console.log(`🔍 Анализируем статусы всех полученных сделок:`);
    const statusCounts = {};
    allLeads.forEach((lead, index) => {
      const statusId = lead.status_id.toString();
      if (!statusCounts[statusId]) {
        statusCounts[statusId] = 0;
      }
      statusCounts[statusId]++;
      
      if (index < 10) { // Показываем первые 10 сделок
        console.log(`   ${index + 1}. ${lead.name} - статус ID: ${statusId} (ожидаем: ${statusId})`);
      }
    });
    
    console.log(`📊 Распределение по статусам:`, statusCounts);

    // Фильтруем сделки по нужному статусу
    console.log(`🔍 Фильтруем сделки по статусу ${statusId}...`);
    const filteredLeads = allLeads.filter(lead => {
      const isCorrectStatus = lead.status_id.toString() === statusId;
      if (isCorrectStatus) {
        console.log(`✅ Найдена сделка в нужном статусе: ${lead.name} (статус: ${lead.status_id})`);
        console.log(`   - ID сделки: ${lead.id}`);
        console.log(`   - Название: ${lead.name}`);
        console.log(`   - Статус: ${lead.status_id}`);
        console.log(`   - Pipeline: ${lead.pipeline_id}`);
        console.log(`   - Создана: ${lead.created_at}`);
        console.log(`   - Обновлена: ${lead.updated_at}`);
        console.log(`   - Закрыта: ${lead.closed_at || 'не закрыта'}`);
        console.log(`   - Активна: ${!lead.closed_at ? 'ДА' : 'НЕТ'}`);
      }
      return isCorrectStatus;
    });

    console.log(`✅ Отфильтровано ${filteredLeads.length} сделок из ${allLeads.length} по статусу ${statusId}`);

    // Специальная проверка для статуса "сегодня"
    if (statusId === '45762658') {
      console.log(`🎯 СПЕЦИАЛЬНАЯ ПРОВЕРКА для статуса "сегодня":`);
      console.log(`   - Ищем сделки со статусом ID: 45762658`);
      
      // Проверяем все сделки на предмет статуса "сегодня"
      const todayLeads = allLeads.filter(lead => lead.status_id.toString() === '45762658');
      console.log(`   - Найдено сделок со статусом 45762658: ${todayLeads.length}`);
      
      if (todayLeads.length === 0) {
        console.log(`   ⚠️ Сделки со статусом 45762658 НЕ НАЙДЕНЫ!`);
        console.log(`   🔍 Проверяем все доступные статусы:`);
        const allStatuses = [...new Set(allLeads.map(lead => lead.status_id))];
        allStatuses.forEach(statusId => {
          const count = allLeads.filter(lead => lead.status_id.toString() === statusId.toString()).length;
          console.log(`     - Статус ${statusId}: ${count} сделок`);
        });
      } else {
        console.log(`   ✅ Найдены сделки в статусе "сегодня":`);
        todayLeads.forEach((lead, index) => {
          console.log(`     ${index + 1}. ${lead.name} (ID: ${lead.id})`);
        });
      }
    }

    // Преобразуем отфильтрованные сделки в нужный формат
    console.log(`🔍 Преобразуем ${filteredLeads.length} отфильтрованных сделок в нужный формат`);
    
    const deals = filteredLeads.map(lead => {
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
        console.log(`   - status_id: ${lead.status_id} (${lead.name})`);
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

        console.log(`📋 Создана сделка: ${deal.name} на ${deal.bookingDate} в ${deal.time} (статус: ${deal.status})`);
        return deal;
      });

    console.log(`✅ Обработано ${deals.length} сделок из статуса ${statusId}`);
    if (deals.length > 0) {
      console.log(`📊 Сделки:`, deals.map(d => `${d.name} (${d.bookingDate} ${d.time}, статус: ${d.status})`));
    } else {
      console.log(`⚠️ Нет сделок в статусе ${statusId}`);
      console.log(`🔍 Возможные причины:`);
      console.log(`   - Статус ID ${statusId} не существует в воронке`);
      console.log(`   - В статусе ${statusId} нет активных сделок`);
      console.log(`   - Проблема с правами доступа к статусу`);
    }

    res.status(200).json({
      success: true,
      deals: deals,
      timestamp: new Date().toISOString(),
      today: todayString,
      totalLeads: allLeads.length,
      filteredDeals: deals.length,
      platform: 'Vercel',
      note: `Для филиала ${branch} используется статус ${statusId}`,
      debug: {
        requestedStatusId: statusId,
        pipelineId: pipelineId,
        apiUrl: apiUrl,
        totalLeadsReceived: allLeads.length,
        statusDistribution: statusCounts,
        filteringApplied: true
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения сделок из AmoCRM:', error.message);
    
    // Возвращаем тестовые данные в случае ошибки
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
        pipelineId: branch === 'Полевая' ? '5998579' : '5096620'
      }
    });
  }
};