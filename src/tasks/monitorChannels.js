// src/tasks/monitorChannels.js
const logger = require('../utils/logger');
const supabase = require('../config/supabase');

/**
 * Função principal que monitora os canais do YouTube
 * Usa projetos que já foram validados pelo activeProjects
 */
async function monitorChannels() {
    try {
        logger.info('\n🚀 Iniciando monitoramento de canais do YouTube...');
        
        // 1. Busca diretamente os projetos QUE JÁ ESTÃO VALIDADOS no sistema
        const { data: projetosValidos, error } = await supabase
            .from('Projeto')
            .select(`
                id,
                "Project name",
                "Youtube Active",
                integracao_valida
            `)
            .eq('Youtube Active', true)
            .eq('integracao_valida', true);
        
        if (error) {
            logger.error('❌ Erro ao buscar projetos válidos:', error);
            return false;
        }
        
        if (!projetosValidos?.length) {
            logger.warn('⚠️ Nenhum projeto com integração YouTube válida encontrado');
            logger.info('ℹ️ Dica: Execute primeiro "node src/tasks/activeProjects.js" para validar as integrações');
            return false;
        }
        
        logger.info(`📊 Encontrados ${projetosValidos.length} projetos com integração válida:`);
        projetosValidos.forEach(p => logger.info(`   → ${p['Project name']} (ID: ${p.id})`));
        
        // 2. Garante que a tabela de canais existe
        await garantirTabelaCanais();
        
        // 3. Para cada projeto VÁLIDO
        for (const projeto of projetosValidos) {
            try {
                logger.info(`\n📊 Processando canais do projeto: ${projeto['Project name']} (ID: ${projeto.id})`);
                
                // Busca o ranking atual de canais da view especificada
                const { data: rankingCanais, error: rankError } = await supabase
                    .from('channel_lead_ranking')
                    .select(`
                        author_channel_id,
                        author_name,
                        total_comments,
                        lead_comments,
                        avg_lead_score,
                        last_lead_interaction,
                        video_count,
                        ranking_position
                    `)
                    .eq('projeto_id', projeto.id)
                    .order('ranking_position', { ascending: true })
                    .limit(30);
                
                if (rankError) {
                    logger.error(`❌ Erro ao buscar ranking para projeto ${projeto.id}:`, rankError);
                    continue;
                }
                
                if (!rankingCanais?.length) {
                    logger.warn(`⚠️ Nenhum canal ranqueado para projeto ${projeto.id}`);
                    
                    // Verifica se existem leads para este projeto
                    const { count, error: countError } = await supabase
                        .from('Comentarios_Principais')
                        .select('*', { count: 'exact', head: true })
                        .eq('led', true)
                        .eq('projeto_id', projeto.id);
                    
                    if (countError) {
                        logger.error(`❌ Erro ao verificar leads: ${countError.message}`);
                    } else if (count === 0) {
                        logger.info(`ℹ️ Projeto ${projeto.id} não possui leads identificados`);
                    } else {
                        logger.info(`ℹ️ Projeto ${projeto.id} tem ${count} leads, mas nenhum canal ranqueado`);
                    }
                    
                    continue;
                }
                
                logger.info(`ℹ️ Encontrados ${rankingCanais.length} canais ranqueados para monitorar`);
                
                // Atualiza os canais usando a função interna
                const updated = await updateTopChannels(projeto.id, rankingCanais);
                
                if (updated) {
                    logger.success(`✅ Canais atualizados com sucesso para projeto ${projeto.id}`);
                } else {
                    logger.warn(`⚠️ Atualização de canais incompleta para projeto ${projeto.id}`);
                }
            } catch (projetoError) {
                logger.error(`❌ Erro ao processar projeto ${projeto.id}:`, projetoError);
            }
        }
        
        logger.success('\n✅ Monitoramento de canais finalizado com sucesso');
        return true;
    } catch (error) {
        logger.error('❌ Erro no monitoramento de canais:', error);
        return false;
    }
}

/**
 * Atualiza os 30 principais canais de um projeto baseado no ranking
 */
async function updateTopChannels(projectId, channels) {
    try {
        logger.info(`Atualizando top canais para projeto ${projectId}...`);

        if (!channels || channels.length === 0) {
            logger.warn('⚠️ Nenhum canal para atualizar');
            return false;
        }

        // Prepara os canais para inserção/atualização
        const channelsToUpdate = channels.map(channel => ({
            "Nome": channel.author_name || 'Canal sem nome',
            "channel_id": channel.author_channel_id, // Usa exatamente o ID da view
            "Projeto": projectId,
            "ranking_score": channel.avg_lead_score || 0,
            "rank_position": channel.ranking_position || 0,
            "total_leads": channel.lead_comments || 0,
            "total_comments": channel.total_comments || 0,
            "last_interaction": channel.last_lead_interaction,
            "videos": channel.video_count || 0,
            "Criador": channel.author_name || 'Canal sem nome',
            "ultima_atualizacao": new Date().toISOString()
        }));

        let atualizados = 0;
        let novos = 0;
        let erros = 0;

        // Processa cada canal
        for (const channel of channelsToUpdate) {
            // Verifica se tem ID de canal
            if (!channel.channel_id) {
                logger.warn(`⚠️ Canal sem ID válido: ${channel.Nome}`);
                erros++;
                continue;
            }

            try {
                // Verifica se canal já existe
                const { data: existing, error: searchError } = await supabase
                    .from('Canais do youtube')
                    .select('id')
                    .eq('channel_id', channel.channel_id)
                    .eq('Projeto', projectId)
                    .maybeSingle();

                if (searchError) {
                    logger.error(`❌ Erro ao buscar canal ${channel.channel_id}: ${searchError.message}`);
                    erros++;
                    continue;
                }

                if (existing?.id) {
                    // Atualiza canal existente
                    const { error: updateError } = await supabase
                        .from('Canais do youtube')
                        .update(channel)
                        .eq('id', existing.id);

                    if (updateError) {
                        logger.error(`❌ Erro ao atualizar canal ${channel.channel_id}: ${updateError.message}`);
                        erros++;
                    } else {
                        atualizados++;
                    }
                } else {
                    // Insere novo canal
                    const { error: insertError } = await supabase
                        .from('Canais do youtube')
                        .insert([channel]);

                    if (insertError) {
                        logger.error(`❌ Erro ao inserir canal ${channel.channel_id}: ${insertError.message}`);
                        erros++;
                    } else {
                        novos++;
                    }
                }
            } catch (canalError) {
                logger.error(`❌ Erro ao processar canal ${channel.channel_id}: ${canalError.message}`);
                erros++;
            }
        }

        logger.info(`📊 Resumo: ${atualizados} canais atualizados, ${novos} novos canais, ${erros} erros`);
        return (atualizados + novos) > 0; // Sucesso se pelo menos um canal foi processado
    } catch (error) {
        logger.error('❌ Erro em updateTopChannels:', error.message);
        return false;
    }
}

/**
 * Garante que a tabela de canais do YouTube existe
 */
async function garantirTabelaCanais() {
    try {
        // Testa se a tabela existe
        const { error } = await supabase
            .from('Canais do youtube')
            .select('id')
            .limit(1);
            
        if (error) {
            logger.warn('⚠️ Tabela "Canais do youtube" parece não existir, tentando criar...');
            
            // Tenta criar a tabela
            const createSQL = `
              CREATE TABLE IF NOT EXISTS "Canais do youtube" (
                id BIGSERIAL PRIMARY KEY,
                "Nome" TEXT,
                channel_id TEXT NOT NULL,
                "Projeto" BIGINT,
                ranking_score FLOAT,
                rank_position INTEGER,
                total_leads INTEGER,
                total_comments INTEGER,
                last_interaction TIMESTAMP WITH TIME ZONE,
                videos INTEGER,
                "Criador" TEXT,
                ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now()
              );
              
              -- Adiciona índice único se não existir
              CREATE UNIQUE INDEX IF NOT EXISTS canais_youtube_channel_projeto_idx 
              ON "Canais do youtube" (channel_id, "Projeto");
            `;
            
            // Tenta executar o SQL via supabase
            try {
                // Se o supabase tiver função para executar SQL diretamente
                const { error: sqlError } = await supabase.rpc('execute_sql', { sql: createSQL });
                
                if (sqlError) {
                    logger.error(`❌ Erro ao criar tabela: ${sqlError.message}`);
                    logger.info('ℹ️ A tabela pode precisar ser criada manualmente');
                } else {
                    logger.success('✅ Tabela de canais criada com sucesso');
                }
            } catch (rpcError) {
                logger.error(`❌ Erro ao executar SQL: ${rpcError.message}`);
                logger.info('ℹ️ A função RPC pode não existir ou você não tem permissões');
            }
        } else {
            logger.info('✅ Tabela "Canais do youtube" já existe');
        }
    } catch (error) {
        logger.error('❌ Erro ao verificar tabela de canais:', error.message);
    }
}

// Se executado diretamente
if (require.main === module) {
    (async () => {
        await monitorChannels();
    })();
}

module.exports = { monitorChannels };