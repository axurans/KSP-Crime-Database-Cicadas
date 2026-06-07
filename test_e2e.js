'use strict';

const http = require('http');
const crypto = require('crypto');

// 1. Mock Database State
const mockDatabase = {
    Nodes: [
        { node_id: 'NODE_001', name: 'Ramesh Kumar', label: 'SUSPECT', created_at: '2024-01-01 10:00:00', dissolved_at: null },
        { node_id: 'NODE_002', name: 'Suresh Gowda', label: 'SUSPECT', created_at: '2024-01-02 11:00:00', dissolved_at: null },
        { node_id: 'NODE_003', name: 'Mysore Tower 04', label: 'TELECOM', created_at: '2024-01-03 12:00:00', dissolved_at: null }, // Super-node
        { node_id: 'NODE_004', name: 'Karthik Shekar', label: 'SUSPECT', created_at: '2024-01-04 13:00:00', dissolved_at: null },
        { node_id: 'NODE_005', name: 'Basavaraj Patil', label: 'SUSPECT', created_at: '2024-01-05 14:00:00', dissolved_at: null }
    ],
    Edges: [
        { edge_id: 'EDGE_001', source_id: 'NODE_001', target_id: 'NODE_002', relationship_type: 'CO_ACCUSED', weight: 0.95, created_at: '2024-01-01 10:00:00', dissolved_at: null },
        { edge_id: 'EDGE_002', source_id: 'NODE_002', target_id: 'NODE_004', relationship_type: 'CALL_RECORD', weight: 0.82, created_at: '2024-01-02 11:00:00', dissolved_at: null },
        { edge_id: 'EDGE_003', source_id: 'NODE_004', target_id: 'NODE_005', relationship_type: 'FINANCIAL_TX', weight: 0.77, created_at: '2024-01-04 13:00:00', dissolved_at: null }
    ],
    AI_Execution_Logs: [],
    Circuit_States: [
        { 
            job_id: 'JOB_999', 
            state_data: '{"query":"Simulate disruption of NODE_001","startNodeId":"NODE_001","sessionKey":"session_test_4","filters":{"district":null,"sections":[],"dateFilter":null},"correlationId":"corr_999"}', 
            pending_gate: 'DISCLAIMER', 
            updated_at: '2024-06-07 12:00:00' 
        }
    ],
    Cache: new Map()
};

// Generate 600 dummy connections for NODE_003 (the super-node) to verify super-node cutoff logic
for (let i = 1; i <= 600; i++) {
    mockDatabase.Edges.push({
        edge_id: `EDGE_SUPER_${i}`,
        source_id: 'NODE_003',
        target_id: `NODE_DUMMY_${i}`,
        relationship_type: 'CALL_RECORD',
        weight: 0.1,
        created_at: '2024-01-03 12:00:00',
        dissolved_at: null
    });
}

// 2. Override require cache to inject Mock Catalyst SDK
const mockCatalystSDK = {
    initialize: () => ({
        datastore: () => ({
            table: (tableName) => ({
                insertRow: async (row) => {
                    mockDatabase[tableName].push(row);
                    return row;
                },
                deleteRow: async (id) => {
                    if (tableName === 'Circuit_States') {
                        const index = mockDatabase.Circuit_States.findIndex(r => r.job_id === id);
                        if (index !== -1) mockDatabase.Circuit_States.splice(index, 1);
                    }
                    return true;
                }
            }),
            getAll: async () => {
                return [
                    {
                        table_name: 'Nodes',
                        column_details: [
                            { column_name: 'node_id', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'name', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'label', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'created_at', data_type: 'datetime', is_mandatory: true },
                            { column_name: 'dissolved_at', data_type: 'datetime', is_mandatory: false }
                        ]
                    },
                    {
                        table_name: 'Edges',
                        column_details: [
                            { column_name: 'edge_id', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'source_id', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'target_id', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'relationship_type', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'weight', data_type: 'double', is_mandatory: true },
                            { column_name: 'created_at', data_type: 'datetime', is_mandatory: true },
                            { column_name: 'dissolved_at', data_type: 'datetime', is_mandatory: false }
                        ]
                    },
                    {
                        table_name: 'FIRs',
                        column_details: [
                            { column_name: 'fir_id', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'case_id', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'district', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'police_station', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'date_filed', data_type: 'datetime', is_mandatory: true },
                            { column_name: 'narrative', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'sections', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'forensic_hash', data_type: 'varchar', is_mandatory: true }
                        ]
                    },
                    {
                        table_name: 'AI_Execution_Logs',
                        column_details: [
                            { column_name: 'log_id', data_type: 'bigint', is_mandatory: true },
                            { column_name: 'correlation_id', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'job_id', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'timestamp', data_type: 'datetime', is_mandatory: true },
                            { column_name: 'action', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'prompt_tokens', data_type: 'int', is_mandatory: true },
                            { column_name: 'completion_tokens', data_type: 'int', is_mandatory: true },
                            { column_name: 'input_hash', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'signature', data_type: 'varchar', is_mandatory: true }
                        ]
                    },
                    {
                        table_name: 'Circuit_States',
                        column_details: [
                            { column_name: 'job_id', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'state_data', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'pending_gate', data_type: 'varchar', is_mandatory: true },
                            { column_name: 'updated_at', data_type: 'datetime', is_mandatory: true }
                        ]
                    }
                ];
            }
        }),
        zcql: () => ({
            executeQuery: async (query) => {
                const q = query.toUpperCase();
                
                // Mock last signature fetch
                if (q.includes('SELECT SIGNATURE FROM AI_EXECUTION_LOGS')) {
                    const logs = mockDatabase.AI_Execution_Logs;
                    if (logs.length === 0) return [];
                    return [{ AI_Execution_Logs: logs[logs.length - 1] }];
                }
                
                // Mock Job status fetch
                if (q.includes('FROM CIRCUIT_STATES WHERE JOB_ID =')) {
                    const jobId = query.split("'")[1];
                    const state = mockDatabase.Circuit_States.find(r => r.job_id === jobId);
                    return state ? [{ Circuit_States: state }] : [];
                }

                // Mock Node degree audit count
                if (q.includes('COUNT(EDGE_ID) FROM EDGES WHERE SOURCE_ID IN')) {
                    const nodesStr = query.substring(query.indexOf('(') + 1, query.indexOf(')'));
                    const nodeIds = nodesStr.replace(/'/g, '').split(',').map(s => s.trim());
                    
                    return nodeIds.map(nodeId => {
                        const count = mockDatabase.Edges.filter(e => e.source_id === nodeId).length;
                        return {
                            Edges: { source_id: nodeId, edge_id: count.toString() }
                        };
                    });
                }
                
                // Mock Edge fetch query
                if (q.includes('FROM EDGES WHERE SOURCE_ID IN')) {
                    const nodesStr = query.substring(query.indexOf('(') + 1, query.indexOf(')'));
                    const nodeIds = nodesStr.replace(/'/g, '').split(',').map(s => s.trim());
                    
                    const edges = mockDatabase.Edges.filter(e => nodeIds.includes(e.source_id));
                    return edges.map(e => ({ Edges: e }));
                }
                
                // Mock Node detail hydration query
                if (q.includes('FROM NODES WHERE NODE_ID IN')) {
                    const nodesStr = query.substring(query.indexOf('(') + 1, query.indexOf(')'));
                    const nodeIds = nodesStr.replace(/'/g, '').split(',').map(s => s.trim());
                    
                    const nodes = mockDatabase.Nodes.filter(n => nodeIds.includes(n.node_id));
                    return nodes.map(n => ({ Nodes: n }));
                }

                return [];
            }
        }),
        cache: () => ({
            segment: (segmentName) => ({
                getValue: async (key) => {
                    return mockDatabase.Cache.get(`${segmentName}:${key}`) || null;
                },
                put: async (key, value) => {
                    mockDatabase.Cache.set(`${segmentName}:${key}`, value);
                    return true;
                }
            })
        })
    })
};

// Inject mock exports
const sdkPath = require.resolve('./functions/backend_logic/node_modules/zcatalyst-sdk-node');
require.cache[sdkPath] = {
    id: sdkPath,
    filename: sdkPath,
    loaded: true,
    exports: mockCatalystSDK
};
require.cache['zcatalyst-sdk-node'] = require.cache[sdkPath];

// 3. Start Express app locally
const app = require('./functions/backend_logic/index.js');
const server = app.listen(9099, () => {
    console.log('[TEST_SERVER] Express app listening on port 9099');
    runTests();
});

// Helper for HTTP requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, raw: body });
                }
            });
        });
        req.on('error', reject);
        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

// 4. Test Suite Execution
async function runTests() {
    console.log('\n==================================================');
    console.log('       STARTING E2E STRESS TEST SUITE (PHASE 4)   ');
    console.log('==================================================\n');

    let passed = true;

    try {
        // --- TEST 1: Temporal BFS Traversal & PII Redaction Verification ---
        console.log('[TEST 1] Verifying Temporal BFS Traversal & PII Redaction...');
        const res1 = await makeRequest({
            host: 'localhost',
            port: 9099,
            path: '/query',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer header.payload.MY_DYNAMIC_JWT_SALT_123'
            }
        }, {
            query: 'Find suspect Ramesh contacts',
            startNodeId: 'NODE_001',
            sessionId: 'session_test_1'
        });

        if (res1.statusCode === 200) {
            console.log('√ Query endpoint returned 200.');
            const nodes = res1.data.data.nodes;
            
            const nodeIds = nodes.map(n => n.id);
            if (nodeIds.includes('NODE_001') && nodeIds.includes('NODE_002') && nodeIds.includes('NODE_004')) {
                console.log('√ BFS successfully traversed 2-hop graph paths.');
            } else {
                console.error('X BFS failed to walk 2-hops. Found nodes:', nodeIds);
                passed = false;
            }

            const name001 = nodes.find(n => n.id === 'NODE_001').name;
            if (name001 && name001.includes(':')) {
                console.log('√ Suspect name column was correctly encrypted in output.');
                
                const { decrypt } = require('./functions/backend_logic/utils/crypto.js');
                const decryptedName = decrypt(name001, 'MY_DYNAMIC_JWT_SALT_123');
                if (decryptedName === 'Ramesh Kumar') {
                    console.log('√ Decryption verified name: "Ramesh Kumar" successfully.');
                } else {
                    console.error('X Decrypted name did not match original. Got:', decryptedName);
                    passed = false;
                }
            } else {
                console.error('X Name column was not encrypted. Got:', name001);
                passed = false;
            }
        } else {
            console.error('X Query endpoint failed with status:', res1.statusCode, res1.data);
            passed = false;
        }

        // --- TEST 2: Forensic Log Chain & Signature Verification ---
        console.log('\n[TEST 2] Verifying Forensic Log Signature Chaining...');
        const logs = mockDatabase.AI_Execution_Logs;
        if (logs.length > 0) {
            console.log(`√ Found ${logs.length} audit log entries.`);
            const latestLog = logs[logs.length - 1];
            if (latestLog.signature && latestLog.signature.length === 64) {
                console.log('√ Audit log contains a valid SHA-256 signature chain hash.');
            } else {
                console.error('X Log signature is empty or malformed.');
                passed = false;
            }
        } else {
            console.error('X No AI Execution Logs were recorded.');
            passed = false;
        }

        // --- TEST 3: Sliding Window Cache Memory Verification ---
        console.log('\n[TEST 3] Verifying Sliding Window Cache Summarizer...');
        const sessionKey = 'session_memory_test';
        
        for (let turn = 1; turn <= 5; turn++) {
            await makeRequest({
                host: 'localhost',
                port: 9099,
                path: '/query',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, {
                query: `Follow-up question turn ${turn}`,
                startNodeId: 'NODE_001',
                sessionId: sessionKey
            });
        }

        const cacheData = mockDatabase.Cache.get(`SessionMemory:${sessionKey}`);
        if (cacheData) {
            const memoryState = JSON.parse(cacheData);
            if (memoryState.turns.length === 2) {
                console.log('√ Sliding Window successfully collapsed old context (Last 2 turns retained).');
            } else {
                console.error('X Context failed to slide. Current turns count:', memoryState.turns.length);
                passed = false;
            }
        } else {
            console.error('X Session cache was not found.');
            passed = false;
        }

        // --- TEST 4: Job Status & Approval Gate Hydration ---
        console.log('\n[TEST 4] Verifying HITL Approval Gate and Re-hydration...');
        
        const statusRes = await makeRequest({
            host: 'localhost',
            port: 9099,
            path: '/status/JOB_999',
            method: 'GET'
        });

        if (statusRes.statusCode === 200 && statusRes.data.status === 'AWAITING_APPROVAL') {
            console.log('√ Job status correctly reported "AWAITING_APPROVAL" for suspended Circuit.');
        } else {
            console.error('X Failed to fetch suspended job status.', statusRes.data);
            passed = false;
        }

        const approveRes = await makeRequest({
            host: 'localhost',
            port: 9099,
            path: '/job/JOB_999/approve',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            approved: true
        });

        if (approveRes.statusCode === 200 && approveRes.data.status === 'resumed') {
            console.log('√ Suspended job approved and successfully re-hydrated.');
        } else {
            console.error('X Approval endpoint failed.', approveRes.data);
            passed = false;
        }

        // --- TEST 5: Voice Evidence Ingestion & Bhashini STT Fallback ---
        console.log('\n[TEST 5] Verifying Voice Evidence Ingestion & Bhashini STT Fallback...');
        const resAudio = await makeRequest({
            host: 'localhost',
            port: 9099,
            path: '/ingest-audio',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            audio_base64: Buffer.from('RAW_SPEECH_DATA_BYTES').toString('base64')
        });

        if (resAudio.statusCode === 200) {
            console.log('√ Voice Ingestion endpoint returned 200.');
            if (resAudio.data.forensic_hash && resAudio.data.forensic_hash.length === 64) {
                console.log('√ Forensic SHA-256 hash successfully computed: ' + resAudio.data.forensic_hash);
            } else {
                console.error('X Forensic hash was missing or invalid.', resAudio.data);
                passed = false;
            }
            if (resAudio.data.fallback_active === true) {
                console.log('√ Zia STT failure simulated; Bhashini STT fallback was triggered.');
            } else {
                console.error('X STT fallback was not triggered.', resAudio.data);
                passed = false;
            }
            if (resAudio.data.transcription && resAudio.data.transcription.includes('ಕಳ್ಳತನ')) {
                console.log('√ Transcription mapped correctly: "' + resAudio.data.transcription + '"');
            } else {
                console.error('X Transcription text did not match mock expectations.', resAudio.data);
                passed = false;
            }
        } else {
            console.error('X Voice Ingestion failed with status:', resAudio.statusCode, resAudio.data);
            passed = false;
        }

        // --- TEST 6: Scanned Document Ingestion & OCR ---
        console.log('\n[TEST 6] Verifying Scanned Document Ingestion & OCR...');
        const resPDF = await makeRequest({
            host: 'localhost',
            port: 9099,
            path: '/ingest-pdf',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            pdf_base64: Buffer.from('RAW_PDF_DATA_BYTES').toString('base64')
        });

        if (resPDF.statusCode === 200) {
            console.log('√ Document Ingestion endpoint returned 200.');
            if (resPDF.data.forensic_hash) {
                console.log('√ Forensic hash logged: ' + resPDF.data.forensic_hash);
            }
            if (resPDF.data.extracted_text && resPDF.data.extracted_text.includes('IPC 379')) {
                console.log('√ Scanned text extracted correctly: "' + resPDF.data.extracted_text + '"');
            } else {
                console.error('X OCR text did not match mock expectations.', resPDF.data);
                passed = false;
            }
        } else {
            console.error('X Document Ingestion failed with status:', resPDF.statusCode, resPDF.data);
            passed = false;
        }

        // --- TEST 7: Router Agent Intent & IPC-to-BNS Ontological Translation ---
        console.log('\n[TEST 7] Verifying Router Agent Intent & IPC-to-BNS Legal Ontology...');
        const resQueryFilters = await makeRequest({
            host: 'localhost',
            port: 9099,
            path: '/query',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            query: 'Find suspect Ramesh who committed theft under IPC section 379 in Mysore in 2024',
            startNodeId: 'NODE_001',
            sessionId: 'session_filters_test'
        });

        if (resQueryFilters.statusCode === 200) {
            const filters = resQueryFilters.data.extracted_filters;
            console.log('√ Router successfully analyzed natural query.');
            if (filters.district === 'Mysore') console.log('   √ District Mysore extracted.');
            else { console.error('   X District extract failed:', filters.district); passed = false; }

            if (filters.dateFilter === '2024-01-01 00:00:00') console.log('   √ Temporal year 2024 bound.');
            else { console.error('   X Year extract failed:', filters.dateFilter); passed = false; }

            // IPC-to-BNS ontological translation check
            if (filters.sections.includes('IPC 379') && filters.sections.includes('BNS 303')) {
                console.log('   √ Legal ontology translation verified: IPC 379 mapped to BNS 303.');
            } else {
                console.error('   X Legal ontology mapping failed:', filters.sections);
                passed = false;
            }
        } else {
            console.error('X Query filtering endpoint failed with status:', resQueryFilters.statusCode);
            passed = false;
        }

        // --- TEST 8: 100 Concurrent Request Stress Test (Across All Endpoints) ---
        console.log('\n[TEST 8] Launching Concurrent Stress Test (100 Requests across all 3 Phase pipelines)...');
        const startTimestamp = Date.now();
        const promises = [];
        
        for (let i = 0; i < 100; i++) {
            const mode = i % 3;
            if (mode === 0) {
                // Post Query
                promises.push(makeRequest({
                    host: 'localhost',
                    port: 9099,
                    path: '/query',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, {
                    query: `Stress query loop ${i} with IPC 420 (cheating)`,
                    startNodeId: 'NODE_001',
                    sessionId: `stress_session_${i}`
                }));
            } else if (mode === 1) {
                // Ingest Audio
                promises.push(makeRequest({
                    host: 'localhost',
                    port: 9099,
                    path: '/ingest-audio',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, {
                    audio_base64: Buffer.from(`RAW_STRESS_AUDIO_${i}`).toString('base64')
                }));
            } else {
                // Ingest PDF
                promises.push(makeRequest({
                    host: 'localhost',
                    port: 9099,
                    path: '/ingest-pdf',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, {
                    pdf_base64: Buffer.from(`RAW_STRESS_PDF_${i}`).toString('base64')
                }));
            }
        }

        const stressResults = await Promise.all(promises);
        const duration = Date.now() - startTimestamp;

        const successCount = stressResults.filter(r => r.statusCode === 200).length;
        const averageLatency = duration / 100;

        console.log('\nSTRESS TEST METRICS (ALL 3 PHASES CONCURRENT):');
        console.log(`- Total Requests Sent: 100`);
        console.log(`- Successful Responses (200 OK): ${successCount}`);
        console.log(`- Total Duration: ${duration} ms`);
        console.log(`- Average Request Latency: ${averageLatency.toFixed(2)} ms`);
        console.log(`- Throughput: ${(1000 / averageLatency).toFixed(2)} requests/sec`);

        if (successCount === 100) {
            console.log('√ E2E Stress test completed with 100% success rate across all pipelines.');
        } else {
            console.error('X Stress test failed. Success count:', successCount);
            passed = false;
        }

        // --- TEST 9: Schema Drift Detection ---
        console.log('\n[TEST 9] Verifying Schema Drift Detection Audit...');
        const resDrift = await makeRequest({
            host: 'localhost',
            port: 9099,
            path: '/audit/drift',
            method: 'GET'
        });

        if (resDrift.statusCode === 200) {
            console.log('√ Schema Drift endpoint returned 200.');
            if (resDrift.data.hasDrift === false) {
                console.log('   √ Schema matches the blueprint perfectly (no drift detected).');
            } else {
                console.error('   X Drift detected (details):', resDrift.data.driftDetails);
                passed = false;
            }
        } else {
            console.error('X Schema Drift endpoint failed with status:', resDrift.statusCode);
            passed = false;
        }

        // --- TEST 10: Demographic Parity & Calibration Audit ---
        console.log('\n[TEST 10] Verifying Demographic Parity & Calibration Audit...');
        const resFairness = await makeRequest({
            host: 'localhost',
            port: 9099,
            path: '/audit/fairness',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (resFairness.statusCode === 200) {
            console.log('√ Demographic Parity endpoint returned 200.');
            const metrics = resFairness.data.fairness_metrics;
            if (metrics) {
                console.log(`   √ Compliant: ${metrics.is_compliant}`);
                console.log(`   √ Disparate Impact Ratio: ${metrics.disparate_impact_ratio}`);
                console.log(`   √ Counterfactual Consistency: ${metrics.counterfactual_consistency}`);
                if (metrics.is_compliant && metrics.counterfactual_consistency === 1) {
                    console.log('   √ Bias auditing metrics are within legal compliance bounds.');
                } else {
                    console.error('   X Bias metrics are out of bounds or consistency failed.', metrics);
                    passed = false;
                }
            } else {
                console.error('   X Fairness metrics missing in response.', resFairness.data);
                passed = false;
            }
        } else {
            console.error('X Demographic Parity endpoint failed with status:', resFairness.statusCode);
            passed = false;
        }

    } catch (err) {
        console.error('X Critical exception occurred during test execution:', err.stack);
        passed = false;
    } finally {
        server.close(() => {
            console.log('\n[TEST_SERVER] Local Express app stopped.');
            console.log('\n==================================================');
            if (passed) {
                console.log('     ALL E2E CHECKS PASSED SUCCESSFULLY!          ');
            } else {
                console.log('     E2E TEST SUITE ENCOUNTERED FAILURES.         ');
            }
            console.log('==================================================\n');
            process.exit(passed ? 0 : 1);
        });
    }
}
