'use strict';

const crypto = require('crypto');

/**
 * Calculates a SHA-256 signature chain hash
 * @param {Object} logData - The current log record fields
 * @param {string} previousSignature - The signature of the previous database row
 * @returns {string} - The new chained signature
 */
function calculateSignature(logData, previousSignature) {
    const payload = JSON.stringify({
        correlation_id: logData.correlation_id,
        job_id: logData.job_id,
        timestamp: logData.timestamp,
        action: logData.action,
        prompt_tokens: logData.prompt_tokens,
        completion_tokens: logData.completion_tokens,
        input_hash: logData.input_hash,
        previous_signature: previousSignature || 'SEED_SIGNATURE_INIT_00000000000000000000000000000000'
    });
    
    return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Write a forensic log record to Catalyst Data Store with signature chaining
 * @param {Object} catalystApp - The initialized Catalyst SDK instance
 * @param {Object} logParams - parameters for the log record (action, correlation_id, job_id, tokens, input_hash)
 */
async function writeAuditLog(catalystApp, logParams) {
    try {
        const table = catalystApp.datastore().table('AI_Execution_Logs');
        
        // 1. Fetch the last log signature from Data Store using ZCQL
        let lastSignature = 'SEED_SIGNATURE_INIT_00000000000000000000000000000000';
        try {
            const queryResult = await catalystApp.zcql().executeQuery(
                'SELECT signature FROM AI_Execution_Logs ORDER BY log_id DESC LIMIT 1'
            );
            if (queryResult && queryResult.length > 0) {
                lastSignature = queryResult[0].AI_Execution_Logs.signature;
            }
        } catch (dbErr) {
            // Log warning, fall back to seed signature if table is empty
            console.warn(`[AUDIT_LOG_WARN] Failed to fetch previous signature (table may be empty): ${dbErr.message}`);
        }

        // 2. Prepare log data
        const logData = {
            correlation_id: logParams.correlation_id,
            job_id: logParams.job_id || 'N/A',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19), // Catalyst Datetime format YYYY-MM-DD HH:mm:ss
            action: logParams.action,
            prompt_tokens: logParams.prompt_tokens || 0,
            completion_tokens: logParams.completion_tokens || 0,
            input_hash: logParams.input_hash || crypto.createHash('sha256').update(logParams.action).digest('hex')
        };

        // 3. Compute chained signature
        const newSignature = calculateSignature(logData, lastSignature);
        logData.signature = newSignature;

        // 4. Write to Data Store
        await table.insertRow(logData);
        console.log(`[AUDIT_LOG_SUCCESS] Logged action: ${logParams.action} | Sig: ${newSignature.substring(0, 8)}`);
        
        return newSignature;
    } catch (err) {
        // Fallback: If DB write fails, log heavily to stdout so logs are preserved in App logs
        console.error(`[AUDIT_LOG_CRITICAL_FAILURE] Signature chain log failed: ${err.message}`, {
            logParams,
            error: err
        });
        // Throwing error since forensic logging is a mandatory DPDP/legal compliance gate
        throw new Error(`Forensic audit logging failed: ${err.message}`);
    }
}

module.exports = {
    calculateSignature,
    writeAuditLog
};
