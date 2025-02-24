// src/tests/testBuscarProjetoId.js
const { buscarProjetoId } = require('../tasks/buscarProjetoId.js');
const logger = require('../utils/logger.js');

const testBuscarProjetoId = async () => {
    try {
        logger.info('\n🚀 Testando busca de projetos...');
        
        const projetos = await buscarProjetoId();
        
        if (!projetos || projetos.length === 0) {
            logger.warn('⚠️ Nenhum projeto com integração válida encontrado');
            return;
        }

        logger.info('\n📊 Resultado do teste:');
        projetos.forEach(projeto => {
            // Pega primeira integração (assumindo que é a correta)
            const integracao = projeto.Integrações;
            
            logger.info(`
    Projeto: ${projeto.id} (${projeto['Project name']})
    → Status: ${integracao.ativo ? '✅ Ativo' : '❌ Inativo'}
    → Última Atualização: ${integracao['Ultima atualização'] ? 
        new Date(integracao['Ultima atualização']).toLocaleString() : 'Não disponível'}
    → Token: ${integracao['Refresh token'] ? '🔑 Presente' : '❌ Ausente'}
    -------------------------------------------`);
        });

        logger.success(`\n✅ Total: ${projetos.length} projeto(s) com integração válida`);
        
    } catch (error) {
        logger.error('\n❌ Erro no teste:', error);
    }
};

// Executa o teste
testBuscarProjetoId();