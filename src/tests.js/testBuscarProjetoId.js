// src/tests.js/testBuscarProjetoId.js
/**
 * Teste da função buscarProjetoId
 * 
 * Como executar:
 * node src/tests.js/testBuscarProjetoId.js
 */

const { buscarProjetoId } = require('../tasks/buscarProjetoId.js');

async function testBuscarProjetoId() {
    try {
        console.log('\n🚀 Buscando projetos disponíveis para processamento...');
        
        const projetos = await buscarProjetoId();
        
        if (!projetos || projetos.length === 0) {
            console.log('⚠️ Nenhum projeto disponível para processamento');
            return;
        }

        // Mostra resumo dos projetos que podem ser processados
        console.log('\n📊 Projetos prontos para processamento:');
        projetos.forEach(projeto => {
            console.log(`   → Projeto ${projeto.id} (${projeto['Project name']})`);
        });

        console.log(`\n✅ Total: ${projetos.length} projeto(s) pronto(s) para processamento`);
    } catch (error) {
        console.error('\n❌ Erro ao buscar projetos:', error);
    }
}

// Executa o teste
testBuscarProjetoId();