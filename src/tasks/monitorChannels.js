// src/tasks/monitorChannels.js
const logger = require('../utils/logger');
const supabase = require('../config/supabase');
const { buscarProjetoId } = require('./buscarProjetoId');
const { updateTopChannels } = require('../services/channelService');

async function monitorChannels() {
    try {
        logger.info('🚀 Iniciando atualização de ranking de canais...');

        // 1. Busca projetos com YouTube válido
        const projetos = await buscarProjetoId();

        // 2. Filtra só os ativos
        const projetosAtivos = projetos.filter(p => p.Integrações.ativo === true);

        if (!projetosAtivos.length) {
            logger.warn('⚠️ Nenhum projeto ativo encontrado');
            return false;
        }

        logger.info(`📊 Processando ${projetosAtivos.length} projetos ativos:`);
        projetosAtivos.forEach(p => logger.info(`   → ${p['Project name']} (ID: ${p.id})`));

        // 3. Para cada projeto ATIVO
        for (const project of projetosAtivos) {
            try {
                logger.info(`\n📊 Processando ranking do projeto: ${project['Project name']}`);

                const { data: channelRanking, error: rankError } = await supabase
                    .from('channel_lead_ranking')
                    .select('*')
                    .eq('projeto_id', project.id)
                    .order('ranking_position', { ascending: true })
                    .limit(30);

                if (rankError) {
                    logger.error(`❌ Erro ao buscar ranking:`, rankError);
                    continue;
                }

                if (!channelRanking?.length) {
                    logger.warn(`⚠️ Nenhum canal ranqueado para projeto ${project.id}`);
                    continue;
                }

                const updated = await updateTopChannels(project.id, channelRanking);
                if (updated) {
                    logger.success(`✅ Ranking atualizado para ${project['Project name']}`);
                }

            } catch (projectError) {
                logger.error(`❌ Erro no projeto ${project.id}:`, projectError);
            }
        }

        logger.success('✅ Processamento finalizado');
        return true;
    } catch (error) {
        logger.error('❌ Erro:', error);
        return false;
    }
}

module.exports = { monitorChannels };