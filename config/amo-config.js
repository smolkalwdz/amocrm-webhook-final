// Основная конфигурация AmoCRM
const amoConfig = {
  // Настройки AmoCRM
  amo: {
    subdomain: 'dungeonbron',
    accessToken: process.env.AMO_ACCESS_TOKEN,
    webhookSecret: process.env.AMO_WEBHOOK_SECRET,
    baseUrl: 'https://dungeonbron.amocrm.ru',
    apiVersion: 'v4'
  },
  
  // Настройки API
  api: {
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    maxConcurrent: 5
  },
  
  // Настройки вебхуков
  webhooks: {
    enabled: true,
    events: ['add', 'update', 'delete'],
    retryAttempts: 3,
    retryDelay: 5000
  },
  
  // Настройки логирования
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableApiLogs: process.env.ENABLE_API_LOGS === 'true',
    enableWebhookLogs: process.env.ENABLE_WEBHOOK_LOGS === 'true',
    enablePerformanceLogs: process.env.ENABLE_PERFORMANCE_LOGS === 'true'
  },
  
  // Настройки кэширования
  caching: {
    enabled: process.env.ENABLE_CACHING === 'true',
    ttl: 300000, // 5 минут
    maxSize: 1000
  },
  
  // Настройки уведомлений
  notifications: {
    enabled: process.env.ENABLE_NOTIFICATIONS === 'true',
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#amo-integration'
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID
    }
  },
  
  // Настройки мониторинга
  monitoring: {
    enabled: process.env.ENABLE_MONITORING === 'true',
    healthCheckInterval: 60000, // 1 минута
    alertThreshold: 3, // Количество ошибок подряд для алерта
    metricsEndpoint: process.env.METRICS_ENDPOINT
  }
};

// Загружаем конфигурацию филиалов
let branchesConfig = {};
try {
  branchesConfig = require('../api/config.js');
} catch (error) {
  console.warn('⚠️ Не удалось загрузить конфигурацию филиалов:', error.message);
}

// Объединяем конфигурации
const fullConfig = {
  ...amoConfig,
  branches: branchesConfig.branches || {},
  statusKeywords: branchesConfig.statusKeywords || {}
};

// Валидация конфигурации
const validateConfig = () => {
  const errors = [];
  
  if (!fullConfig.amo.accessToken) {
    errors.push('AMO_ACCESS_TOKEN не настроен');
  }
  
  if (!fullConfig.amo.subdomain) {
    errors.push('Subdomain AmoCRM не настроен');
  }
  
  if (Object.keys(fullConfig.branches).length === 0) {
    errors.push('Конфигурация филиалов не загружена');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// Получение конфигурации филиала
const getBranchConfig = (branchName) => {
  return fullConfig.branches[branchName] || null;
};

// Получение ID статуса по названию
const getStatusId = (branchName, statusType) => {
  const branchConfig = getBranchConfig(branchName);
  if (!branchConfig || !branchConfig.statuses) {
    return null;
  }
  return branchConfig.statuses[statusType] || null;
};

// Получение pipeline ID филиала
const getPipelineId = (branchName) => {
  const branchConfig = getBranchConfig(branchName);
  return branchConfig ? branchConfig.pipelineId : null;
};

// Проверка доступности API
const checkApiHealth = async () => {
  try {
    const response = await fetch(`${fullConfig.amo.baseUrl}/api/${fullConfig.amo.apiVersion}/account`, {
      headers: {
        'Authorization': `Bearer ${fullConfig.amo.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: fullConfig.api.timeout
    });
    
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      statusCode: response.status,
      message: response.ok ? 'API доступен' : 'API недоступен'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      message: 'Ошибка подключения к API'
    };
  }
};

module.exports = {
  config: fullConfig,
  validateConfig,
  getBranchConfig,
  getStatusId,
  getPipelineId,
  checkApiHealth
}; 