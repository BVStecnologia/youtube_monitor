require('dotenv').config();
const config = require('./src/config/config');
const { monitorChannelEngagement } = require('./src/tasks/monitorChannels');
const { startScheduler } = require('./src/tasks/scheduler');
const logger = require('./src/utils/logger');

const PROJECT_ID = config.project.defaultId;

// Iniciar o scheduler
startScheduler(PROJECT_ID);

// Manter processo ativo
const PORT = process.env.PORT || 3000;
require('http').createServer().listen(PORT, () => {
    logger.success(`Servidor rodando na porta ${PORT}`);
});