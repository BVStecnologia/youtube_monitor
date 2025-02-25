// src/tasks/processVideos.js
const logger = require('../utils/logger');
const supabase = require('../config/supabase');
const youtube = require('../config/youtube');
const { buscarProjetoId } = require('./buscarProjetoId');
const { analisarVideoCompleto } = require('../services/videoAnalysisService');

/**
 * Processa todos os projetos de forma sequencial
 */
async function processarTodosProjetos() {
    console.log("\n===== INICIANDO PROCESSAMENTO DE VÍDEOS =====");
    
    try {
        logger.info('\n🚀 Iniciando processamento de vídeos...');
        
        // buscarProjetoId já retorna apenas projetos válidos e testados
        const projetos = await buscarProjetoId();
        
        if (!projetos?.length) {
            logger.warn('Nenhum projeto válido encontrado');
            return;
        }

        logger.info(`\nProcessando ${projetos.length} projetos sequencialmente...`);
        
        // Processa um projeto de cada vez
        for (let i = 0; i < projetos.length; i++) {
            const projeto = projetos[i];
            logger.info(`\nProjeto ${i+1}/${projetos.length}: ${projeto['Project name']} (ID: ${projeto.id})`);
            await processarProjeto(projeto);
        }

        logger.success('\nProcessamento finalizado com sucesso!');
    } catch (error) {
        logger.error('\nErro no processamento:', error);
    }
}

/**
 * Processa um projeto específico
 */
async function processarProjeto(projeto) {
    try {
        logger.info(`\n🔍 Buscando canais para projeto: ${projeto['Project name']}`);
        
        const { data: canais, error } = await supabase
            .from('Canais do youtube')
            .select('*')
            .eq('Projeto', projeto.id)
            .eq('is_active', true);

        if (error) {
            logger.error('Erro ao buscar canais:', error);
            return;
        }

        if (!canais?.length) {
            logger.warn(`Nenhum canal ativo para projeto ${projeto['Project name']}`);
            return;
        }

        logger.info(`\n📺 Encontrados ${canais.length} canais ativos`);
        
        // Processa um canal de cada vez
        for (let i = 0; i < canais.length; i++) {
            const canal = canais[i];
            logger.info(`\n🎥 Canal ${i+1}/${canais.length}: ${canal.Nome}`);
            await processarCanal(canal, projeto);
        }
    } catch (error) {
        logger.error(`Erro ao processar projeto ${projeto.id}:`, error);
    }
}

/**
 * Processa os vídeos de um canal
 */
async function processarCanal(canal, projeto) {
    try {
        if (!canal?.channel_id) {
            logger.warn('Canal sem ID válido');
            return;
        }
        
        // Cria cliente YouTube
        const youtubeClient = await youtube.createYoutubeClient(projeto.id);

        // Define limite de vídeos
        const maxResults = canal.last_video_check ? 50 : 5;
        const ultimaVerificacao = canal.last_video_check || new Date(0);
        
        logger.info(`Buscando vídeos para ${canal.Nome} (após ${new Date(ultimaVerificacao).toLocaleString()})`);

        // Busca vídeos novos
        const { data: videos } = await youtubeClient.search.list({
            channelId: canal.channel_id,
            publishedAfter: ultimaVerificacao.toISOString(),
            part: 'snippet',
            type: 'video',
            maxResults
        });

        if (!videos?.items?.length) {
            logger.info(`Nenhum vídeo novo para ${canal.Nome}`);
            await atualizarUltimaVerificacao(canal);
            return;
        }

        logger.info(`📺 Encontrados ${videos.items.length} vídeos novos`);

        // Processa um vídeo de cada vez
        for (let i = 0; i < videos.items.length; i++) {
            const video = videos.items[i];
            logger.info(`\n🎬 Vídeo ${i+1}/${videos.items.length}: ${video.snippet.title} (${video.id.videoId})`);
            await processarVideo(video, canal, projeto);
        }

        await atualizarUltimaVerificacao(canal);

    } catch (error) {
        logger.error(`Erro ao processar canal ${canal.Nome}:`, error);
    }
}

/**
 * Processa um vídeo individual
 */
async function processarVideo(video, canal, projeto) {
    try {
        // Verifica se já existe
        const { data: existente } = await supabase
            .from('Videos')
            .select('VIDEO')
            .eq('VIDEO', video.id.videoId)
            .single();

        if (existente) {
            logger.info(`Vídeo ${video.id.videoId} já processado anteriormente`);
            return;
        }

        // Usa o serviço de análise
        logger.info(`🔍 Analisando vídeo: ${video.id.videoId}`);
        
        try {
            const analise = await analisarVideoCompleto(video.id.videoId, projeto);

            if (!analise) {
                logger.warn(`Análise incompleta para vídeo ${video.id.videoId}`);
                return;
            }

            // Se relevante, salva
            if (analise.is_relevant) {
                await salvarVideo(analise, canal);
                logger.success(`Vídeo ${video.id.videoId} processado e salvo (Relevante: ${analise.relevance_score.toFixed(2)})`);
            } else {
                logger.info(`Vídeo ${video.id.videoId} não relevante: ${analise.relevance_reason.substring(0, 100)}...`);
            }
        } catch (error) {
            logger.error(`Falha na análise do vídeo ${video.id.videoId}: ${error.message}`);
        }

    } catch (error) {
        logger.error(`Erro ao processar vídeo ${video.id.videoId}:`, error);
    }
}

/**
 * Salva o vídeo no banco e atualiza o canal
 */
async function salvarVideo(analise, canal) {
    try {
        // 1. Salva o vídeo
        const { error: erroVideo } = await supabase
            .from('Videos')
            .insert({
                VIDEO: analise.VIDEO,
                canal: canal.id,
                video_title: analise.video_title,
                video_description: analise.video_description,
                video_tags: analise.video_tags,
                view_count: analise.view_count,
                like_count: analise.like_count,
                comment_count: analise.comment_count,
                is_relevant: analise.is_relevant,
                relevance_score: analise.relevance_score,
                relevance_reason: analise.relevance_reason,
                content_category: analise.content_category,
                sentiment_analysis: analise.sentiment_analysis,
                key_topics: analise.key_topics,
                engagement_potential: analise.engagement_potential,
                target_audience: analise.target_audience,
                lead_potential: analise.lead_potential,
                recommended_actions: analise.recommended_actions,
                ai_analysis_summary: analise.ai_analysis_summary,
                trending_score: analise.trending_score,
                evergreen_potential: analise.evergreen_potential,
                ai_analysis_timestamp: analise.ai_analysis_timestamp,
                Channel: canal.Nome
            });

        if (erroVideo) throw new Error(`Erro ao salvar vídeo: ${erroVideo.message}`);

        // 2. Atualiza lista de vídeos do canal
        const { data: canalAtual } = await supabase
            .from('Canais do youtube')
            .select('videos')
            .eq('id', canal.id)
            .single();

        let videosAtuais = canalAtual?.videos?.split(',').filter(v => v) || [];
        if (!videosAtuais.includes(analise.VIDEO)) {
            videosAtuais.push(analise.VIDEO);
        }

        // 3. Atualiza o canal
        const { error: erroCanal } = await supabase
            .from('Canais do youtube')
            .update({
                videos: videosAtuais.join(','),
                last_video_check: new Date().toISOString(),
                engagement_rate: (analise.trending_score + (canal.engagement_rate || 0)) / 2
            })
            .eq('id', canal.id);

        if (erroCanal) throw new Error(`Erro ao atualizar canal: ${erroCanal.message}`);

        logger.success(`Vídeo ${analise.VIDEO} salvo com sucesso`);

    } catch (error) {
        logger.error(`Erro ao salvar vídeo:`, error);
        throw error;
    }
}

/**
 * Atualiza a última verificação do canal
 */
async function atualizarUltimaVerificacao(canal) {
    try {
        await supabase
            .from('Canais do youtube')
            .update({ last_video_check: new Date().toISOString() })
            .eq('id', canal.id);
    } catch (error) {
        logger.error(`Erro ao atualizar última verificação:`, error);
    }
}

// Executar automaticamente
if (require.main === module) {
    (async () => {
        try {
            await processarTodosProjetos();
            console.log("\n===== PROCESSAMENTO CONCLUÍDO =====");
        } catch (err) {
            console.error("FALHA CRÍTICA:", err);
        }
    })();
}

module.exports = { processarTodosProjetos };