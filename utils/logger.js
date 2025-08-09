// Система логирования для проекта
const logger = {
  // Основные уровни логирования
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[INFO] ${timestamp} - ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
    
    // В продакшене можно добавить запись в файл или внешний сервис
    if (process.env.NODE_ENV === 'production') {
      // TODO: Добавить запись в лог-файл или внешний сервис
    }
  },
  
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[ERROR] ${timestamp} - ${message}`;
    
    if (error) {
      console.error(logMessage, error);
      
      // Детальная информация об ошибке
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
      if (error.message) {
        console.error('Error message:', error.message);
      }
    } else {
      console.error(logMessage);
    }
    
    // В продакшене можно добавить отправку уведомлений об ошибках
    if (process.env.NODE_ENV === 'production') {
      // TODO: Добавить отправку уведомлений в Slack/Telegram
    }
  },
  
  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[WARN] ${timestamp} - ${message}`;
    
    if (data) {
      console.warn(logMessage, data);
    } else {
      console.warn(logMessage);
    }
  },
  
  debug: (message, data = null) => {
    // Debug логи только в режиме разработки
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      const logMessage = `[DEBUG] ${timestamp} - ${message}`;
      
      if (data) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  },
  
  // Специальные логи для AmoCRM
  amo: {
    api: (message, data = null) => {
      logger.info(`[AMO-API] ${message}`, data);
    },
    
    webhook: (message, data = null) => {
      logger.info(`[AMO-WEBHOOK] ${message}`, data);
    },
    
    error: (message, error = null) => {
      logger.error(`[AMO-ERROR] ${message}`, error);
    }
  },
  
  // Специальные логи для Kanban
  kanban: {
    booking: (message, data = null) => {
      logger.info(`[KANBAN-BOOKING] ${message}`, data);
    },
    
    table: (message, data = null) => {
      logger.info(`[KANBAN-TABLE] ${message}`, data);
    },
    
    error: (message, error = null) => {
      logger.error(`[KANBAN-ERROR] ${message}`, error);
    }
  },
  
  // Логирование производительности
  performance: (operation, duration, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[PERF] ${timestamp} - ${operation} took ${duration}ms`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  },
  
  // Группировка логов
  group: (label, callback) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(label);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  },
  
  // Таблица логов
  table: (data, columns = null) => {
    if (process.env.NODE_ENV === 'development') {
      if (columns) {
        console.table(data, columns);
      } else {
        console.table(data);
      }
    }
  }
};

module.exports = logger; 