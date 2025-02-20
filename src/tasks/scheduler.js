const cron = require('node-cron');
const { monitorChannelEngagement, processComments, processLeads } = require('./monitorChannels');
const logger = require('../utils/logger');

function startScheduler(projectId) {
    // Monitoramento a cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
        logger.info('Executando monitoramento programado...');
        await monitorChannelEngagement(projectId);
    });

    // Processamento de comentários a cada 1 hora
    cron.schedule('0 * * * *', async () => {
        logger.info('Processando comentários...');
        await processComments(projectId);
    });

    // Processamento de leads a cada 2 horas
    cron.schedule('0 */2 * * *', async () => {
        logger.info('Processando leads...');
        await processLeads(projectId);
    });
}

module.exports = { startScheduler };