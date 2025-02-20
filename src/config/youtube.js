require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const supabase = require('./supabase');
const logger = require('../utils/logger');

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    throw new Error('Variáveis de ambiente CLIENT_ID e CLIENT_SECRET são necessárias');
}

const oauth2Client = new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

async function getRefreshToken(projectId) {
    try {
        // Modificado para pegar a integração mais recente
        const { data, error } = await supabase
            .from('Integrações')
            .select('id, "Refresh token", "Ultima atualização"')
            .eq('PROJETO id', projectId)
            .eq('Tipo de integração', 'Youtube')
            .eq('ativo', true)  // Apenas integrações ativas
            .order('Ultima atualização', { ascending: false })
            .limit(1);  // Pega apenas o mais recente

        if (error) throw error;
        if (!data || data.length === 0 || !data[0]['Refresh token']) {
            throw new Error(`Refresh token não encontrado para o projeto ${projectId}`);
        }

        return {
            token: data[0]['Refresh token'],
            integrationId: data[0].id
        };
    } catch (error) {
        logger.error('Erro ao buscar refresh token:', error);
        throw error;
    }
}

async function updateRefreshToken(integrationId, newToken) {
    try {
        const { error } = await supabase
            .from('Integrações')
            .update({
                'Refresh token': newToken,
                'Ultima atualização': new Date().toISOString()
            })
            .eq('id', integrationId);

        if (error) throw error;
        logger.info('Token atualizado com sucesso');
    } catch (error) {
        logger.error('Erro ao atualizar refresh token:', error);
        throw error;
    }
}

async function createYoutubeClient(projectId) {
    try {
        // Buscar token atual
        const { token, integrationId } = await getRefreshToken(projectId);
        
        // Configurar cliente
        oauth2Client.setCredentials({ refresh_token: token });

        // Adicionar listener para atualização de token
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.refresh_token) {
                logger.info('Novo refresh token recebido, atualizando...');
                await updateRefreshToken(integrationId, tokens.refresh_token);
            }
        });

        // Criar e retornar cliente YouTube
        return google.youtube({ 
            version: 'v3', 
            auth: oauth2Client 
        });

    } catch (error) {
        logger.error('Erro ao criar cliente YouTube:', error);
        throw error;
    }
}

async function cleanupOldIntegrations(projectId) {
    try {
        // Desativa integrações antigas
        const { error } = await supabase
            .from('Integrações')
            .update({ ativo: false })
            .eq('PROJETO id', projectId)
            .eq('Tipo de integração', 'Youtube')
            .lt('Ultima atualização', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;
        logger.info('Limpeza de integrações antigas concluída');
    } catch (error) {
        logger.error('Erro ao limpar integrações antigas:', error);
    }
}

module.exports = { 
    createYoutubeClient, 
    oauth2Client,
    getRefreshToken,
    updateRefreshToken,
    cleanupOldIntegrations
};