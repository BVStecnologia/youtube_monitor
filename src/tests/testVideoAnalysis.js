// src/tests/testVideoAnalysis.js
const { analisarVideoCompleto } = require('../services/videoAnalysisService');
const logger = require('../utils/logger');

const mockProjeto = {
    id: 37,
    'Project name': 'Tech Education',
    'description service': 'Finding quality tech education content',
    'Keywords': 'programming, AI, education, technology',
    'Negative keywords': 'gaming, entertainment',
    'País': 'Brasil'
};

async function testarAnaliseVideo() {
    try {
        console.log('\n🧪 Iniciando teste de análise de vídeo...');

        // 1. Testa com vídeo conhecido
        const videoId = '7cxsr_VjrJk';
        console.log(`\n📺 Analisando vídeo: ${videoId}`);
        
        // 2. Executa análise e captura resposta crua
        const { analyzeContent } = require('../config/claude');
        const youtube = require('../config/youtube');
        const { getVideoTranscription } = require('../utils/transcriptionHelper');
        
        // 3. Busca dados do vídeo
        const youtubeClient = await youtube.createYoutubeClient(mockProjeto.id);
        const { data: videoData } = await youtubeClient.videos.list({
            part: 'snippet,statistics',
            id: videoId
        });
        
        const videoInfo = videoData.items[0];
        const transcricao = await getVideoTranscription(videoId);

        // 4. Monta prompt (igual ao da função principal)
        const prompt = `Analise este vídeo do YouTube considerando o contexto do projeto e todos os dados fornecidos.

CONTEXTO DO PROJETO:
Nome: ${mockProjeto['Project name']}
Descrição: ${mockProjeto['description service']}
Keywords Buscadas: ${mockProjeto['Keywords']}
Keywords Negativas: ${mockProjeto['Negative keywords']}
País: ${mockProjeto['País']}

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
    "is_relevant": boolean,
    "relevance_score": number,
    "relevance_reason": string,
    "content_category": string,
    "sentiment_analysis": {
        "positive": number,
        "negative": number,
        "neutral": number
    },
    "key_topics": array,
    "engagement_potential": string,
    "target_audience": string,
    "lead_potential": string,
    "recommended_actions": array,
    "ai_analysis_summary": string,
    "trending_score": number,
    "evergreen_potential": boolean
}`;

        // 5. Obtém resposta crua do Claude
        console.log('\n🤖 Resposta crua do Claude:');
        const respostaCrua = await analyzeContent(prompt);
        console.log(respostaCrua);

        // 6. Tenta fazer parse
        console.log('\n🔍 Tentando fazer parse do JSON:');
        try {
            const parsed = JSON.parse(respostaCrua);
            console.log('Parsed JSON:', JSON.stringify(parsed, null, 2));
            
            // 7. Se chegou aqui, faz a análise completa
            const resultado = await analisarVideoCompleto(videoId, mockProjeto);
            
            if (resultado) {
                console.log('\n✅ Análise completa realizada com sucesso!');
            }
            
            return true;
        } catch (e) {
            console.error('❌ Erro ao fazer parse:', e.message);
            console.log('Primeiros 500 caracteres da resposta:', respostaCrua.substring(0, 500));
            return false;
        }

    } catch (error) {
        console.error('\n❌ Erro durante o teste:', error);
        return false;
    }
}

if (require.main === module) {
    testarAnaliseVideo().then(sucesso => {
        process.exit(sucesso ? 0 : 1);
    });
}

module.exports = { testarAnaliseVideo };