'use strict';

const express = require('express');
const app = express();
const catalyst = require('zcatalyst-sdk-node');
const crypto = require('crypto');
const http = require('http');

// Import modular utilities
const { encrypt, decrypt } = require('./utils/crypto');
const { writeAuditLog } = require('./utils/audit');
const { executeTemporalBFS } = require('./utils/graph');
const SessionMemory = require('./utils/summarizer');
const { classifyIntentAndExtractFilters } = require('./utils/router');
const { ingestVoiceAudio, ingestDocumentPDF } = require('./utils/ingestion');
const { detectSchemaDrift } = require('./utils/drift');
const { performFairnessAudit } = require('./utils/fairness');

app.use(express.json());

// Helper to extract JWT user token from auth headers for dynamic encryption salting
function getUserSalt(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        const parts = authHeader.split(' ')[1].split('.');
        if (parts.length === 3) return parts[2];
    }
    return 'TEST_STATIC_USER_SALT_9988';
}

// Helper to make HTTP POST requests to AppSail
function postToAppSail(path, payload) {
    return new Promise((resolve, reject) => {
        const appSailUrl = process.env.APPSAIL_URL || 'http://localhost:8080';
        const url = new URL(path, appSailUrl);
        
        const postData = JSON.stringify(payload);
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, raw: body });
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// 1. Core query routing (NLP, Temporal BFS, PII Redaction, RAG Synthesis)
app.post('/query', async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    console.log(`[QUERY_START] Correlation ID: ${correlationId}`);
    
    try {
        const catalystApp = catalyst.initialize(req);
        const { query, startNodeId, sessionId } = req.body;
        const dynamicSalt = getUserSalt(req);
        
        if (!query) {
            return res.status(400).send({ error: 'Query parameter is required' });
        }
        if (!startNodeId) {
            return res.status(400).send({ error: 'startNodeId is required for graph search context' });
        }
        
        const sessionKey = sessionId || `session_${crypto.randomBytes(8).toString('hex')}`;
        const memory = new SessionMemory(catalystApp, sessionKey);

        // A. Run Router Agent (Pre-Filtering & Section Ontological Mapping)
        const analysis = classifyIntentAndExtractFilters(query);
        console.log(`[ROUTER_ANALYSIS] Intent: ${analysis.intent} | Filters: ${JSON.stringify(analysis.filters)}`);

        // B. Handle Disruption Simulation suspension (Async Hydration Gate)
        if (analysis.intent === 'SIMULATE_DISRUPTION') {
            const jobId = `job_${crypto.randomBytes(8).toString('hex')}`;
            console.log(`[SUSPEND] Intent: SIMULATE_DISRUPTION | Suspend & save state: ${jobId}`);

            const stateData = {
                query,
                startNodeId,
                sessionKey,
                filters: analysis.filters,
                correlationId
            };

            // Save suspension state to Circuit_States
            await catalystApp.datastore().table('Circuit_States').insertRow({
                job_id: jobId,
                state_data: JSON.stringify(stateData),
                pending_gate: 'DISCLAIMER',
                updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            });

            // Log suspension gate
            await writeAuditLog(catalystApp, {
                correlation_id: correlationId,
                job_id: jobId,
                action: 'CIRCUIT_SUSPENDED: DISCLAIMER_APPROVAL',
                input_hash: crypto.createHash('sha256').update(query).digest('hex')
            });

            return res.status(200).send({
                correlation_id: correlationId,
                job_id: jobId,
                status: 'AWAITING_APPROVAL',
                pending_gate: 'DISCLAIMER',
                message: 'Disruption simulation suspended. Awaiting supervisor disclaimer approval.'
            });
        }

        // C. Run BFS Graph Traversal with extracted pre-filters
        const bfsOptions = {
            dateFilter: analysis.filters.dateFilter,
            maxHops: 2
        };
        const graphResult = await executeTemporalBFS(catalystApp, startNodeId, bfsOptions);

        let filteredNodes = graphResult.nodes;
        if (analysis.filters.district) {
            filteredNodes = filteredNodes.filter(n => !n.district || n.district === analysis.filters.district);
        }

        // D. Apply PII Vault Redaction (Encrypt names using user salt)
        const redactedNodes = filteredNodes.map(node => {
            return {
                ...node,
                name: node.name ? encrypt(node.name, dynamicSalt) : node.name,
                redacted: true
            };
        });

        // E. Log action to AI_Execution_Logs
        const inputHash = crypto.createHash('sha256').update(query).digest('hex');
        await writeAuditLog(catalystApp, {
            correlation_id: correlationId,
            action: `QUERY_TRAVERSAL: ${query.substring(0, 50)} | Intent: ${analysis.intent}`,
            input_hash: inputHash,
            prompt_tokens: query.length,
            completion_tokens: JSON.stringify(redactedNodes).length
        });

        // F. Save turn to Cache and get updated history summary
        const assistantResponse = `Processed query. Found ${redactedNodes.length} related redacted node(s).`;
        const updatedHistory = await memory.addTurn(query, assistantResponse);

        res.status(200).send({
            correlation_id: correlationId,
            session_id: sessionKey,
            intent: analysis.intent,
            extracted_filters: analysis.filters,
            data: {
                nodes: redactedNodes,
                edges: graphResult.edges
            },
            history_summary: updatedHistory.summary,
            message: assistantResponse
        });
    } catch (err) {
        console.error(`[QUERY_ERROR] Correlation ID: ${correlationId} | Fail: ${err.message}`);
        res.status(500).send({
            correlation_id: correlationId,
            error_code: 'SERVER_QUERY_FAILURE',
            message: err.message
        });
    }
});

// 2. Ingest Voice Audio (STT Fallback Webhook pipeline)
app.post('/ingest-audio', async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    console.log(`[INGEST_AUDIO_START] Correlation ID: ${correlationId}`);

    try {
        const catalystApp = catalyst.initialize(req);
        
        let audioBuffer = req.body;
        if (!Buffer.isBuffer(audioBuffer)) {
            if (req.body.audio_base64) {
                audioBuffer = Buffer.from(req.body.audio_base64, 'base64');
            } else {
                audioBuffer = Buffer.from('DUMMY_KANNADA_AUDIO_RAW_DATA');
            }
        }

        const ingestionResult = await ingestVoiceAudio(catalystApp, audioBuffer, correlationId);
        
        res.status(200).send({
            correlation_id: correlationId,
            forensic_hash: ingestionResult.forensicHash,
            transcription: ingestionResult.transcription,
            fallback_active: ingestionResult.fallbackActive,
            message: 'Voice evidence successfully ingested and transcribed.'
        });
    } catch (err) {
        res.status(500).send({
            correlation_id: correlationId,
            error_code: 'AUDIO_INGESTION_FAILURE',
            message: err.message
        });
    }
});

// 3. Ingest Case Document (OCR Ingestion pipeline)
app.post('/ingest-pdf', async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    console.log(`[INGEST_PDF_START] Correlation ID: ${correlationId}`);

    try {
        const catalystApp = catalyst.initialize(req);
        
        let pdfBuffer = req.body;
        if (!Buffer.isBuffer(pdfBuffer)) {
            if (req.body.pdf_base64) {
                pdfBuffer = Buffer.from(req.body.pdf_base64, 'base64');
            } else {
                pdfBuffer = Buffer.from('DUMMY_SCANNED_FIR_PDF_DATA');
            }
        }

        const ingestionResult = await ingestDocumentPDF(catalystApp, pdfBuffer, correlationId);

        res.status(200).send({
            correlation_id: correlationId,
            forensic_hash: ingestionResult.forensicHash,
            extracted_text: ingestionResult.textContent,
            message: 'Document evidence successfully ingested and parsed.'
        });
    } catch (err) {
        res.status(500).send({
            correlation_id: correlationId,
            error_code: 'PDF_INGESTION_FAILURE',
            message: err.message
        });
    }
});

// 4. Job Status Check (polling endpoint for long-running workflows)
app.get('/status/:jobId', async (req, res) => {
    try {
        const catalystApp = catalyst.initialize(req);
        const { jobId } = req.params;

        let stateRecord = null;
        try {
            const queryResult = await catalystApp.zcql().executeQuery(
                `SELECT job_id, pending_gate FROM Circuit_States WHERE job_id = '${jobId}'`
            );
            if (queryResult && queryResult.length > 0) {
                stateRecord = queryResult[0].Circuit_States;
            }
        } catch (dbErr) {
            console.warn(`[STATUS_WARN] Failed to fetch state record for job ${jobId}: ${dbErr.message}`);
        }

        if (!stateRecord) {
            return res.status(200).send({
                jobId,
                status: 'NOT_FOUND',
                message: 'No active hydration job matches this identifier.'
            });
        }

        res.status(200).send({
            jobId,
            status: 'AWAITING_APPROVAL',
            pending_gate: stateRecord.pending_gate,
            message: `Execution suspended at gate: ${stateRecord.pending_gate}. Awaiting approval callback.`
        });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// 5. HITL Action Approval (Re-hydrates and resumes Catalyst Circuits)
app.post('/job/:jobId/approve', async (req, res) => {
    try {
        const catalystApp = catalyst.initialize(req);
        const { jobId } = req.params;
        const { approved } = req.body;
        const dynamicSalt = getUserSalt(req);

        // A. Retrieve the suspended state data
        const queryResult = await catalystApp.zcql().executeQuery(
            `SELECT job_id, state_data, pending_gate FROM Circuit_States WHERE job_id = '${jobId}'`
        );
        
        if (!queryResult || queryResult.length === 0) {
            return res.status(404).send({ error: 'Job not found or already completed.' });
        }

        const stateRecord = queryResult[0].Circuit_States;
        const stateData = JSON.parse(stateRecord.state_data);
        
        if (!approved) {
            // Remove state data if supervisor rejected
            await catalystApp.datastore().table('Circuit_States').deleteRow(jobId);
            return res.status(200).send({
                jobId,
                status: 'rejected',
                message: 'Supervisor rejected simulation disclaimer. Suspended job expunged.'
            });
        }

        console.log(`[CIRCUIT_RESUME] Re-hydrating job: ${jobId} | Gate: ${stateRecord.pending_gate}`);

        // B. Re-hydrate BFS graph traversal
        const bfsOptions = {
            dateFilter: stateData.filters.dateFilter,
            maxHops: 2
        };
        const graphResult = await executeTemporalBFS(catalystApp, stateData.startNodeId, bfsOptions);

        // C. Call AppSail Centrality Analyzer Python container
        let centralityScores = {};
        let fallbackActive = false;
        try {
            const appSailRes = await postToAppSail('/centrality', {
                nodes: graphResult.nodes,
                edges: graphResult.edges
            });
            
            if (appSailRes.statusCode === 200 && appSailRes.data.status === 'success') {
                centralityScores = appSailRes.data.centrality_scores;
            } else {
                throw new Error(appSailRes.data.message || 'AppSail service error.');
            }
        } catch (appSailErr) {
            console.warn(`[APPSAIL_FAIL] AppSail Centrality failed, falling back to basic degree count: ${appSailErr.message}`);
            fallbackActive = true;
            
            // Fallback calculation: Degree count
            graphResult.nodes.forEach(n => {
                const degree = graphResult.edges.filter(e => e.source === n.id || e.target === n.id).length;
                centralityScores[n.id] = degree;
            });
        }

        // D. Apply PII Vault Redaction on nodes and inject Centrality Scores
        const redactedNodes = graphResult.nodes.map(node => {
            return {
                ...node,
                name: node.name ? encrypt(node.name, dynamicSalt) : node.name,
                centrality: centralityScores[node.id] || 0.0,
                redacted: true
            };
        });

        // E. Log re-hydration success in AI_Execution_Logs
        await writeAuditLog(catalystApp, {
            correlation_id: stateData.correlationId,
            job_id: jobId,
            action: `CIRCUIT_RESUMED: Centrality Analysis | Fallback: ${fallbackActive}`,
            input_hash: crypto.createHash('sha256').update(stateData.query).digest('hex'),
            prompt_tokens: stateData.query.length,
            completion_tokens: JSON.stringify(redactedNodes).length
        });

        // F. Delete active state record once re-hydration is successful
        await catalystApp.datastore().table('Circuit_States').deleteRow(jobId);

        // G. Save turn to memory
        const memory = new SessionMemory(catalystApp, stateData.sessionKey);
        const assistantResponse = `Disruption simulation completed. Evaluated centrality for ${redactedNodes.length} nodes.`;
        const updatedHistory = await memory.addTurn(stateData.query, assistantResponse);

        res.status(200).send({
            correlation_id: stateData.correlationId,
            job_id: jobId,
            status: 'resumed',
            extracted_filters: stateData.filters,
            data: {
                nodes: redactedNodes,
                edges: graphResult.edges
            },
            history_summary: updatedHistory.summary,
            message: assistantResponse
        });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// 6. Schema Drift Detection (Weekly maintenance routine)
app.get('/audit/drift', async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    console.log(`[SCHEMA_DRIFT_START] Correlation ID: ${correlationId}`);
    try {
        const catalystApp = catalyst.initialize(req);
        const driftResult = await detectSchemaDrift(catalystApp);
        
        // Log audit action in AI_Execution_Logs
        await writeAuditLog(catalystApp, {
            correlation_id: correlationId,
            action: `SCHEMA_DRIFT_AUDIT | HasDrift: ${driftResult.hasDrift}`,
            input_hash: crypto.createHash('sha256').update(JSON.stringify(driftResult)).digest('hex')
        });

        res.status(200).send(driftResult);
    } catch (err) {
        console.error(`[SCHEMA_DRIFT_ERROR] Correlation ID: ${correlationId} | Fail: ${err.message}`);
        res.status(500).send({
            correlation_id: correlationId,
            error_code: 'SCHEMA_DRIFT_AUDIT_FAILURE',
            message: err.message
        });
    }
});

// 7. Demographic Parity & Calibration Audit (Monthly compliance checks)
app.post('/audit/fairness', async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    console.log(`[FAIRNESS_AUDIT_START] Correlation ID: ${correlationId}`);
    try {
        const catalystApp = catalyst.initialize(req);
        const fairnessResult = await performFairnessAudit(catalystApp);

        // Log audit action in AI_Execution_Logs
        await writeAuditLog(catalystApp, {
            correlation_id: correlationId,
            action: `FAIRNESS_AUDIT | Compliant: ${fairnessResult.fairness_metrics ? fairnessResult.fairness_metrics.is_compliant : 'N/A'}`,
            input_hash: crypto.createHash('sha256').update(JSON.stringify(fairnessResult)).digest('hex')
        });

        res.status(200).send(fairnessResult);
    } catch (err) {
        console.error(`[FAIRNESS_AUDIT_ERROR] Correlation ID: ${correlationId} | Fail: ${err.message}`);
        res.status(500).send({
            correlation_id: correlationId,
            error_code: 'FAIRNESS_AUDIT_FAILURE',
            message: err.message
        });
    }
});

module.exports = app;
