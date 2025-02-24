// src/tests/testClaude.js
const { analyzeContent } = require('../config/claude');
const logger = require('../utils/logger');

async function testarClaude() {
    try {
        console.log('\n🧪 Iniciando teste do Claude...');

        // Teste 1: Prompt simples
        console.log('\n1️⃣ Testando prompt simples...');
        const promptSimples = "Quanto é 2+2? Responda apenas com o número.";
        console.log('📝 Prompt:', promptSimples);
        
        const resposta1 = await analyzeContent(promptSimples);
        console.log('✨ Resposta do Claude:', resposta1);

        // Teste 2: Prompt pedindo JSON
        console.log('\n2️⃣ Testando resposta em JSON...');
        const promptJson = `Retorne um JSON simples com a seguinte estrutura:
{
    "numero": 42,
    "texto": "teste"
}`;
        console.log('📝 Prompt:', promptJson);
        
        const resposta2 = await analyzeContent(promptJson);
        console.log('✨ Resposta do Claude:', resposta2);

        // Teste 3: Prompt com contexto
        console.log('\n3️⃣ Testando prompt com contexto...');
        const promptContexto = `Contexto: Você é um professor de matemática.
Explique o que é um número primo em uma frase.`;
        console.log('📝 Prompt:', promptContexto);
        
        const resposta3 = await analyzeContent(promptContexto);
        console.log('✨ Resposta do Claude:', resposta3);

        // Validação
        const testesPassaram = [resposta1, resposta2, resposta3].every(r => r !== null);

        console.log('\n📊 Resultado dos testes:');
        console.log('→ Teste 1:', resposta1 ? '✅' : '❌');
        console.log('→ Teste 2:', resposta2 ? '✅' : '❌');
        console.log('→ Teste 3:', resposta3 ? '✅' : '❌');

        if (testesPassaram) {
            console.log('\n✅ Todos os testes passaram!\n');
        } else {
            console.log('\n❌ Alguns testes falharam!\n');
        }

        return testesPassaram;

    } catch (error) {
        console.error('\n❌ Erro nos testes:', error);
        return false;
    }
}

// Executa se chamado diretamente
if (require.main === module) {
    testarClaude().then(sucesso => {
        process.exit(sucesso ? 0 : 1);
    });
}

module.exports = { testarClaude };