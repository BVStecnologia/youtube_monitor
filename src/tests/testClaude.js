// src/tests/testClaude.js
const { analyzeContent, summarizeContent } = require('../config/claude');
const logger = require('../utils/logger');

async function testClaude() {
    try {
        logger.info('\n🧪 Iniciando testes do Claude...\n');

        // Teste de análise
        logger.info('1️⃣ Testando análise de relevância...');
        const analysisResult = await analyzeContent(
            "Machine learning é uma área fascinante da inteligência artificial que permite que computadores aprendam com dados.",
            "Buscamos conteúdo sobre tecnologia e programação avançada"
        );
        
        if (analysisResult) {
            logger.info('\n📊 Resultado da análise:');
            logger.info(`→ Relevante: ${analysisResult.relevante}`);
            logger.info(`→ Score: ${analysisResult.score}`);
            logger.info(`→ Razão: ${analysisResult.razao}\n`);
        } else {
            logger.error('❌ Análise não retornou resultado\n');
        }

        // Teste de sumarização
        logger.info('2️⃣ Testando sumarização...');
        const summary = await summarizeContent(
            "A inteligência artificial está revolucionando diversos setores da indústria. " +
            "Empresas de todos os tamanhos estão adotando soluções baseadas em IA para automatizar processos, " +
            "melhorar a experiência do cliente e tomar decisões mais precisas. Machine learning, " +
            "uma subárea da IA, tem se mostrado particularmente eficaz em análise de dados e previsões."
        );
        
        if (summary) {
            logger.info('\n📝 Resumo gerado:');
            logger.info(`→ ${summary}\n`);
        } else {
            logger.error('❌ Sumarização não retornou resultado\n');
        }

        // Resultado final
        if (analysisResult && summary) {
            logger.success('✅ Todos os testes concluídos com sucesso!\n');
        } else {
            logger.warn('⚠️ Alguns testes não foram bem sucedidos\n');
        }

    } catch (error) {
        logger.error('❌ Erro nos testes:', error);
    }
}

// Executa o teste
testClaude();