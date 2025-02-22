// src/tests/testBuscarProjetoId.js
const { buscarProjetoId } = require('../tasks/buscarProjetoId.js');

async function testBuscarProjetoId() {
    try {
        console.log('\n🚀 Testando busca de projetos...');
        
        const projetos = await buscarProjetoId();
        
        if (!projetos || projetos.length === 0) {
            console.log('⚠️ Nenhum projeto com integração válida encontrado');
            return;
        }

        console.log('\n📊 Resultado do teste:');
        projetos.forEach(projeto => {
            console.log(`
    Projeto: ${projeto.id} (${projeto['Project name']})
    → Status: ${projeto.Integrações.ativo ? '✅ Ativo' : '❌ Inativo'}
    → Última Atualização: ${new Date(projeto.Integrações['Ultima atualização']).toLocaleString()}
    → Token: ${projeto.Integrações['Refresh token'] ? '🔑 Presente' : '❌ Ausente'}
    -------------------------------------------`);
        });

        console.log(`\n✅ Total: ${projetos.length} projeto(s) com integração válida`);
        
    } catch (error) {
        console.error('\n❌ Erro no teste:', error);
    }
}

// Executa o teste
testBuscarProjetoId();