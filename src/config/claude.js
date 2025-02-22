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
 * Analisa conteúdo com contexto específico
 */
async function analyzeContent(content, projectContext) {
    try {
        const response = await claude.messages.create({
            model: CLAUDE_CONFIG.model,
            max_tokens: CLAUDE_CONFIG.maxTokens,
            messages: [{
                role: "user",
                content: `
                    Contexto do Projeto: ${projectContext}
                    
                    Conteúdo para análise: ${content}
                    
                    Por favor, analise se este conteúdo é relevante para o contexto do projeto.
                    Responda apenas com:
                    {
                        "relevante": true/false,
                        "score": 0-100,
                        "razao": "breve explicação"
                    }
                `
            }]
        });

        return JSON.parse(response.content[0].text);
    } catch (error) {
        logger.error('❌ Erro ao analisar com Claude:', error);
        return null;
    }
}

/**
 * Sumariza conteúdo
 */
async function summarizeContent(content) {
    try {
        const response = await claude.messages.create({
            model: CLAUDE_CONFIG.model,
            max_tokens: CLAUDE_CONFIG.maxTokens,
            messages: [{
                role: "user",
                content: `
                    Sumarize o seguinte conteúdo em no máximo 3 parágrafos:
                    ${content}
                `
            }]
        });

        return response.content[0].text;
    } catch (error) {
        logger.error('❌ Erro ao sumarizar com Claude:', error);
        return null;
    }
}

module.exports = {
    claude,
    CLAUDE_CONFIG,
    analyzeContent,
    summarizeContent
};