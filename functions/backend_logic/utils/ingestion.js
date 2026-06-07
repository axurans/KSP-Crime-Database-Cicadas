'use strict';

const crypto = require('crypto');
const { writeAuditLog } = require('./audit');

/**
 * Generates a SHA-256 hash for forensic admissibility checks
 * @param {Buffer|string} buffer - Raw file content or string
 * @returns {string} - SHA-256 hash
 */
function computeForensicHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Simulates calling India's national Bhashini API for Kannada speech-to-text
 */
async function callBhashiniSTT(audioBuffer) {
    console.log('[BHASHINI_STT] Invoking Bhashini Regional Speech Ingestion Webhook...');
    
    // Check for mock environment vs actual token
    if (!process.env.BHASHINI_API_KEY) {
        console.log('[BHASHINI_STT_WARN] BHASHINI_API_KEY missing. Running in Mock Staging Mode.');
        return 'ರಮೇಶ್ ಮೈಸೂರಿನಲ್ಲಿ ಕಳ್ಳತನ ಮಾಡಿದ್ದಾನೆ (Ramesh committed theft in Mysore)';
    }

    // Actual Bhashini API request pattern:
    // const response = await fetch('https://dhruva.bhashini.gov.in/services/inference/pipeline', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': process.env.BHASHINI_API_KEY
    //     },
    //     body: JSON.stringify({ ... })
    // });
    // return response.json();
    return 'రమేశ్ ಮೈಸೂರಿನಲ್ಲಿ ಕಳ್ಳತನ ಮಾಡಿದ್ದಾನೆ (Bhashini API Translated)';
}

/**
 * Ingest voice audio with SHA-256 chain-of-custody logging and STT processing
 * @param {Object} catalystApp - The initialized Catalyst SDK instance
 * @param {Buffer} audioBuffer - Binary audio payload
 * @param {string} correlationId - System trace identifier
 * @returns {Promise<Object>} - { forensicHash, transcription, fallbackActive }
 */
async function ingestVoiceAudio(catalystApp, audioBuffer, correlationId) {
    try {
        if (!audioBuffer) {
            throw new Error('Audio payload is empty.');
        }

        // 1. Generate SHA-256 forensic hash immediately upon ingestion
        const hash = computeForensicHash(audioBuffer);
        console.log(`[UFIP_AUDIO] Computed Forensic Hash: ${hash}`);

        // 2. Commit hash to AI_Execution_Logs prior to processing (admissibility rule)
        await writeAuditLog(catalystApp, {
            correlation_id: correlationId,
            action: `UFIP_INGEST_AUDIO: Hash ${hash.substring(0, 10)}...`,
            input_hash: hash,
            prompt_tokens: audioBuffer.length,
            completion_tokens: hash.length
        });

        let transcription = '';
        let fallbackActive = false;

        // 3. Process transcription (Zia STT vs Fallback)
        try {
            // Attempt Zia STT (mocking local API call for Datathon)
            // const zia = catalystApp.zia();
            // transcription = await zia.speechToText(audioBuffer);
            
            // For testing, simulate a fallback trigger (e.g. mock Zia returning dialect error or low confidence)
            console.log('[ZIA_STT] Zia STT confidence score: 0.72 (< 0.85 threshold).');
            throw new Error('Zia STT regional dialect parsing failed.');
        } catch (sttErr) {
            console.warn(`[ZIA_STT_FAIL] STT failed, switching to fallback: ${sttErr.message}`);
            fallbackActive = true;
            
            // Execute Bhashini fallback
            transcription = await callBhashiniSTT(audioBuffer);
        }

        return {
            forensicHash: hash,
            transcription,
            fallbackActive
        };
    } catch (err) {
        console.error(`[UFIP_AUDIO_CRITICAL] Ingestion pipeline failed: ${err.message}`);
        throw err;
    }
}

/**
 * Ingest scanned document PDF with SHA-256 chain-of-custody logging and OCR parsing
 * @param {Object} catalystApp - The initialized Catalyst SDK instance
 * @param {Buffer} pdfBuffer - Binary PDF payload
 * @param {string} correlationId - System trace identifier
 * @returns {Promise<Object>} - { forensicHash, textContent }
 */
async function ingestDocumentPDF(catalystApp, pdfBuffer, correlationId) {
    try {
        if (!pdfBuffer) {
            throw new Error('PDF payload is empty.');
        }

        // 1. Generate SHA-256 forensic hash
        const hash = computeForensicHash(pdfBuffer);
        console.log(`[UFIP_PDF] Computed Forensic Hash: ${hash}`);

        // 2. Commit hash to AI_Execution_Logs
        await writeAuditLog(catalystApp, {
            correlation_id: correlationId,
            action: `UFIP_INGEST_PDF: Hash ${hash.substring(0, 10)}...`,
            input_hash: hash,
            prompt_tokens: pdfBuffer.length,
            completion_tokens: hash.length
        });

        // 3. Process scanned text (Zia OCR mock)
        let textContent = '';
        try {
            // Mocking OCR extraction
            textContent = 'FIR Case No. 23/2024. Accused Ramesh Kumar committed theft in Mysore station limits under section IPC 379.';
        } catch (ocrErr) {
            console.error(`[ZIA_OCR_FAIL] OCR processing failed: ${ocrErr.message}`);
            throw ocrErr;
        }

        return {
            forensicHash: hash,
            textContent
        };
    } catch (err) {
        console.error(`[UFIP_PDF_CRITICAL] Ingestion pipeline failed: ${err.message}`);
        throw err;
    }
}

module.exports = {
    computeForensicHash,
    ingestVoiceAudio,
    ingestDocumentPDF,
    callBhashiniSTT
};
