// src/utils/transcriptionHelper.js
const axios = require('axios');
const logger = require('./logger');

// Fila de processamento
let transcriptionQueue = [];
let isProcessing = false;

/**
 * Processa a fila de transcrições uma por uma
 */
async function processQueue() {
    if (isProcessing || transcriptionQueue.length === 0) return;
    
    isProcessing = true;
    
    while (transcriptionQueue.length > 0) {
        const { videoId, resolve, reject } = transcriptionQueue.shift();
        
        try {
            // Processa um vídeo
            const result = await processTranscription(videoId);
            resolve(result);
            
            // Espera 2 segundos entre requisições
            await new Promise(r => setTimeout(r, 2000));
            
        } catch (error) {
            reject(error);
        }
    }
    
    isProcessing = false;
}

/**
 * Processa transcrição individual
 */
async function processTranscription(videoId) {
    try {
        const response = await axios.post('https://youtube-transcribe.fly.dev/transcribe', {
            url: `https://www.youtube.com/watch?v=${videoId}`
        }, {
            timeout: 300000 // 5 minutos
        });

        if (response.data?.detail) {
            logger.warn(`API retornou erro: ${response.data.detail}`);
            return { text: '', withTimestamps: '', duration: 0 };
        }

        const fullText = response.data.transcription || '';
        const cleanedText = fullText.replace(/TRANSCRIÇÃO DO VÍDEO\nID:.*\nData:.*\n={1,}\n\n/g, '');

        const timestamps = cleanedText.match(/\[(\d{2}):(\d{2}):(\d{2})\]/g) || [];
        let duration = 0;
        
        if (timestamps.length > 0) {
            const lastTimestamp = timestamps[timestamps.length - 1];
            const [_, hours, minutes, seconds] = lastTimestamp.match(/\[(\d{2}):(\d{2}):(\d{2})\]/) || [];
            duration = (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(seconds);
        }

        const MAX_DURATION = 1800;
        if (duration > MAX_DURATION) {
            const limitedText = cleanedText.split('\n').reduce((acc, line) => {
                const timeMatch = line.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
                if (!timeMatch) return acc;
                
                const seconds = (parseInt(timeMatch[1]) * 3600) + 
                              (parseInt(timeMatch[2]) * 60) + 
                              parseInt(timeMatch[3]);
                
                if (seconds <= MAX_DURATION) acc.push(line);
                return acc;
            }, []).join('\n');

            return {
                text: limitedText.replace(/\[\d{2}:\d{2}:\d{2}\]\s*/g, ''),
                withTimestamps: limitedText,
                duration: Math.min(duration, MAX_DURATION)
            };
        }

        return {
            text: cleanedText.replace(/\[\d{2}:\d{2}:\d{2}\]\s*/g, ''),
            withTimestamps: cleanedText,
            duration: duration
        };

    } catch (error) {
        if (error.response?.status === 500 && error.response?.data?.detail?.includes('URL do YouTube inválida')) {
            logger.warn(`Vídeo inválido: ${videoId}`);
            return { text: '', withTimestamps: '', duration: 0 };
        }

        throw error; // Propaga erro para ser tratado pela fila
    }
}

/**
 * Interface pública para obter transcrição
 */
async function getVideoTranscription(videoId) {
    return new Promise((resolve, reject) => {
        // Adiciona à fila
        transcriptionQueue.push({ videoId, resolve, reject });
        
        // Inicia processamento se não estiver rodando
        processQueue().catch(error => {
            logger.error(`Erro ao processar fila de transcrições:`, error);
        });
    });
}

module.exports = {
    getVideoTranscription
};