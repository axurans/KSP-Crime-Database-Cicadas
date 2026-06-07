'use strict';

/**
 * Maps legacy IPC sections to modern BNS sections
 */
const IPC_TO_BNS_MAP = {
    '302': '103', // Murder
    '307': '109', // Attempt to murder
    '379': '303', // Theft
    '384': '308', // Extortion
    '420': '318', // Cheating
    '120B': '61(2)', // Criminal Conspiracy
    '143': '189', // Unlawful Assembly
    '323': '115', // Hurt
    '325': '117'  // Grievous Hurt
};

/**
 * Classifies query intent and extracts metadata filter properties
 * @param {string} query - The raw natural language input
 * @returns {Object} - { intent: string, filters: { district: string, sections: Array, dateFilter: string } }
 */
function classifyIntentAndExtractFilters(query) {
    const q = query.toLowerCase();
    
    // 1. Classify Intent
    let intent = 'SEARCH';
    if (q.includes('disruption') || q.includes('simulate') || q.includes('remove')) {
        intent = 'SIMULATE_DISRUPTION';
    }

    // 2. Extract District Filters (Common Karnataka districts)
    let district = null;
    if (q.includes('mysore')) district = 'Mysore';
    else if (q.includes('bangalore') || q.includes('bengaluru')) district = 'Bangalore';
    else if (q.includes('mangalore') || q.includes('mangaluru')) district = 'Mangalore';
    else if (q.includes('belagavi') || q.includes('belgaum')) district = 'Belagavi';

    // 3. Extract Legal Sections (IPC & BNS)
    const sections = [];
    
    // Check for explicit IPC mentions and add equivalent BNS mapping
    const ipcRegex = /ipc\s*(section)?\s*([0-9a-z]+)/gi;
    let match;
    while ((match = ipcRegex.exec(query)) !== null) {
        const ipcSec = match[2].toUpperCase();
        sections.push(`IPC ${ipcSec}`);
        if (IPC_TO_BNS_MAP[ipcSec]) {
            sections.push(`BNS ${IPC_TO_BNS_MAP[ipcSec]}`);
        }
    }

    // Check for explicit BNS mentions
    const bnsRegex = /bns\s*(section)?\s*([0-9a-z()]+)/gi;
    while ((match = bnsRegex.exec(query)) !== null) {
        const bnsSec = match[2];
        sections.push(`BNS ${bnsSec}`);
    }

    // Keyword mappings
    if (q.includes('theft') || q.includes('stealing')) {
        if (!sections.includes('IPC 379')) sections.push('IPC 379');
        if (!sections.includes('BNS 303')) sections.push('BNS 303');
    }
    if (q.includes('murder') || q.includes('killing')) {
        if (!sections.includes('IPC 302')) sections.push('IPC 302');
        if (!sections.includes('BNS 103')) sections.push('BNS 103');
    }
    if (q.includes('cheat') || q.includes('fraud')) {
        if (!sections.includes('IPC 420')) sections.push('IPC 420');
        if (!sections.includes('BNS 318')) sections.push('BNS 318');
    }

    // 4. Extract Date Filter
    let dateFilter = null;
    const yearMatch = q.match(/\b(20\d{2})\b/);
    if (yearMatch) {
        // Filter from start of that year
        dateFilter = `${yearMatch[1]}-01-01 00:00:00`;
    }

    return {
        intent,
        filters: {
            district,
            sections,
            dateFilter
        }
    };
}

module.exports = {
    classifyIntentAndExtractFilters,
    IPC_TO_BNS_MAP
};
