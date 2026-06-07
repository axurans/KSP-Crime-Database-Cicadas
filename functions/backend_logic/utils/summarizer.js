'use strict';

/**
 * Manage conversational memory sliding window cache
 */
class SessionMemory {
    constructor(catalystApp, sessionId) {
        this.catalystApp = catalystApp;
        this.sessionId = sessionId;
        this.cacheSegment = catalystApp.cache().segment('SessionMemory');
    }

    /**
     * Get conversation history
     * @returns {Promise<Object>} - { summary: string, turns: Array<{ role: string, text: string }> }
     */
    async getHistory() {
        try {
            const data = await this.cacheSegment.getValue(this.sessionId);
            if (data) {
                return JSON.parse(data);
            }
        } catch (err) {
            console.error(`[CACHE_WARN] Failed to read session memory: ${err.message}`);
        }
        return { summary: '', turns: [] };
    }

    /**
     * Save conversation history
     * @param {Object} history - { summary: string, turns: Array }
     * @param {number} expiryInMinutes - TTL (default 60 minutes)
     */
    async saveHistory(history, expiryInMinutes = 60) {
        try {
            await this.cacheSegment.put(this.sessionId, JSON.stringify(history), expiryInMinutes);
        } catch (err) {
            console.error(`[CACHE_ERROR] Failed to save session memory: ${err.message}`);
        }
    }

    /**
     * Add a turn (user question & assistant answer) and slide window if turns > 4
     * @param {string} userQuestion 
     * @param {string} assistantAnswer 
     */
    async addTurn(userQuestion, assistantAnswer) {
        const history = await this.getHistory();
        
        history.turns.push({ role: 'user', text: userQuestion });
        history.turns.push({ role: 'assistant', text: assistantAnswer });

        // Slide window if turns exceed 4 exchanges (8 items in array)
        if (history.turns.length > 8) {
            console.log(`[MEM_SLIDE] Turns (${history.turns.length / 2}) exceed limit of 4. Collapsing context...`);
            
            // 1. Extract turns to summarize (excluding the latest exchange)
            const turnsToSummarize = history.turns.slice(0, -2);
            const latestExchange = history.turns.slice(-2);

            // 2. Perform summarization
            let summaryText = '';
            try {
                summaryText = await this._summarizeTurns(history.summary, turnsToSummarize);
            } catch (err) {
                console.error(`[MEM_SUMMARIZE_FAIL] Summarizer failed: ${err.message}. Cascading to mock summarizer.`);
                summaryText = this._fallbackMockSummarize(history.summary, turnsToSummarize);
            }

            // 3. Save summarized window
            history.summary = summaryText;
            history.turns = latestExchange;
        }

        await this.saveHistory(history);
        return history;
    }

    /**
     * Call QuickML/LLM to summarize historical turns (or mock if not configured)
     */
    async _summarizeTurns(existingSummary, turns) {
        const textToSummarize = turns.map(t => `${t.role}: ${t.text}`).join('\n');
        const prompt = `Summarize the following conversation history density and concatenate with any existing summary. Keep it brief, factual, and strictly under 150 words.\nExisting Summary: ${existingSummary}\nNew Conversation:\n${textToSummarize}`;
        
        try {
            // Attempt QuickML endpoint call
            // const model = this.catalystApp.quickML().model('Summarizer');
            // const response = await model.predict({ prompt });
            // return response.prediction;
            
            // For Datathon phase 3 mocking, throw error to verify fallback path works
            throw new Error('QuickML model "Summarizer" is not initialized.');
        } catch (err) {
            // Propagate error to trigger fallback mechanism
            throw err;
        }
    }

    /**
     * Simple fallback summarizer to prevent conversation block if LLM fails
     */
    _fallbackMockSummarize(existingSummary, turns) {
        const dialogTokens = turns.map(t => t.text.substring(0, 30) + '...').join(' | ');
        const dateStr = new Date().toISOString().substring(11, 19);
        return `${existingSummary ? existingSummary + ' ; ' : ''}Dialog collapsed at ${dateStr}: [${dialogTokens}]`;
    }
}

module.exports = SessionMemory;
