// src/tasks/processVideos.js
const logger = require('../utils/logger');
const supabase = require('../config/supabase');
const youtube = require('../config/youtube');
const { buscarProjetoId } = require('./buscarProjetoId');
const { getVideoTranscription } = require('../utils/transcriptionHelper');
const { analisarVideoCompleto } = require('../services/videoAnalysisService');

async function processarTodosProjetos() {
    try {
        logger.info('\n🚀 Iniciando processamento de vídeos...');

        // Busca projetos - já retorna só os ativos e validados
        const projetos = await buscarProjetoId();
        
        if (!projetos?.length) {
            logger.warn('⚠️ Nenhum projeto válido encontrado');
            return;
        }

        // Log no mesmo formato do teste
        logger.info('\n📊 Projetos para processamento:');
        projetos.forEach(projeto => {
            logger.info(`
    Projeto: ${projeto.id} (${projeto['Project name']})
    → Status: ✅ Ativo
    → Última Atualização: ${new Date(projeto.Integrações['Ultima atualização']).toLocaleString()}
    → Token: 🔑 Presente
    -------------------------------------------`);
        });

        // Processa direto - já são os projetos válidos
        for (const projeto of projetos) {
            await processarProjeto(projeto);
        }

        logger.success('\n✅ Processamento finalizado com sucesso!');

    } catch (error) {
        logger.error('\n❌ Erro no processamento:', error);
    }
}

async function processarProjeto(projeto) {
    try {
        logger.info(`\n📂 Processando projeto: ${projeto['Project name']} (ID: ${projeto.id})`);

        const youtubeClient = await youtube.createYoutubeClient(projeto.id);
        
        const { data: canais, error } = await supabase
            .from('Canais do youtube')
            .select('*')
            .eq('Projeto', projeto.id)
            .eq('is_active', true);

        if (error) {
            logger.error('❌ Erro ao buscar canais:', error);
            return;
        }

        if (!canais?.length) {
            logger.warn(`⚠️ Nenhum canal ativo para projeto ${projeto['Project name']}`);
            return;
        }

        for (const canal of canais) {
            await processarVideosCanal(canal, projeto, youtubeClient);
        }
    } catch (error) {
        logger.error(`❌ Erro ao processar projeto ${projeto.id}:`, error);
    }
}

async function processarVideosCanal(canal, projeto, youtubeClient) {
    try {
        if (!canal?.channel_id) {
            logger.warn('⚠️ Canal sem ID válido');
            return;
        }

        logger.info(`\n🎥 Processando canal: ${canal.Nome}`);

        const maxResults = canal.last_video_check ? 50 : 5;
        const ultimaVerificacao = canal.last_video_check || new Date(0);

        const { data: videos } = await youtubeClient.search.list({
            channelId: canal.channel_id,
            publishedAfter: ultimaVerificacao.toISOString(),
            part: 'snippet',
            type: 'video',
            maxResults
        });

        if (!videos?.items?.length) {
            logger.info(`ℹ️ Nenhum vídeo novo para ${canal.Nome}`);
            await atualizarUltimaVerificacao(canal);
            return;
        }

        logger.info(`📺 Encontrados ${videos.items.length} vídeos novos`);

        for (const video of videos.items) {
            await processarVideo(video, canal, projeto, youtubeClient);
        }

        await atualizarUltimaVerificacao(canal);

    } catch (error) {
        logger.error(`❌ Erro ao processar canal ${canal.Nome}:`, error);
    }
}

async function processarVideo(video, canal, projeto, youtubeClient) {
    try {
        // 1. Verifica se já existe
        const { data: existente } = await supabase
            .from('Videos')
            .select('VIDEO')
            .eq('VIDEO', video.id.videoId)
            .single();

        if (existente) {
            logger.info(`ℹ️ Vídeo ${video.id.videoId} já processado`);
            return;
        }

        // 2. Realiza análise completa
        logger.info(`🔍 Analisando vídeo: ${video.id.videoId}`);
        const analise = await analisarVideoCompleto(video.id.videoId, projeto);

        if (!analise) {
            logger.error(`❌ Falha na análise do vídeo ${video.id.videoId}`);
            return;
        }

        // 3. Se relevante, salva
        if (analise.is_relevant) {
            await salvarVideo(analise, canal);
            logger.success(`✅ Vídeo ${video.id.videoId} processado e salvo`);
        } else {
            logger.info(`ℹ️ Vídeo ${video.id.videoId} não relevante: ${analise.relevance_reason}`);
        }

    } catch (error) {
        logger.error(`❌ Erro ao processar vídeo ${video.id.videoId}:`, error);
    }
}

async function salvarVideo(analise, canal) {
    try {
        // 1. Salva o vídeo na tabela Videos
        const { error: erroInsercao } = await supabase
            .from('Videos')
            .insert({
                // Campos identificadores
                VIDEO: analise.VIDEO,
                canal: canal.id,
                
                // Campos de metadados
                video_title: analise.video_title,
                video_description: analise.video_description,
                video_tags: analise.video_tags,
                
                // Métricas do YouTube
                view_count: analise.view_count,
                like_count: analise.like_count,
                comment_count: analise.comment_count,
                
                // Status de comentários
                comentarios_atualizados: false,
                comentarios_desativados: false,
                
                // Campos de análise
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
                ai_analysis_timestamp: analise.ai_analysis_timestamp,
                trending_score: analise.trending_score,
                evergreen_potential: analise.evergreen_potential,
                
                // Campos opcionais
                "PÁGINA": null,
                "Channel": canal.Nome,
                "Keyword": null,
                scanner_id: null,
                transcript: null
            });

        if (erroInsercao) {
            throw new Error(`Erro ao inserir vídeo: ${erroInsercao.message}`);
        }

        // 2. Busca dados atuais do canal
        const { data: canalAtual, error: erroCanal } = await supabase
            .from('Canais do youtube')
            .select('videos')
            .eq('id', canal.id)
            .single();

        if (erroCanal) {
            throw new Error(`Erro ao buscar canal: ${erroCanal.message}`);
        }

        // 3. Prepara lista atualizada de vídeos
        let videosAtuais = [];
        if (canalAtual?.videos) {
            videosAtuais = canalAtual.videos.split(',').filter(v => v); // Remove vazios
        }
        
        // Adiciona novo vídeo se não existir
        if (!videosAtuais.includes(analise.VIDEO)) {
            videosAtuais.push(analise.VIDEO);
        }

        // 4. Atualiza o canal
        const { error: erroAtualizacao } = await supabase
            .from('Canais do youtube')
            .update({
                videos: videosAtuais.join(','),
                last_video_check: new Date().toISOString(),
                // Atualiza métricas do canal
                total_leads: canal.total_leads || 0,
                engagement_rate: (analise.trending_score + (canal.engagement_rate || 0)) / 2
            })
            .eq('id', canal.id);

        if (erroAtualizacao) {
            throw new Error(`Erro ao atualizar canal: ${erroAtualizacao.message}`);
        }

        logger.success(`✅ Vídeo ${analise.VIDEO} salvo com sucesso`);
        logger.info(`📊 Canal ${canal.Nome} atualizado com ${videosAtuais.length} vídeos`);

    } catch (error) {
        logger.error(`❌ Erro ao salvar vídeo:`, error);
        throw error; // Propaga o erro para tratamento adequado
    }
}

async function atualizarUltimaVerificacao(canal) {
    try {
        await supabase
            .from('Canais do youtube')
            .update({ last_video_check: new Date().toISOString() })
            .eq('id', canal.id);
    } catch (error) {
        logger.error(`❌ Erro ao atualizar última verificação:`, error);
    }
}

module.exports = { processarTodosProjetos };