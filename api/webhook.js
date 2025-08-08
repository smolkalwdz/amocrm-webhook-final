// Vercel Serverless Function
module.exports = async (req, res) => {
  // Динамический импорт node-fetch
  const fetch = (await import('node-fetch')).default;
  
  // URL вашей канбан-доски
  const KANBAN_API_URL = 'https://smolkalwdz-kanban-backend-3d00.twc1.net';

  // Функция извлечения времени из даты
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
      console.log('Отправляем в канбан-доску:', bookingData);
      
      const response = await fetch(`${KANBAN_API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Бронь создана в канбан-доске:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ Ошибка создания брони:', response.status, errorText);
      }
      
    } catch (error) {
      console.error('❌ Ошибка запроса к канбан-доске:', error);
    }
  }

  // Функция преобразования сделки в бронь
  async function processLeadToBooking(lead, contacts) {
    try {
      const contact = contacts ? contacts.find(c => c.id === lead.contact_id) : null;
      const customFields = lead.custom_fields || [];
      
      const getFieldValue = (fieldName) => {
        const field = customFields.find(f => f.name === fieldName);
        return field ? field.values[0].value : '';
      };
      
      // Извлекаем время из поля "Дата и время брони"
      const datetime = getFieldValue('Дата и время брони');
      const time = extractTimeFromDateTime(datetime);
      
      // Определяем филиал
      const branchName = getFieldValue('Филиал');
      const branch = branchName.includes('Московское') ? 'МСК' : 
                     branchName.includes('Полевая') ? 'Полевая' : 'МСК';
      
      // Преобразуем данные
      const bookingData = {
        name: getFieldValue('Имя Брони') || contact?.name || lead.name || 'Без имени',
        time: time,
        guests: parseInt(getFieldValue('Кол-во гостей')) || 1,
        phone: contact ? contact.phone : '',
        source: 'AmoCRM',
        tableId: parseZoneToTableId(getFieldValue('Зона'), branch),
        branch: branch,
        isActive: false,
        comment: getFieldValue('Коммент к брони') || '',
        hasVR: getFieldValue('VR') === 'Да',
        hasShisha: getFieldValue('Кальян') === 'Да',
        amoLeadId: lead.id
      };
      
      console.log('Создаем бронь:', bookingData);
      await createBookingInKanban(bookingData);
      
    } catch (error) {
      console.error('Ошибка обработки сделки:', error);
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
    console.log('Получены данные из AmoCRM:', JSON.stringify(req.body, null, 2));
    
    const { leads, contacts } = req.body;
    
    // Обрабатываем каждую сделку
    if (leads && leads.add) {
      for (const lead of leads.add) {
        await processLeadToBooking(lead, contacts);
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed!',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 