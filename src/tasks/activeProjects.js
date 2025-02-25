// src/tasks/activeProjects.js (CORREÇÃO CRÍTICA DO REFRESH)
const logger = require('../utils/logger');
const supabase = require('../config/supabase');
const axios = require('axios');
const youtubeConfig = require('../config/youtube');

/**
 * Verifica todos os projetos com integração YouTube e atualiza o status
 * da integração na tabela Projeto (campo 'integracao_valida')
 */
async function checkActiveProjects() {
    try {
        logger.info('\n🚀 Verificando projetos com integração YouTube...');

        // 1. Busca todos os projetos com YouTube ativo
        const { data: projetos, error } = await supabase
            .from('Projeto')
            .select(`
                id,
                "Project name",
                "Youtube Active",
                "Integrações"
            `)
            .eq('Youtube Active', true);

        if (error) {
            logger.error('❌ Erro ao buscar projetos:', error);
            return [];
        }

        if (!projetos?.length) {
            logger.warn('⚠️ Nenhum projeto com YouTube ativo encontrado');
            return [];
        }

        logger.info(`📊 Encontrados ${projetos.length} projetos para verificação:`);
        
        const projetosValidados = [];
        
        // 2. Para cada projeto, busca as integrações separadamente e processa
        for (const projeto of projetos) {
            try {
                logger.info(`\n🔍 Verificando projeto: ${projeto['Project name']} (ID: ${projeto.id})`);
                
                // Busca todas as integrações desse projeto, ordenadas por data (mais recente primeiro)
                const { data: integracoes, error: intError } = await supabase
                    .from('Integrações')
                    .select('*')
                    .eq('PROJETO id', projeto.id)
                    .eq('Tipo de integração', 'Youtube')
                    .order('Ultima atualização', { ascending: false });
                
                if (intError) {
                    logger.error(`❌ Erro ao buscar integrações do projeto ${projeto.id}:`, intError);
                    await atualizarStatusIntegracao(projeto.id, false);
                    continue;
                }
                
                if (!integracoes?.length) {
                    logger.warn(`⚠️ Projeto ${projeto.id} não possui integrações YouTube`);
                    await atualizarStatusIntegracao(projeto.id, false);
                    continue;
                }
                
                // Pega a integração mais recente
                const integracaoAtual = integracoes[0];
                
                // Se houver mais de uma integração, remove as antigas
                if (integracoes.length > 1) {
                    logger.info(`ℹ️ Projeto ${projeto.id} possui ${integracoes.length} integrações - limpando antigas...`);
                    await limparIntegracoesAntigas(projeto.id, integracaoAtual.id);
                }
                
                // Atualiza o projeto para usar esta integração específica
                await supabase
                    .from('Projeto')
                    .update({ 'Integrações': integracaoAtual.id })
                    .eq('id', projeto.id);
                
                // 1. TESTE INICIAL - direto com o token atual
                let isValid = false;
                
                try {
                    logger.info('🧪 Testando token diretamente com API YouTube...');
                    isValid = await testYouTubeTokenDirectly(integracaoAtual['Token']);
                    
                    if (isValid) {
                        logger.success(`✅ Projeto ${projeto.id} - Token válido direto`);
                        await atualizarStatusIntegracao(projeto.id, true);
                        
                        projetosValidados.push({
                            ...projeto,
                            integracao_valida: true,
                            Integrações: integracaoAtual
                        });
                        continue;
                    }
                } catch (directError) {
                    logger.error(`❌ Erro no teste direto: ${directError.message}`);
                }
                
                // 2. TENTA REFRESH - apenas se o teste direto falhou
                if (!isValid) {
                    logger.info(`ℹ️ Projeto ${projeto.id} - Token inválido, tentando refresh...`);
                    
                    // Verifica se tem refresh token
                    if (!integracaoAtual['Refresh token']) {
                        logger.warn(`⚠️ Projeto ${projeto.id} - Sem refresh token, requer nova autorização`);
                        await atualizarStatusIntegracao(projeto.id, false);
                        continue;
                    }
                    
                    // Tenta refresh
                    try {
                        // Busca o token mais recente antes de tentar refresh
                        const preToken = await getTokenAtual(projeto.id);
                        
                        // Força o refresh
                        try {
                            // Tenta criar o cliente, o que força refresh
                            await youtubeConfig.createYoutubeClient(projeto.id);
                            
                            // Busca o token APÓS o refresh para comparar
                            const postToken = await getTokenAtual(projeto.id);
                            
                            // Compara se o token mudou após o refresh
                            if (preToken !== postToken) {
                                logger.info(`ℹ️ Token mudou após refresh para projeto ${projeto.id}`);
                                
                                // Teste CRÍTICO - verificação do token após refresh
                                const isValidAfterRefresh = await testYouTubeTokenDirectly(postToken);
                                
                                if (isValidAfterRefresh) {
                                    logger.success(`✅ Projeto ${projeto.id} - Token válido após refresh`);
                                    await atualizarStatusIntegracao(projeto.id, true);
                                    
                                    projetosValidados.push({
                                        ...projeto,
                                        integracao_valida: true,
                                        Integrações: integracaoAtual
                                    });
                                } else {
                                    // Token mudou mas continua inválido! Este é o caso do projeto 34.
                                    logger.error(`❌ ATENÇÃO! Projeto ${projeto.id} - Token refreshed mas CONTINUA INVÁLIDO!`);
                                    await atualizarStatusIntegracao(projeto.id, false);
                                    
                                    // Marca integração como inativa no banco
                                    await supabase
                                        .from('Integrações')
                                        .update({ 
                                            ativo: false, 
                                            'Ultima atualização': new Date().toISOString(),
                                            observacao: 'Token inválido mesmo após refresh, requer nova autorização'
                                        })
                                        .eq('id', integracaoAtual.id);
                                }
                            } else {
                                logger.warn(`⚠️ Projeto ${projeto.id} - Token não mudou após refresh, provavelmente refresh falhou`);
                                await atualizarStatusIntegracao(projeto.id, false);
                                
                                // Marca como inativo já que o refresh falhou
                                await supabase
                                    .from('Integrações')
                                    .update({ 
                                        ativo: false,
                                        'Ultima atualização': new Date().toISOString(),
                                        observacao: 'Refresh falhou, token não foi atualizado'
                                    })
                                    .eq('id', integracaoAtual.id);
                            }
                        } catch (refreshErr) {
                            logger.error(`❌ Erro no refresh explícito: ${refreshErr.message}`);
                            await atualizarStatusIntegracao(projeto.id, false);
                            
                            // Marca como inativo devido a erro no refresh
                            await supabase
                                .from('Integrações')
                                .update({ 
                                    ativo: false,
                                    'Ultima atualização': new Date().toISOString(),
                                    observacao: `Erro no refresh: ${refreshErr.message}`
                                })
                                .eq('id', integracaoAtual.id);
                        }
                    } catch (err) {
                        logger.error(`❌ Erro no processo de refresh: ${err.message}`);
                        await atualizarStatusIntegracao(projeto.id, false);
                    }
                }
            } catch (projetoError) {
                logger.error(`❌ Erro ao verificar projeto ${projeto.id}:`, projetoError);
                await atualizarStatusIntegracao(projeto.id, false);
            }
        }

        logger.info('\n📊 Projetos com integração válida:');
        if (projetosValidados.length === 0) {
            logger.warn('⚠️ Nenhum projeto com integração válida encontrado');
        } else {
            projetosValidados.forEach(projeto => {
                logger.info(`   → Projeto ${projeto.id} (${projeto['Project name']})`);
            });
        }
        logger.success(`\n✅ Total: ${projetosValidados.length} projeto(s) válido(s) de ${projetos.length} verificado(s)`);

        return projetosValidados;
    } catch (error) {
        logger.error('❌ Erro ao processar projetos:', error);
        return [];
    }
}

/**
 * Busca o token atual de um projeto para comparação
 */
async function getTokenAtual(projetoId) {
    try {
        const { data } = await supabase
            .from('Integrações')
            .select('Token')
            .eq('PROJETO id', projetoId)
            .eq('Tipo de integração', 'Youtube')
            .order('Ultima atualização', { ascending: false })
            .limit(1)
            .single();
            
        return data?.Token || null;
    } catch (error) {
        logger.error(`❌ Erro ao buscar token atual: ${error.message}`);
        return null;
    }
}

/**
 * Remove integrações antigas de um projeto, mantendo apenas a atual
 */
async function limparIntegracoesAntigas(projetoId, integracaoAtualId) {
    try {
        // Busca integrações antigas (exceto a atual)
        const { data: antigas, error } = await supabase
            .from('Integrações')
            .select('id')
            .eq('PROJETO id', projetoId)
            .eq('Tipo de integração', 'Youtube')
            .neq('id', integracaoAtualId);
            
        if (error) {
            logger.error(`❌ Erro ao buscar integrações antigas: ${error.message}`);
            return;
        }
        
        if (!antigas?.length) return;
        
        logger.info(`🧹 Removendo ${antigas.length} integrações antigas do projeto ${projetoId}`);
        
        // Remove uma por uma para garantir
        for (const item of antigas) {
            try {
                // Verifica se algum projeto está usando esta integração
                const { data: usando } = await supabase
                    .from('Projeto')
                    .select('id')
                    .eq('Integrações', item.id);
                    
                if (usando?.length) {
                    // Primeiro remove a referência no projeto
                    await supabase
                        .from('Projeto')
                        .update({ 'Integrações': null })
                        .eq('Integrações', item.id);
                }
                
                // Agora pode excluir com segurança
                const { error: delError } = await supabase
                    .from('Integrações')
                    .delete()
                    .eq('id', item.id);
                    
                if (delError) {
                    logger.error(`❌ Erro ao remover integração ${item.id}: ${delError.message}`);
                } else {
                    logger.info(`✅ Integração antiga ${item.id} removida`);
                }
            } catch (err) {
                logger.error(`❌ Erro ao processar integração ${item.id}: ${err.message}`);
            }
        }
    } catch (error) {
        logger.error(`❌ Erro ao limpar integrações: ${error.message}`);
    }
}

/**
 * Testa o token diretamente contra a API do YouTube sem usar o cliente do Google
 */
async function testYouTubeTokenDirectly(accessToken) {
    try {
        if (!accessToken) {
            logger.warn('❌ Nenhum token de acesso fornecido para teste');
            return false;
        }
        
        // Faz uma chamada direta à API do YouTube com o token
        const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
                part: 'snippet',
                mine: true
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            validateStatus: false // Para capturar erros de status
        });
        
        // Verifica resposta
        if (response.status === 200 && response.data.items && response.data.items.length > 0) {
            logger.success(`✅ Token funcional - Acesso ao canal: ${response.data.items[0].snippet.title}`);
            return true;
        } else if (response.status === 401) {
            logger.warn(`❌ Token inválido (401 Unauthorized): ${response.data.error?.message || 'Acesso negado'}`);
            return false;
        } else {
            logger.warn(`❓ Resposta inesperada: Status ${response.status} - ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        logger.error(`❌ Erro na verificação direta: ${error.message}`);
        return false;
    }
}

/**
 * Atualiza o status da integração na tabela Projeto
 */
async function atualizarStatusIntegracao(projetoId, status) {
    try {
        const { error } = await supabase
            .from('Projeto')
            .update({ integracao_valida: status })
            .eq('id', projetoId);
            
        if (error) {
            logger.error(`❌ Erro ao atualizar status de integração do projeto ${projetoId}:`, error);
        } else {
            logger.info(`📝 Projeto ${projetoId} - Status integração: ${status ? 'VÁLIDA' : 'INVÁLIDA'}`);
        }
    } catch (error) {
        logger.error(`❌ Erro ao atualizar status de integração:`, error);
    }
}

/**
 * Retorna apenas projetos com integração válida (sem fazer verificação novamente)
 */
async function getValidProjects() {
    try {
        // Busca projetos válidos diretamente do banco de dados
        const { data: projetos, error } = await supabase
            .from('Projeto')
            .select(`
                id,
                "Project name",
                "Youtube Active",
                integracao_valida,
                "Integrações"
            `)
            .eq('Youtube Active', true)
            .eq('integracao_valida', true);
            
        if (error) {
            logger.error('❌ Erro ao buscar projetos válidos:', error);
            return [];
        }
        
        // Para cada projeto, busca a integração correspondente
        const projetosCompletos = [];
        
        for (const projeto of (projetos || [])) {
            const { data: integracao } = await supabase
                .from('Integrações')
                .select('*')
                .eq('id', projeto['Integrações'])
                .single();
                
            if (integracao) {
                projetosCompletos.push({
                    ...projeto,
                    Integrações: integracao
                });
            }
        }
        
        return projetosCompletos;
    } catch (error) {
        logger.error('❌ Erro ao buscar projetos válidos:', error);
        return [];
    }
}

// Se for executado diretamente
if (require.main === module) {
    (async () => {
        logger.info('🧪 Executando verificação de projetos...');
        await checkActiveProjects();
        
        // Busca valores atualizados do banco de dados para exibir
        const { data: projetosAtualizados } = await supabase
            .from('Projeto')
            .select(`
                id,
                "Project name",
                integracao_valida,
                "Integrações"
            `)
            .eq('Youtube Active', true);
            
        if (!projetosAtualizados?.length) {
            logger.warn('⚠️ Nenhum projeto encontrado');
            return;
        }
        
        logger.info('\n📊 Resultado da verificação:');
            
        for (const projeto of projetosAtualizados) {
            const { data: integracao } = await supabase
                .from('Integrações')
                .select('*')
                .eq('id', projeto['Integrações'])
                .single();
                
            if (integracao) {
                logger.info(`
    Projeto: ${projeto.id} (${projeto['Project name']})
    → Status: ${integracao.ativo ? '✅ Ativo' : '❌ Inativo'}
    → Integração Válida: ${projeto.integracao_valida ? '✅ Sim' : '❌ Não'}
    → Última Atualização: ${integracao['Ultima atualização'] ? 
        new Date(integracao['Ultima atualização']).toLocaleString() : 'Não disponível'}
    → Token: ${integracao['Refresh token'] ? '🔑 Presente' : '❌ Ausente'}
    → Observação: ${integracao['observacao'] || 'N/A'}
    -------------------------------------------`);
            }
        }
    })();
}

module.exports = { 
    checkActiveProjects,
    getValidProjects
};