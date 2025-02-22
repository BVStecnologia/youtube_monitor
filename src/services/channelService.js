// src/services/channelService.js
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

async function updateTopChannels(projectId, topChannels) {
    try {
        logger.info(`Atualizando top canais para projeto ${projectId}...`);

        if (!topChannels || topChannels.length === 0) {
            logger.warn('Nenhum canal para atualizar');
            return false;
        }

        // 2. Prepara top 30 canais com os campos corretos da tabela
        const channelsToUpdate = topChannels
            .slice(0, 30)
            .map(channel => ({
                "Nome": channel.author_name,
                "channel_id": channel.author_channel_id,
                "Projeto": projectId,
                "ranking_score": channel.avg_lead_score || 0,
                "rank_position": channel.ranking_position || 0,
                "total_leads": channel.lead_comments || 0,
                "videos": null,
                "Criador": channel.author_name
            }));

        // 3. Insere/Atualiza canais
        for (const channel of channelsToUpdate) {
            // Verifica se canal existe
            const { data: existing } = await supabase
                .from('Canais do youtube')
                .select('id')
                .eq('channel_id', channel.channel_id)
                .eq('Projeto', projectId)
                .single();

            if (existing) {
                // Atualiza existente
                const { error } = await supabase
                    .from('Canais do youtube')
                    .update(channel)
                    .eq('id', existing.id);

                if (error) {
                    logger.error(`Erro ao atualizar canal ${channel.channel_id}:`, error);
                }
            } else {
                // Insere novo
                const { error } = await supabase
                    .from('Canais do youtube')
                    .insert([channel]);

                if (error) {
                    logger.error(`Erro ao inserir canal ${channel.channel_id}:`, error);
                }
            }
        }

        logger.success(`✅ ${channelsToUpdate.length} canais processados para projeto ${projectId}`);
        return true;
    } catch (error) {
        logger.error('Erro em updateTopChannels:', error);
        return false;
    }
}

module.exports = {
    updateTopChannels
};