require('dotenv').config();
const { checkEnvironment } = require('./src/utils/checkEnv');
const logger = require('./src/utils/logger');
const { 
    diagnosticQuery, 
    testSupabaseConnection, 
    testYoutubeAuth 
} = require('./src/tasks/monitorChannels');
const config = require('./src/config/config');

async function initialize() {
    logger.info('🚀 Iniciando sistema...\n');

    // 1. Verificar ambiente
    checkEnvironment();
    logger.success('Configuração carregada com sucesso!\n');

    try {
        // 2. Testar conexões
        logger.info('Testando conexões...');
        
        // 2.1 Teste Supabase
        logger.info('\n📦 Testando Supabase...');
        await testSupabaseConnection();

        // 2.2 Teste YouTube
        logger.info('\n🎥 Testando YouTube...');
        await testYoutubeAuth(config.project.defaultId);

        // 3. Diagnóstico completo
        logger.info('\n🔍 Executando diagnóstico...');
        await diagnosticQuery();

        logger.success('\n✨ Sistema inicializado com sucesso!');
        logger.info('\nPronto para iniciar monitoramento. Use:');
        logger.info('- npm run test    : Para executar testes');
        logger.info('- npm start      : Para iniciar o servidor');

    } catch (error) {
        logger.error('\n💥 Erro na inicialização:', error);
        process.exit(1);
    }
}

initialize();