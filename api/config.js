// Конфигурация статусов AmoCRM по филиалам
module.exports = {
  branches: {
    'МСК': {
      pipelineId: '5096620', // Московское ш. 43
      statuses: {
        today: '45762658',      // Сегодня
        confirmed: '45762659',  // Подтверждено
        completed: '45762660',  // Завершено
        cancelled: '45762661'   // Отменено
      }
    },
    'Полевая': {
      pipelineId: '5998579', // Полевая 72
      statuses: {
        today: '52167655',      // Сегодня
        confirmed: '52167656',  // Подтверждено
        completed: '52167657',  // Завершено
        cancelled: '52167658'   // Отменено
      }
    }
  },
  
  // Общие настройки
  defaultLimit: 250,
  retryAttempts: 3,
  timeoutMs: 10000,
  
  // Названия статусов для поиска
  statusKeywords: {
    today: ['сегодня', 'today', 'сейчас', 'now'],
    confirmed: ['подтверждено', 'confirmed', 'подтвержден'],
    completed: ['завершено', 'completed', 'выполнено'],
    cancelled: ['отменено', 'cancelled', 'отменен']
  }
}; 