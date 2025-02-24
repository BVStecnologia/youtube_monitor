// src/tests/testTranscription.js
const { getVideoTranscription } = require('../utils/transcriptionHelper');
const logger = require('../utils/logger');

async function testarTranscricao() {
    try {
        logger.info('\n🧪 Iniciando testes de transcrição...');

        // Teste específico do vídeo
        const videoId = 'tqbTuWLsnVg';
        logger.info(`\n📺 Testando vídeo específico: ${videoId}`);
        
        try {
            const inicio = Date.now();
            const transcricao = await getVideoTranscription(videoId);
            const tempo = (Date.now() - inicio) / 1000;

            logger.info('\n📊 Resultado da transcrição:');
            logger.info(`→ Tempo de processamento: ${tempo.toFixed(1)}s`);
            logger.info(`→ Tamanho do texto: ${transcricao.text.length} caracteres`);
            logger.info(`→ Duração do vídeo: ${Math.floor(transcricao.duration / 60)}min ${transcricao.duration % 60}s`);

            // Mostra o texto completo em partes
            if (transcricao.text) {
                logger.info('\n📝 Conteúdo da transcrição:');
                logger.info('------------------------------------------');
                
                // Divide o texto em parágrafos para melhor visualização
                const paragrafos = transcricao.text.split('\n').filter(p => p.trim());
                
                paragrafos.forEach((paragrafo, index) => {
                    logger.info(`[Parágrafo ${index + 1}]:`);
                    logger.info(paragrafo);
                    logger.info('------------------------------------------');
                });

                // Mostra também a versão com timestamps
                logger.info('\n⏰ Primeiros 5 timestamps:');
                const timestampLines = transcricao.withTimestamps
                    .split('\n')
                    .filter(line => line.match(/\[\d{2}:\d{2}:\d{2}\]/))
                    .slice(0, 5);
                
                timestampLines.forEach(line => {
                    logger.info(line);
                });

            } else {
                logger.warn('⚠️ Nenhum texto na transcrição');
            }

            // Verifica se a resposta está vazia
            if (!transcricao.text.trim()) {
                logger.error('❌ Transcrição vazia');
                return false;
            }

            logger.success('\n✅ Teste concluído com sucesso!');
            return true;

        } catch (error) {
            logger.error(`\n❌ Erro ao transcrever vídeo:`, error);
            logger.error('Detalhes:', error.message);
            return false;
        }

    } catch (error) {
        logger.error('\n❌ Erro nos testes:', error);
        return false;
    }
}

// Executa o teste
if (require.main === module) {
    testarTranscricao().then(sucesso => {
        process.exit(sucesso ? 0 : 1);
    });
}

module.exports = { testarTranscricao };