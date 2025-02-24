// src/config/claude.js
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

if (!process.env.CLAUDE_API_KEY) {
    logger.error('❌ CLAUDE_API_KEY não encontrada no .env');
    process.exit(1);
}

// Configuração base do cliente Claude
const claude = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

// Configurações padrão
const CLAUDE_CONFIG = {
    model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
    maxTokens: 4096,
    temperature: 0.7
};

/**
 * Função única e flexível para usar o Claude
 * @param {string} prompt - Prompt completo para o Claude
 * @param {Object} options - Opções opcionais (model, maxTokens, temperature)
 */
async function analyzeContent(prompt, options = {}) {
    try {
        const response = await claude.messages.create({
            model: options.model || CLAUDE_CONFIG.model,
            max_tokens: options.maxTokens || CLAUDE_CONFIG.maxTokens,
            temperature: options.temperature || CLAUDE_CONFIG.temperature,
            messages: [{
                role: "user",
                content: prompt
            }]
        });

        return response.content[0].text;
    } catch (error) {
        logger.error('❌ Erro ao usar Claude:', error);
        return null;
    }
}

module.exports = {
    claude,
    CLAUDE_CONFIG,
    analyzeContent
};