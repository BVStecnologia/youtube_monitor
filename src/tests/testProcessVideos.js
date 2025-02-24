// src/tests/testProcessVideos.js
const { processarTodosProjetos } = require('../tasks/processVideos');
const { buscarProjetoId } = require('../tasks/buscarProjetoId');
const logger = require('../utils/logger');
const supabase = require('../config/supabase');

async function testarProcessamento() {
    try {
        logger.info('\n🧪 Iniciando teste de processamento...');

        // 1. Busca projetos ativos
        const projetos = await buscarProjetoId();
        
        if (!projetos?.length) {
            logger.error('❌ Nenhum projeto válido encontrado');
            return false;
        }

        // 2. Mostra projetos encontrados
        logger.info('\n📊 Projetos encontrados:');
        projetos.forEach(projeto => {
            logger.info(`
    Projeto: ${projeto.id} (${projeto['Project name']})
    → Status: ✅ Ativo
    → Última Atualização: ${new Date(projeto.Integrações['Ultima atualização']).toLocaleString()}
    → Token: 🔑 Presente
    -------------------------------------------`);
        });

        // 3. Processa vídeos
        logger.info('\n🎥 Iniciando processamento de vídeos...');
        await processarTodosProjetos();

        // 4. Verifica resultados
        const { data: videosProcessados, error } = await supabase
            .from('Videos')
            .select('*')
            .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // últimos 5 minutos
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('❌ Erro ao verificar vídeos processados:', error);
            return false;
        }

        // 5. Mostra resultados dos vídeos
        logger.info('\n📊 Resultados do processamento:');
        logger.info(`→ Total de vídeos processados: ${videosProcessados?.length || 0}`);

        if (videosProcessados?.length > 0) {
            logger.info('\n📝 Últimos vídeos processados:');
            videosProcessados.slice(0, 3).forEach(video => {
                logger.info(`
    Vídeo: ${video.video_title}
    → ID: ${video.VIDEO}
    → Canal: ${video.Channel}
    → Relevante: ${video.is_relevant ? '✅ Sim' : '❌ Não'}
    → Score: ${(video.relevance_score * 100).toFixed(1)}%
    → Categoria: ${video.content_category}
    → Engajamento: ${video.engagement_potential}
    -------------------------------------------`);
            });

            // 6. Verifica canais atualizados
            logger.info('\n📊 Verificando canais atualizados...');
            for (const video of videosProcessados) {
                const { data: canal } = await supabase
                    .from('Canais do youtube')
                    .select('videos, Nome, last_video_check')
                    .eq('id', video.canal)
                    .single();

                if (canal) {
                    const videos = canal.videos?.split(',').filter(v => v) || [];
                    logger.info(`
    Canal: ${canal.Nome}
    → Total de vídeos: ${videos.length}
    → Último vídeo: ${videos[videos.length - 1]}
    → Última verificação: ${new Date(canal.last_video_check).toLocaleString()}
    -------------------------------------------`);
                }
            }
        } else {
            logger.info('ℹ️ Nenhum vídeo novo processado');
        }

        logger.success('\n✅ Teste concluído com sucesso!');
        return true;

    } catch (error) {
        logger.error('\n❌ Erro durante o teste:', error);
        logger.error('Detalhes:', error.message);
        return false;
    }
}

// Executa o teste
if (require.main === module) {
    testarProcessamento().then(sucesso => {
        process.exit(sucesso ? 0 : 1);
    });
}

module.exports = { testarProcessamento };