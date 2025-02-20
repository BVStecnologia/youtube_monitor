// src/utils/logger.js

const logger = {
    info: (message) => {
        console.log(`ℹ️ ${message}`);
    },
    error: (message, error = '') => {
        console.error(`❌ ${message}`, error);
    },
    success: (message) => {
        console.log(`✅ ${message}`);
    },
    warn: (message) => {
        console.log(`⚠️ ${message}`);
    }
};

module.exports = logger;