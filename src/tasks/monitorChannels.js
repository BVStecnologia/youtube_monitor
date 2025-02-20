const logger = require('../utils/logger');
const { 
    updateTopChannels, 
    monitorTopChannelsVideos 
} = require('../services/channelService');
const supabase = require('../config/supabase');

async function monitorChannels() {
    try {
        logger.info('🚀 Iniciando monitoramento de canais...');

        // 1. Busca projetos ativos com integração YouTube
        const { data: projects, error } = await supabase
            .from('Projeto')
            .select(`
                id,
                "Project name",
                "Youtube Active",
                "Integrações"
            `)
            .eq('Youtube Active', true);

        if (error) throw error;

        // 2. Para cada projeto ativo
        for (const project of projects) {
            try {
                logger.info(`📺 Processando projeto: ${project['Project name']} (ID: ${project.id})`);

                // Debug: Vamos ver todos os scanners primeiro
                const { data: scanners, errorScan } = await supabase
                    .from('Scanner de videos do youtube')
                    .select('*');
                
                logger.info(`Scanners encontrados: ${JSON.stringify(scanners, null, 2)}`);

                // Verifica scanner do projeto
                const { data: scanner } = await supabase
                    .from('Scanner de videos do youtube')
                    .select('*')
                    .eq('Projeto_id', project.id)
                    .single();

                if (!scanner) {
                    logger.error(`Projeto ${project.id} não tem scanner configurado. Pulando...`);
                    continue;
                }

                // 2.1 Atualiza top 30 canais
                const updateResult = await updateTopChannels(project.id);
                if (!updateResult) {
                    logger.error(`Falha ao atualizar canais do projeto ${project.id}`);
                    continue;
                }

                // 2.2 Configura monitoramento de vídeos
                const monitorResult = await monitorTopChannelsVideos(project.id);
                if (!monitorResult) {
                    logger.error(`Falha ao configurar monitoramento do projeto ${project.id}`);
                    continue;
                }

                logger.success(`✅ Projeto ${project['Project name']} processado com sucesso`);
            } catch (projectError) {
                logger.error(`❌ Erro ao processar projeto ${project.id}:`, projectError);
                continue;
            }
        }

        logger.success('✅ Monitoramento de canais concluído');
        return true;
    } catch (error) {
        logger.error('❌ Erro no monitoramento de canais:', error);
        return false;
    }
}

// Se executado diretamente
if (require.main === module) {
    monitorChannels()
        .then(() => process.exit(0))
        .catch(error => {
            logger.error('❌ Erro fatal:', error);
            process.exit(1);
        });
}

module.exports = { monitorChannels };