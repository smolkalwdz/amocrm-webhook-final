// Vercel Serverless Function
module.exports = async (req, res) => {
  // Динамический импорт node-fetch
  const fetch = (await import('node-fetch')).default;
  
  // URL вашей канбан-доски
  const KANBAN_API_URL = 'https://smolkalwdz-kanban-backend-3d00.twc1.net';

  // Функция извлечения времени из даты (только время, без даты)
  function extractTimeFromDateTime(datetime) {
    if (!datetime) return '19:00';
    
    try {
      // Если это timestamp (число)
      if (typeof datetime === 'number' || !isNaN(datetime)) {
        const date = new Date(parseInt(datetime) * 1000);
        return date.toTimeString().slice(0, 5); // HH:MM
      }
      
      // Если это строка формата "23.08.2025 18:24"
      const parts = datetime.split(' ');
      if (parts.length >= 2) {
        const timePart = parts[1];
        const timeMatch = timePart.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const hours = timeMatch[1].padStart(2, '0');
          const minutes = timeMatch[2];
          return `${hours}:${minutes}`;
        }
      }
      
      return '19:00';
    } catch (error) {
      console.error('Ошибка парсинга времени:', error);
      return '19:00';
    }
  }

  // Функция преобразования зоны в ID
  function parseZoneToTableId(zoneName, branch) {
    if (!zoneName) return 1;
    
    const zoneNumber = parseInt(zoneName.replace(/\D/g, ''));
    
    const zoneMapping = {
      'МСК': {
        'Зона 1': 1, 'Зона 2': 2, 'Зона 3': 3, 'Зона 4': 4, 'Зона 5': 5,
        'Зона 6': 6, 'Зона 7': 7, 'Зона 8': 8, 'Зона 9': 9, 'Зона 10': 10,
        'Зона 11': 11, 'Зона 12': 12, 'Зона 13': 13, 'Зона 14': 14, 'Зона 15': 15,
        'Зона 16': 16, 'Зона 17': 17, 'Зона 18': 18, 'Зона 19': 19, 'Зона 20': 20,
        'Зона 21': 21, 'Зона 22': 22
      },
      'Полевая': {
        'Зона 1': 1, 'Зона 2': 2, 'Зона 3': 3, 'Зона 4': 4, 'Зона 5': 5,
        'Зона 6': 6, 'Зона 7': 7, 'Зона 8': 8, 'Зона 9': 9, 'Зона 10': 10,
        'Зона 11': 11, 'Зона 12': 12, 'Зона 13': 13, 'Зона 14': 14, 'Зона 15': 15,
        'Зона 16': 16, 'Зона 17': 17, 'Зона 18': 18, 'Зона 19': 19, 'Зона 20': 20
      }
    };
    
    return zoneMapping[branch]?.[zoneName] || zoneNumber || 1;
  }

  // Функция создания брони в канбан-доске
  async function createBookingInKanban(bookingData) {
    try {
      console.log('🔗 Отправляем в канбан-доску:', JSON.stringify(bookingData, null, 2));
      console.log('🌐 URL:', `${KANBAN_API_URL}/api/bookings`);
      
      const response = await fetch(`${KANBAN_API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });
      
      console.log('📡 Статус ответа:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Бронь создана в канбан-доске:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ Ошибка создания брони:', response.status, errorText);
      }
      
    } catch (error) {
      console.error('❌ Ошибка запроса к канбан-доске:', error.message);
    }
  }

  // Функция преобразования сделки в бронь
  async function processLeadToBooking(lead, contacts) {
    try {
      console.log('🔄 Обрабатываем сделку:', lead.id);
      
      const contact = contacts ? contacts.find(c => c.id === lead.contact_id) : null;
      const customFields = lead.custom_fields || [];
      
      console.log('📋 Кастомные поля:', customFields.map(f => f.name));
      
      const getFieldValue = (fieldName) => {
        const field = customFields.find(f => f.name === fieldName);
        return field ? field.values[0].value : '';
      };
      
      // Извлекаем время из поля "Дата и время брони" (только время)
      const datetime = getFieldValue('Дата и время брони');
      const time = extractTimeFromDateTime(datetime);
      console.log('⏰ Время из timestamp:', datetime, '→', time);
      
      // Определяем филиал
      const branchName = getFieldValue('Филиал');
      const branch = branchName.includes('Московское') ? 'МСК' : 
                     branchName.includes('Полевая') ? 'Полевая' : 'МСК';
      console.log('🏢 Филиал:', branchName, '→', branch);
      
      // Получаем телефон из контакта или кастомного поля
      const phone = contact ? contact.phone : getFieldValue('Телефон') || '';
      
      // Преобразуем данные
      const bookingData = {
        name: getFieldValue('Имя Брони') || contact?.name || lead.name || 'Без имени',
        time: time, // Только время, без даты
        guests: parseInt(getFieldValue('Кол-во гостей')) || 1,
        phone: phone, // Добавляем телефон
        source: 'AmoCRM',
        tableId: parseZoneToTableId(getFieldValue('Зона'), branch),
        branch: branch,
        isActive: false,
        comment: getFieldValue('Коммент к брони') || '',
        hasVR: getFieldValue('VR') === 'Да',
        hasShisha: getFieldValue('Кальян') === 'Да',
        amoLeadId: lead.id
      };
      
      console.log('📝 Создаем бронь:', JSON.stringify(bookingData, null, 2));
      await createBookingInKanban(bookingData);
      
    } catch (error) {
      console.error('❌ Ошибка обработки сделки:', error.message);
    }
  }

  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обрабатываем OPTIONS запросы
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Только POST запросы
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('📨 Получены данные из AmoCRM:', JSON.stringify(req.body, null, 2));
    
    // Парсим данные AmoCRM правильно
    const leads = [];
    const contacts = [];
    
    // Ищем сделки в формате leads[add][0][id], leads[add][0][name], etc.
    for (let i = 0; ; i++) {
      const leadIdKey = `leads[add][${i}][id]`;
      if (!req.body[leadIdKey]) break;
      
      // Собираем все поля для этой сделки
      const lead = {
        id: req.body[`leads[add][${i}][id]`],
        name: req.body[`leads[add][${i}][name]`],
        status_id: req.body[`leads[add][${i}][status_id]`],
        price: req.body[`leads[add][${i}][price]`],
        responsible_user_id: req.body[`leads[add][${i}][responsible_user_id]`],
        last_modified: req.body[`leads[add][${i}][last_modified]`],
        modified_user_id: req.body[`leads[add][${i}][modified_user_id]`],
        created_user_id: req.body[`leads[add][${i}][created_user_id]`],
        date_create: req.body[`leads[add][${i}][date_create]`],
        pipeline_id: req.body[`leads[add][${i}][pipeline_id]`],
        account_id: req.body[`leads[add][${i}][account_id]`],
        created_at: req.body[`leads[add][${i}][created_at]`],
        updated_at: req.body[`leads[add][${i}][updated_at]`],
        custom_fields: []
      };
      
      // Собираем кастомные поля
      for (let j = 0; ; j++) {
        const fieldIdKey = `leads[add][${i}][custom_fields][${j}][id]`;
        if (!req.body[fieldIdKey]) break;
        
        const customField = {
          id: req.body[`leads[add][${i}][custom_fields][${j}][id]`],
          name: req.body[`leads[add][${i}][custom_fields][${j}][name]`],
          values: [{
            value: req.body[`leads[add][${i}][custom_fields][${j}][values][0]`] || 
                   req.body[`leads[add][${i}][custom_fields][${j}][values][0][value]`] || '',
            enum: req.body[`leads[add][${i}][custom_fields][${j}][values][0][enum]`] || ''
          }]
        };
        
        lead.custom_fields.push(customField);
      }
      
      leads.push(lead);
    }
    
    console.log('🎯 Найдено сделок для обработки:', leads.length);
    console.log('📋 Первая сделка:', JSON.stringify(leads[0], null, 2));
    
    // Обрабатываем каждую сделку
    for (const lead of leads) {
      await processLeadToBooking(lead, contacts);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed!',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 