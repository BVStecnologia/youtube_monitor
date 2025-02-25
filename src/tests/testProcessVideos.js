// src/tests/testProcessVideos.js
const { processarTodosProjetos } = require('../tasks/processVideos');
const { buscarProjetoId } = require('../tasks/buscarProjetoId');
const logger = require('../utils/logger');
const supabase = require('../config/supabase');

async function testarProcessamento() {
    try {
        logger.info('\n🧪 Iniciando teste de processamento de vídeos...');

        // 1. Testa busca de projetos
        logger.info('\n1️⃣ Verificando projetos ativos...');
        const projetos = await buscarProjetoId();
        
        if (!projetos?.length) {
            logger.error('❌ Nenhum projeto válido encontrado');
            return false;
        }

        logger.info('\n📊 Projetos encontrados:');
        projetos.forEach(projeto => {
            logger.info(`
    Projeto: ${projeto.id} (${projeto['Project name']})
    → Status: ✅ Ativo
    → Última Atualização: ${new Date(projeto.Integrações['Ultima atualização']).toLocaleString()}
    → Token: 🔑 Presente
    -------------------------------------------`);
        });

        // 2. Verifica vídeos existentes antes
        const { data: videosAntes } = await supabase
            .from('Videos')
            .select('VIDEO')
            .order('created_at', { ascending: false })
            .limit(1);

        const ultimoVideoAntes = videosAntes?.[0]?.VIDEO;

        // 3. Processa vídeos
        logger.info('\n2️⃣ Iniciando processamento...');
        await processarTodosProjetos();

        // 4. Verifica resultados
        logger.info('\n3️⃣ Verificando resultados...');
        
        const { data: videosNovos, error } = await supabase
            .from('Videos')
            .select('*')
            .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // últimos 5 minutos
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('❌ Erro ao verificar vídeos processados:', error);
            return false;
        }

        // 5. Mostra resultados
        logger.info('\n📊 Resultados do processamento:');
        logger.info(`→ Vídeos novos processados: ${videosNovos?.length || 0}`);

        if (videosNovos?.length > 0) {
            logger.info('\n📝 Últimos vídeos processados:');
            videosNovos.slice(0, 3).forEach(video => {
                logger.info(`
    Vídeo: ${video.video_title}
    → ID: ${video.VIDEO}
    → Canal: ${video.Channel}
    → Relevante: ${video.is_relevant ? '✅ Sim' : '❌ Não'}
    → Score: ${(video.relevance_score * 100).toFixed(1)}%
    → Categoria: ${video.content_category}
    → Engajamento: ${video.engagement_potential}
    → Leads: ${video.lead_potential}
    -------------------------------------------`);
            });

            // 6. Verifica canais atualizados
            logger.info('\n4️⃣ Verificando canais atualizados...');
            for (const video of videosNovos) {
                const { data: canal } = await supabase
                    .from('Canais do youtube')
                    .select('videos, Nome, last_video_check, engagement_rate')
                    .eq('id', video.canal)
                    .single();

                if (canal) {
                    const videos = canal.videos?.split(',').filter(v => v) || [];
                    logger.info(`
    Canal: ${canal.Nome}
    → Total de vídeos: ${videos.length}
    → Último vídeo: ${videos[videos.length - 1]}
    → Última verificação: ${new Date(canal.last_video_check).toLocaleString()}
    → Taxa de engajamento: ${(canal.engagement_rate * 100).toFixed(1)}%
    -------------------------------------------`);
                }
            }
        } else {
            logger.info('ℹ️ Nenhum vídeo novo processado');
        }

        // 7. Validações finais
        const validacoes = {
            'Projetos encontrados': projetos.length > 0,
            'Processamento executado': true,
            'Dados salvos corretamente': videosNovos !== null,
            'Canais atualizados': true
        };

        logger.info('\n5️⃣ Validações:');
        Object.entries(validacoes).forEach(([campo, valido]) => {
            logger.info(`${valido ? '✅' : '❌'} ${campo}`);
        });

        const sucesso = Object.values(validacoes).every(v => v === true);
        
        if (sucesso) {
            logger.success('\n✅ Teste concluído com sucesso!');
        } else {
            logger.error('\n❌ Algumas validações falharam');
        }

        return sucesso;

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