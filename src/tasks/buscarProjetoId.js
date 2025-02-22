// src/tasks/buscarProjetoId.js
const supabase = require('../config/supabase.js');
const youtube = require('../config/youtube.js');
const logger = require('../utils/logger.js');

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

        const projetosValidos = [];
        
        for (const projeto of projetos) {
            try {
                // Tenta criar cliente YouTube e fazer uma chamada real
                const youtubeClient = await youtube.createYoutubeClient(projeto.id);
                
                // Testa se o token realmente funciona
                try {
                    await youtubeClient.channels.list({
                        part: 'snippet',
                        mine: true
                    });
                    
                    console.log(`✅ Projeto ${projeto.id} (${projeto['Project name']}) - Integração funcionando`);
                    projetosValidos.push(projeto);
                } catch (apiError) {
                    console.warn(`⚠️ Projeto ${projeto.id} (${projeto['Project name']}) - Token inválido:`, apiError.message);
                    
                    // Atualiza status da integração no Supabase
                    await supabase
                        .from('Integrações')
                        .update({ 
                            ativo: false,
                            status: 'Requer reautorização'
                        })
                        .eq('id', projeto.Integrações.id);
                }
            } catch (error) {
                console.warn(`⚠️ Projeto ${projeto.id} (${projeto['Project name']}) - Erro na integração:`, error.message);
            }
        }

        console.log('\n📊 Projetos com integração válida:');
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