// src/tasks/buscarProjetoId.js
const supabase = require('../config/supabase.js');
const youtube = require('../config/youtube.js');

async function buscarProjetoId() {
    try {
        console.log('🔍 Iniciando busca de projetos...');

        const { data: projetos, error } = await supabase
            .from('Projeto')
            .select(`
                id,
                "Project name",
                "Youtube Active",
                Integrações!Projeto_Integrações_fkey (
                    id,
                    ativo,
                    "Token",
                    "Refresh token",
                    "Ultima atualização",
                    "Tipo de integração"
                )
            `)
            .eq('Youtube Active', true);

        if (error) {
            console.error('❌ Erro ao buscar projetos:', error);
            return [];
        }

        // Validar tokens e retornar apenas projetos válidos
        const projetosValidos = [];
        
        for (const projeto of projetos) {
            try {
                // Tenta criar cliente YouTube (isso valida o token)
                await youtube.createYoutubeClient(projeto.id);
                console.log(`✅ Projeto ${projeto.id} (${projeto['Project name']}) - Token válido`);
                projetosValidos.push(projeto);
            } catch (error) {
                console.warn(`⚠️ Projeto ${projeto.id} (${projeto['Project name']}) - Token inválido:`, error.message);
                // Tenta limpar integrações antigas
                await youtube.cleanupOldIntegrations(projeto.id);
            }
        }

        console.log('\n📊 Projetos com tokens válidos:');
        projetosValidos.forEach(projeto => {
            console.log(`   → Projeto ${projeto.id} (${projeto['Project name']})`);
        });
        console.log(`\n✅ Total: ${projetosValidos.length} projeto(s) válido(s)`);

        return projetosValidos;
    } catch (error) {
        console.error('❌ Erro ao processar projetos:', error);
        return [];
    }
}

module.exports = { buscarProjetoId };