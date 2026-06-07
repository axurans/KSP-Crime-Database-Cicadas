'use strict';

/**
 * Checks the degree (connection count) of nodes to identify super-nodes
 * @param {Object} catalystApp - The initialized Catalyst SDK instance
 * @param {Array<string>} nodeIds - List of node IDs to audit
 * @returns {Promise<Map<string, number>>} - Map of node_id to degree count
 */
async function getNodeDegrees(catalystApp, nodeIds) {
    const degreeMap = new Map();
    if (!nodeIds || nodeIds.length === 0) return degreeMap;

    // ZCQL chunking (maximum IN list is typically 100-1000, we'll chunk by 50 to be safe)
    const chunkSize = 50;
    for (let i = 0; i < nodeIds.length; i += chunkSize) {
        const chunk = nodeIds.slice(i, i + chunkSize);
        const quotedNodes = chunk.map(id => `'${id}'`).join(',');
        
        const query = `SELECT source_id, COUNT(edge_id) FROM Edges WHERE source_id IN (${quotedNodes}) GROUP BY source_id`;
        try {
            const results = await catalystApp.zcql().executeQuery(query);
            results.forEach(row => {
                const sourceId = row.Edges.source_id;
                const count = parseInt(row.Edges.edge_id, 10) || 0; // COUNT returns alias as column name
                degreeMap.set(sourceId, count);
            });
        } catch (err) {
            console.error(`[GRAPH_WARN] Failed to get degree counts for chunk: ${err.message}`);
        }
    }
    
    return degreeMap;
}

/**
 * Execute a temporal BFS traversal up to 2-hops with super-node cutoff (degree > 500)
 * @param {Object} catalystApp - The initialized Catalyst SDK instance
 * @param {string} startNodeId - The root node_id of the search
 * @param {Object} options - { dateFilter, maxHops: 2 }
 * @returns {Promise<Object>} - Graph object containing { nodes: [], edges: [] }
 */
async function executeTemporalBFS(catalystApp, startNodeId, options = {}) {
    const maxHops = options.maxHops || 2;
    const dateFilter = options.dateFilter || null; // Format: 'YYYY-MM-DD HH:mm:ss'
    
    const visitedNodes = new Set([startNodeId]);
    const graphNodes = [];
    const graphEdges = [];
    
    let currentQueue = [startNodeId];
    
    console.log(`[BFS_START] Starting BFS traversal from node: ${startNodeId}`);

    for (let hop = 1; hop <= maxHops; hop++) {
        if (currentQueue.length === 0) break;
        
        console.log(`[BFS_HOP] Processing Hop ${hop} | Queue size: ${currentQueue.length}`);
        
        // 1. Audit queue degrees to filter out super-nodes (except the startNodeId itself)
        const degrees = await getNodeDegrees(catalystApp, currentQueue);
        const activeQueue = currentQueue.filter(nodeId => {
            if (nodeId === startNodeId) return true; // Never ignore search target
            const degree = degrees.get(nodeId) || 0;
            if (degree > 500) {
                console.log(`[BFS_SUPER_NODE_IGNORE] Ignoring super-node: ${nodeId} | Degree: ${degree}`);
                return false;
            }
            return true;
        });

        if (activeQueue.length === 0) break;

        // 2. Fetch edges originating from active queue
        const quotedQueue = activeQueue.map(id => `'${id}'`).join(',');
        let query = `SELECT edge_id, source_id, target_id, relationship_type, weight, created_at, dissolved_at FROM Edges WHERE source_id IN (${quotedQueue})`;
        
        if (dateFilter) {
            query += ` AND created_at >= '${dateFilter}'`;
        }

        let results = [];
        try {
            results = await catalystApp.zcql().executeQuery(query);
        } catch (err) {
            console.error(`[BFS_ERROR] ZCQL Query failed on hop ${hop}: ${err.message}`);
            // Fallback: Return what we have gathered so far instead of crashing
            break;
        }

        const nextQueue = [];
        for (const row of results) {
            const edge = row.Edges;
            graphEdges.push({
                id: edge.edge_id,
                source: edge.source_id,
                target: edge.target_id,
                type: edge.relationship_type,
                weight: parseFloat(edge.weight) || 1.0,
                created_at: edge.created_at,
                dissolved_at: edge.dissolved_at
            });

            const targetId = edge.target_id;
            if (!visitedNodes.has(targetId)) {
                visitedNodes.add(targetId);
                nextQueue.push(targetId);
            }
        }

        currentQueue = nextQueue;
    }

    // 3. Hydrate details for all visited nodes
    if (visitedNodes.size > 0) {
        const quotedNodes = Array.from(visitedNodes).map(id => `'${id}'`).join(',');
        try {
            const nodeDetails = await catalystApp.zcql().executeQuery(
                `SELECT node_id, name, label, created_at, dissolved_at FROM Nodes WHERE node_id IN (${quotedNodes})`
            );
            nodeDetails.forEach(row => {
                const node = row.Nodes;
                graphNodes.push({
                    id: node.node_id,
                    name: node.name,
                    label: node.label,
                    created_at: node.created_at,
                    dissolved_at: node.dissolved_at
                });
            });
        } catch (err) {
            console.error(`[BFS_HYDRATION_ERROR] Failed to fetch node details: ${err.message}`);
        }
    }

    console.log(`[BFS_COMPLETE] BFS finished. Found ${graphNodes.length} nodes and ${graphEdges.length} edges.`);
    return {
        nodes: graphNodes,
        edges: graphEdges
    };
}

module.exports = {
    getNodeDegrees,
    executeTemporalBFS
};
