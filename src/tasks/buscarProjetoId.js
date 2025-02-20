// src/tasks/buscarProjetoId.js
const supabase = require('../config/supabase.js');
const youtube = require('../config/youtube.js');

async function buscarProjetoId() {
    try {
        console.log('🔍 Iniciando busca de projetos...');

        // 1. Busca projetos com YouTube ativo e integração
        const { data: projetos, error } = await supabase
            .from('Projeto')
            .select(`
                id,
                "Project name",
                "Youtube Active",
                Integrações!inner (
                    id,
                    ativo,
                    "Token",
                    "Refresh token",
                    "Ultima atualização"
                )
            `)
            .eq('Youtube Active', true);

        if (error) {
            console.error('❌ Erro ao buscar projetos:', error);
            return [];
        }

        // 2. Para cada projeto, valida/atualiza token
        const projetosValidos = [];
        for (const projeto of projetos) {
            try {
                // Tenta criar cliente YouTube (isso já valida/atualiza o token)
                await youtube.createYoutubeClient(projeto.id);
                
                // Se chegou aqui, o token é válido
                projetosValidos.push(projeto);
            } catch (error) {
                console.warn(`⚠️ Projeto ${projeto.id} com token inválido:`, error.message);
                continue;
            }
        }

        console.log(`✅ Encontrados ${projetosValidos.length} projetos válidos`);
        return projetosValidos;
    } catch (error) {
        console.error('❌ Erro ao processar projetos:', error);
        return [];
    }
}

module.exports = { buscarProjetoId };