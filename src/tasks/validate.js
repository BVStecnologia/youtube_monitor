const {
    diagnosticQuery,
    monitorChannels,
    testSupabaseConnection,
    testYoutubeAuth,
    processComments,
    processLeads
} = require('./monitorChannels');

const logger = require('../utils/logger');

async function validateAll() {
    try {
        logger.info('🚀 Iniciando validação completa do sistema...\n');

        // 1. Validar conexões
        logger.info('1️⃣ Validando conexões básicas...');
        
        logger.info('   → Testando Supabase...');
        const supabaseOk = await testSupabaseConnection();
        if (!supabaseOk) throw new Error('Falha na conexão com Supabase');
        
        logger.info('   → Testando YouTube...');
        const youtubeOk = await testYoutubeAuth(37);
        if (!youtubeOk) throw new Error('Falha na autenticação do YouTube');

        // 2. Diagnóstico do projeto
        logger.info('\n2️⃣ Executando diagnóstico do projeto...');
        await diagnosticQuery();

        // 3. Teste de monitoramento
        logger.info('\n3️⃣ Testando monitoramento de canais...');
        const monitorResult = await monitorChannels(37);
        if (!monitorResult.success) {
            throw new Error(`Falha no monitoramento: ${monitorResult.error}`);
        }

        // 4. Teste de processamento de comentários
        logger.info('\n4️⃣ Testando processamento de comentários...');
        const commentsResult = await processComments(37);
        if (!commentsResult) {
            throw new Error('Falha no processamento de comentários');
        }

        // 5. Teste de processamento de leads
        logger.info('\n5️⃣ Testando processamento de leads...');
        const leadsResult = await processLeads(37);
        if (!leadsResult) {
            throw new Error('Falha no processamento de leads');
        }

        // 6. Validação final
        logger.success('\n✅ Todos os testes completados com sucesso!');
        logger.info('\nResumo da validação:');
        logger.info('- Conexões: OK');
        logger.info('- Diagnóstico: OK');
        logger.info('- Monitoramento: OK');
        logger.info('- Processamento de Comentários: OK');
        logger.info('- Processamento de Leads: OK');

    } catch (error) {
        logger.error('\n❌ Erro durante a validação:', error);
        process.exit(1);
    }
}

// Executar validação
validateAll();