// src/tests/monitorChannelsTest.js
const { monitorChannels } = require('../tasks/monitorChannels');
const logger = require('../utils/logger');

async function runTest() {
    try {
        logger.info('\n🧪 Teste de Atualização de Rankings');
        const result = await monitorChannels();
        
        if (result) {
            logger.success('✅ Teste concluído com sucesso');
        } else {
            logger.error('❌ Teste falhou');
        }
    } catch (error) {
        logger.error('❌ Erro no teste:', error);
        process.exit(1);
    }
}

runTest();