'use strict';

// Global variables for active session tracking
let currentSessionId = null;
let activeJobId = null;
const API_URL = ''; // Direct relative path maps to local emulated port during testing

// DOM Elements
const queryInput = document.getElementById('queryInput');
const sendBtn = document.getElementById('sendBtn');
const recordBtn = document.getElementById('recordBtn');
const micIcon = document.getElementById('micIcon');
const traceBanner = document.getElementById('traceBanner');
const correlationIdText = document.getElementById('correlationIdText');
const memorySummary = document.getElementById('memorySummary');

const pdfDropzone = document.getElementById('pdfDropzone');
const pdfFileInput = document.getElementById('pdfFileInput');
const pdfStatus = document.getElementById('pdfStatus');
const audioStatus = document.getElementById('audioStatus');

// Modal Elements
const approvalModal = document.getElementById('approvalModal');
const supervisorPin = document.getElementById('supervisorPin');
const approveBtn = document.getElementById('approveBtn');
const rejectBtn = document.getElementById('rejectBtn');

// 1. Tab Switching Controller
window.switchTab = function(tabName) {
    // Deactivate all links & contents
    document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(card => card.classList.remove('active'));
    
    // Activate clicked tab
    const activeLink = Array.from(document.querySelectorAll('.tab-link')).find(btn => btn.innerHTML.includes(tabName === 'graph' ? 'Temporal Graph' : tabName === 'timeline' ? 'Timeline Map' : 'Forensic Chain'));
    if (activeLink) activeLink.classList.add('active');
    
    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) activeContent.classList.add('active');
    
    // Set page title
    const titles = { graph: 'Temporal Intelligence Graph', timeline: 'Temporal Timeline Map', logs: 'Forensic Audit Logs' };
    document.getElementById('pageTitle').textContent = titles[tabName] || 'Dashboard';
};

// 2. Query Submission Flow
async function submitQuery(text) {
    if (!text || !text.trim()) return;

    // Show loading state
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    traceBanner.style.display = 'inline-block';
    correlationIdText.textContent = 'Tracing pipeline...';
    
    try {
        const response = await fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test_jwt_auth_token_signature_mysore_station_9988'
            },
            body: JSON.stringify({
                query: text,
                startNodeId: 'NODE_001', // Starting traversal seed
                sessionId: currentSessionId
            })
        });

        const result = await response.json();
        
        if (result.correlation_id) {
            correlationIdText.textContent = result.correlation_id;
        }

        if (response.status === 200) {
            currentSessionId = result.session_id;

            if (result.status === 'AWAITING_APPROVAL') {
                // Suspended gate: trigger disclaimer approval modal
                activeJobId = result.job_id;
                approvalModal.style.display = 'flex';
                supervisorPin.value = '';
                supervisorPin.focus();
            } else {
                // Success: Render results
                renderResults(result);
            }
        } else {
            alert(`Query Failed: ${result.message || 'Server error occurred'}`);
        }
    } catch (err) {
        console.error('Query dispatch error:', err);
        alert('Failed to connect to the server API.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
    }
}

// 3. Trigger Disclaimer Approval Gate Callback
async function handleApproval(approved) {
    if (!activeJobId) return;

    if (approved) {
        const pin = supervisorPin.value;
        if (pin !== '1234') {
            alert('Invalid Authorization Security PIN. Access Denied.');
            return;
        }
    }

    approvalModal.style.display = 'none';
    
    // Disable inputs
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_URL}/job/${activeJobId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test_jwt_auth_token_signature_mysore_station_9988'
            },
            body: JSON.stringify({ approved })
        });

        const result = await response.json();
        if (response.status === 200) {
            if (approved && result.status === 'resumed') {
                renderResults(result);
            } else {
                console.log('Suspended job cancelled by supervisor.');
            }
        } else {
            alert(`Resumption failed: ${result.message}`);
        }
    } catch (err) {
        console.error('Approval callback error:', err);
        alert('Network connection error during approval callback.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
        activeJobId = null;
    }
}

// 4. Voice Ingestion Simulation
let recordingTimer = null;
function startVoiceSimulation() {
    if (recordBtn.classList.contains('recording')) {
        // Cancel recording
        clearTimeout(recordingTimer);
        recordBtn.classList.remove('recording');
        micIcon.className = 'fa-solid fa-microphone';
        audioStatus.textContent = 'Recording cancelled.';
        return;
    }

    recordBtn.classList.add('recording');
    micIcon.className = 'fa-solid fa-microphone-slash';
    audioStatus.textContent = 'Listening to regional speech (Kannada)...';

    // Simulate 3 seconds of audio capture
    recordingTimer = setTimeout(async () => {
        recordBtn.classList.remove('recording');
        micIcon.className = 'fa-solid fa-microphone';
        audioStatus.textContent = 'Uploading voice evidence (SHA-256 generation)...';

        try {
            const response = await fetch(`${API_URL}/ingest-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_base64: 'U09VTkRfQklOQVJZX0RBVEFfTV9DTEFTU19GSUxFUw==' // Mock base64
                })
            });

            const result = await response.json();
            if (response.status === 200) {
                audioStatus.innerHTML = `√ Ingested. Hash: <span class="sig-text">${result.forensic_hash.substring(0, 8)}...</span>`;
                // Set transcription in query input
                queryInput.value = result.transcription;
                queryInput.focus();
                
                // Add to audit table
                addAuditRow(result.correlation_id, 'Ingest Audio (Bhashini fallback active)', result.forensic_hash);
            } else {
                audioStatus.textContent = 'Transcription failed.';
            }
        } catch (err) {
            audioStatus.textContent = 'Connection failure.';
        }
    }, 3000);
}

// 5. PDF Dropzone Simulation
pdfDropzone.addEventListener('click', () => pdfFileInput.click());
pdfFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    pdfStatus.textContent = `Uploading ${file.name}...`;

    try {
        const response = await fetch(`${API_URL}/ingest-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pdf_base64: 'UERGX0JJTkFSWV9QQVlMT0FEX0RBVEFPTA==' // Mock base64
            })
        });

        const result = await response.json();
        if (response.status === 200) {
            pdfStatus.innerHTML = `√ Ingested. Hash: <span class="sig-text">${result.forensic_hash.substring(0, 8)}...</span>`;
            queryInput.value = `Analyze suspect nodes found in report: ${result.extracted_text}`;
            queryInput.focus();
            
            addAuditRow(result.correlation_id, 'Ingest Scanned FIR PDF (Zia OCR)', result.forensic_hash);
        } else {
            pdfStatus.textContent = 'OCR processing failed.';
        }
    } catch (err) {
        pdfStatus.textContent = 'Upload failed.';
    }
});

// 6. UI Renderers
function renderResults(result) {
    // A. Update sliding window cache summary
    if (result.history_summary) {
        memorySummary.textContent = result.history_summary;
    }

    const { nodes, edges } = result.data;
    
    // B. Add audit log row
    addAuditRow(result.correlation_id, `Query processed (Nodes: ${nodes.length})`, result.correlation_id);

    // C. Render Temporal Graph (SVG force layout formula)
    renderNetworkGraph(nodes, edges);

    // D. Render Timeline Map
    renderTimeline(nodes);

    // Switch to graph tab automatically
    switchTab('graph');
}

function addAuditRow(correlationId, action, hash) {
    const tableBody = document.getElementById('auditLogBody');
    const newRow = document.createElement('tr');
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const mockSignature = crypto.subtle ? 'computed...' : Math.random().toString(36).substring(2, 10) + 'sha256sig';
    
    newRow.innerHTML = `
        <td>${timestamp}</td>
        <td>${action}</td>
        <td><span class="sig-text">${hash.substring(0, 12)}...</span></td>
        <td><span class="sig-text">${mockSignature}</span></td>
    `;
    
    // Prepend to top of logs
    tableBody.insertBefore(newRow, tableBody.firstChild);
}

// Render temporal network graph in SVG using circular layout coordinates
function renderNetworkGraph(nodes, edges) {
    const svg = document.getElementById('networkSvg');
    const linksGroup = document.getElementById('linksGroup');
    const nodesGroup = document.getElementById('nodesGroup');
    const emptyState = document.getElementById('graphEmptyState');

    // Clear previous graph
    linksGroup.innerHTML = '';
    nodesGroup.innerHTML = '';
    emptyState.style.display = 'none';

    if (!nodes || nodes.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const coords = {};

    // 1. Calculate Node Coordinates (Circular/Radial layout)
    nodes.forEach((node, i) => {
        let x, y;
        if (i === 0) {
            // Put start node in center
            x = centerX;
            y = centerY;
        } else {
            // Distribute other nodes circularly
            const angle = (2 * Math.PI * (i - 1)) / (nodes.length - 1);
            x = centerX + radius * Math.cos(angle);
            y = centerY + radius * Math.sin(angle);
        }
        coords[node.id] = { x, y };

        // Color nodes by label type
        let fill = 'hsl(239, 84%, 67%)'; // SUSPECT (indigo)
        if (node.label === 'TELECOM') fill = 'hsl(38, 92%, 50%)'; // Warning/Amber
        else if (node.label === 'LOCATION') fill = 'hsl(160, 84%, 39%)'; // Success/Emerald

        // Create node circle element
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', node.id === 'NODE_001' ? 16 : 12);
        circle.setAttribute('class', 'node-circle');
        circle.setAttribute('fill', fill);
        circle.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
        circle.setAttribute('title', `${node.label}: ${node.id}`);
        
        // Tooltip hover actions
        circle.addEventListener('mouseover', () => {
            circle.setAttribute('stroke', 'white');
            circle.setAttribute('stroke-width', '2px');
        });
        circle.addEventListener('mouseout', () => {
            circle.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
            circle.setAttribute('stroke-width', '1px');
        });

        nodesGroup.appendChild(circle);

        // Create node text label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + 26);
        text.setAttribute('class', 'node-label');
        text.setAttribute('text-anchor', 'middle');
        
        // Show Redacted key + Centrality score if available
        let labelStr = node.id;
        if (node.centrality !== undefined) {
            labelStr += ` (C: ${node.centrality})`;
        }
        text.textContent = labelStr;
        nodesGroup.appendChild(text);
    });

    // 2. Render Links/Edges
    edges.forEach(edge => {
        const source = coords[edge.source];
        const target = coords[edge.target];
        
        if (source && target) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', source.x);
            line.setAttribute('y1', source.y);
            line.setAttribute('x2', target.x);
            line.setAttribute('y2', target.y);
            line.setAttribute('class', 'link-line');
            line.setAttribute('stroke', 'rgba(255, 255, 255, 0.15)');
            
            linksGroup.appendChild(line);
        }
    });
}

// Render vertical roadmap timeline
function renderTimeline(nodes) {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';

    if (!nodes || nodes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <p>Submit a query to map association roadmaps.</p>
            </div>`;
        return;
    }

    // Sort nodes chronologically
    const sortedNodes = [...nodes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const track = document.createElement('div');
    track.className = 'timeline-track';
    container.appendChild(track);

    sortedNodes.forEach(node => {
        const item = document.createElement('div');
        item.className = 'timeline-item';

        let desc = 'Suspect profile node indexed and associated with investigation seed.';
        if (node.label === 'TELECOM') desc = 'Telecom tower node mapped via geographic/cell tower call records.';
        else if (node.label === 'LOCATION') desc = 'Geographic location coordinate mapped via FIR narrative details.';

        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <span class="timeline-time">${node.created_at}</span>
                <h4>Node: ${node.id} | Label: ${node.label}</h4>
                <p>${desc}</p>
                <span class="file-status">PII Ciphertext: ${node.name.substring(0, 24)}...</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// 7. Event Listeners
sendBtn.addEventListener('click', () => submitQuery(queryInput.value));
queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitQuery(queryInput.value);
});
recordBtn.addEventListener('click', startVoiceSimulation);

// Approval Actions
approveBtn.addEventListener('click', () => handleApproval(true));
rejectBtn.addEventListener('click', () => handleApproval(false));
