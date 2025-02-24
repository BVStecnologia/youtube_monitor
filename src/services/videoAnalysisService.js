// src/services/videoAnalysisService.js
const { analyzeContent } = require('../config/claude');
const youtube = require('../config/youtube');
const logger = require('../utils/logger');
const { getVideoTranscription } = require('../utils/transcriptionHelper');

async function analisarVideoCompleto(videoId, projeto) {
    try {
        logger.info('🎥 Buscando dados do vídeo no YouTube...');
        
        // 1. Cria cliente YouTube
        const youtubeClient = await youtube.createYoutubeClient(projeto.id);

        // 2. Busca dados completos do vídeo
        const { data: videoData } = await youtubeClient.videos.list({
            part: 'snippet,statistics',
            id: videoId
        });

        if (!videoData?.items?.length) {
            logger.error('❌ Vídeo não encontrado no YouTube');
            return null;
        }

        const videoInfo = videoData.items[0];

        // 3. Busca transcrição
        logger.info('📝 Obtendo transcrição...');
        const transcricao = await getVideoTranscription(videoId);

        // 4. Preparar dados para análise do Claude
        const prompt = `Analise este vídeo do YouTube considerando o contexto do projeto e todos os dados fornecidos.

CONTEXTO DO PROJETO:
Nome: ${projeto['Project name']}
Descrição: ${projeto['description service']}
Keywords Buscadas: ${projeto['Keywords']}
Keywords Negativas: ${projeto['Negative keywords']}
País: ${projeto['País']}

DADOS DO VÍDEO:
ID: ${videoId}
Título: ${videoInfo.snippet.title}
Descrição: ${videoInfo.snippet.description}
Tags: ${videoInfo.snippet.tags?.join(', ') || 'Não disponível'}
Canal: ${videoInfo.snippet.channelTitle}
Data Publicação: ${videoInfo.snippet.publishedAt}
Visualizações: ${videoInfo.statistics.viewCount}
Likes: ${videoInfo.statistics.likeCount}
Comentários: ${videoInfo.statistics.commentCount}

TRANSCRIÇÃO DO VÍDEO:
${transcricao.text}

Retorne APENAS um JSON válido com esta estrutura exata:
{
    "is_relevant": boolean,                    // true/false baseado na relevância para o projeto
    "relevance_score": number,                 // 0 a 1 (exemplo: 0.85)
    "relevance_reason": string,                // Explicação da relevância
    "content_category": string,                // Categoria principal do conteúdo
    "sentiment_analysis": {
        "positive": number,                    // 0 a 1 (exemplo: 0.7)
        "negative": number,                    // 0 a 1
        "neutral": number                      // 0 a 1
    },
    "key_topics": string[],                    // Máximo 5 tópicos principais
    "engagement_potential": string,            // "High", "Medium" ou "Low"
    "target_audience": string,                 // Público-alvo identificado
    "lead_potential": string,                  // "High", "Medium" ou "Low"
    "recommended_actions": string[],           // Máximo 3 ações recomendadas
    "ai_analysis_summary": string,             // Resumo da análise
    "trending_score": number,                  // 0 a 1
    "evergreen_potential": boolean             // true/false
}`;

        // 5. Realiza análise com Claude
        logger.info('🤖 Analisando com Claude...');
        const analiseRaw = await analyzeContent(prompt);

        // 6. Parse da resposta
        const analise = JSON.parse(analiseRaw);

        // 7. Monta resultado final
        const resultado = {
            VIDEO: videoId,
            video_title: videoInfo.snippet.title || 'Sem título',
            video_description: videoInfo.snippet.description || '',
            video_tags: videoInfo.snippet.tags || [],
            view_count: parseInt(videoInfo.statistics.viewCount) || 0,
            like_count: parseInt(videoInfo.statistics.likeCount) || 0,
            comment_count: parseInt(videoInfo.statistics.commentCount) || 0,
            
            // Campos da análise
            is_relevant: analise.is_relevant,
            relevance_score: analise.relevance_score,
            relevance_reason: analise.relevance_reason,
            content_category: analise.content_category,
            sentiment_analysis: {
                positive: analise.sentiment_analysis.positive * 100,
                negative: analise.sentiment_analysis.negative * 100,
                neutral: analise.sentiment_analysis.neutral * 100
            },
            key_topics: analise.key_topics.slice(0, 5),
            engagement_potential: analise.engagement_potential,
            target_audience: analise.target_audience,
            lead_potential: analise.lead_potential,
            recommended_actions: analise.recommended_actions.slice(0, 3),
            ai_analysis_summary: analise.ai_analysis_summary,
            trending_score: analise.trending_score,
            evergreen_potential: analise.evergreen_potential,
            ai_analysis_timestamp: new Date().toISOString()
        };

        logger.info('✅ Análise concluída com sucesso');
        return resultado;

    } catch (error) {
        logger.error('❌ Erro na análise completa:', error);
        return null;
    }
}

module.exports = { analisarVideoCompleto };