# **Enhanced Master System Architecture & Technical Strategy v6.0 (Final)**

**Project:** Intelligent Conversational AI for KSP Crime Database **Strategy:** 100% Catalyst-Native · Multi-Agent · Graph-Relational · Multi-Modal · Context-as-Code **Scale Target:** Enterprise — State-wide Deployment, 10,000+ Concurrent Personnel **Compliance:** DPDP Act 2023 · Zero-Trust Security · ISO 27001 Alignment · Forensics Standard

## **1\. Executive Summary & Strategic Vision**

This v6.0 architecture represents the definitive, production-ready blueprint for a state-wide law enforcement intelligence platform. It resolves critical scale, forensic, and asynchronous orchestration bottlenecks while remaining strictly constrained to Catalyst-native services.  
**The Five Innovation Pillars:**

| Pillar | What It Solves | Industry Parallel |
| :---- | :---- | :---- |
| **Temporal Intelligence Graph** | Track how criminal networks *evolve over time* | EUROPOL's iOCTA temporal link analysis |
| **Multi-Modal Evidence Fusion** | Unify text, voice, images & handwritten FIRs | FBI's Sentinel document intelligence |
| **Network Disruption Simulator** | Simulate: *who do we arrest first?* | DEA's HIDTA social network analysis |
| **Behavioral Fingerprinting Engine** | Match unknown suspects to known MO profiles | Scotland Yard's ViCLAS system |
| **Differential Privacy Analytics** | Prevent re-identification from aggregate data | Apple's iOS privacy model, US Census |

**Alignment Verification Checklist:**

* \[x\] **Complete Catalyst Service Map:** Section 2 — all 26 services assigned  
* \[x\] **Cross-Functional Swimlane:** Section 5 — enhanced with Async Hydration and Forensics  
* \[x\] **ADR Trade-off Matrix:** Section 3 — expanded with realistic SLA limits and Semantic Caching  
* \[x\] **DPDP Compliance (4 Pillars):** Section 6 — Cryptographic erasure, session-bound unmasking  
* \[x\] **Admin Glass-Box \+ CoT:** Section 7 — Config override matrix \+ SRE Fallback Mode  
* \[x\] **Context-as-Code (MCP Alignment):** Section 8B — .agent\_context.md files integrated at runtime  
* \[x\] **Auto-Maintenance SDLC:** Section 10 — Synthetic-only staging, nightly/weekly/monthly crons  
* \[x\] **Universal HITL (5 Gates):** Section 7C — Circuits pause points via event-driven resume  
* \[x\] **AI Telemetry & Tracing:** Section 9 — Distributed tracing, token burn-down, circuit breakers  
* \[x\] **Scalability (All Levels):** Section 11 — Sharding, semantic caching, super-node cutoff, dynamic queue  
* \[x\] **Anti-Hallucination Engine (7 Layers):** Section 17 — Citation anchoring, NLI entailment, self-consistency  
* \[x\] **Anti-Bias Framework (6 Pillars):** Section 18 — Fairness metrics, counterfactual fairness, bias circuit breaker  
* \[x\] **Accuracy & Repeatability Engine:** Section 19 — Ensemble prediction, probability calibration

## **2\. Complete Catalyst Service Architecture Map**

| \# | Capability | Catalyst Service | Usage in KSP System |
| :---- | :---- | :---- | :---- |
| 1 | Backend logic | **Catalyst Serverless** | BFS traversal, PII vault, NER redaction, differential privacy, Inference Queueing |
| 2 | Docker containers | **Catalyst AppSail (OCI)** | Containerized specialist agents: Network Analyzer, Behavioral Fingerprinter, Disruption Simulator |
| 3 | Managed runtime | **Catalyst AppSail (managed)** | Admin Glass-Box dashboard, ML inference REST API |
| 4 | Frontend SPA | **Catalyst Slate** | Investigator React UI (D3 graph, timelines, voice input), Admin HITL Control Panel |
| 5 | Domain \+ SSL | **Catalyst Domain Mappings** | ksp-intel.karnataka.gov.in (prod) |
| 6 | Relational DB | **Catalyst Data Store** | Nodes, Edges, FIRs, Cases, Audit Logs, System Configs, Circuit States |
| 7 | Semi-structured | **Catalyst NoSQL** | Unstructured FIR attachments, evidence metadata, conversation history |
| 8 | Blob storage | **Catalyst Stratus** | CCTV frames, archived PDFs, **Raw Voice Audio & PDF Document evidence hashes** |
| 9 | Cache | **Catalyst Cache (Redis)** | PII vault (Session-bound TTL), BFS results (4hr TTL), LLM Query Queue, Semantic Cache |
| 10 | Full-text search | **Catalyst Data Store** | FIR narrative search, cross-case text similarity |
| 11 | LLM/RAG | **Catalyst QuickML** | Multi-agent LLM serving, vector knowledge base, RAG pipeline |
| 12 | No-code ML pipelines | **Catalyst QuickML** | Crime clustering pipeline, hotspot geographic segmentation |
| 13 | AutoML tabular | **Catalyst Zia AutoML** | Offender risk scoring, recidivism prediction |
| 14 | OCR / Vision / Face | **Catalyst Zia Services** | Handwritten FIR digitization (OCR), suspect sketch-to-photo matching |
| 15 | Voice (STT/TTS) | **Catalyst Zia Services** | Kannada \+ English speech-to-text, text-to-speech response |
| 16 | PDF generation | **Catalyst SmartBrowz** | Watermarked case report PDFs |
| 17 | User auth | **Catalyst Authentication** | Role-based JWT, biometric 2FA, session management |
| 18 | API routing | **Catalyst API Gateway** | Rate limiting, JWT validation, threat pattern detection |
| 19 | OAuth for 3rd-party | **Catalyst Connections** | State Financial Intelligence Unit API integration |
| 20 | Scheduled jobs | **Catalyst Cron** | Nightly data hygiene, weekly regression suite, monthly bias audits |
| 21 | Event reactions | **Catalyst Signals** | FIR insert triggers re-embedding, expungement cascades, semantic cache invalidations |
| 22 | Cross-app event bus | **Catalyst Signals** | Async telemetry fire-and-forget, alert propagation |
| 23 | Orchestration | **Catalyst Circuits** | Multi-agent workflow state machine with **Async Hydration** for HITL gates |
| 24 | Transactional email | **Catalyst Mail** | SDLC approval gates, anomaly alerts, model swap confirmations |
| 25 | Push notifications | **Catalyst Push Notifications** | Real-time gang activity alerts (mobile) |
| 26 | CI/CD | **Catalyst Pipelines** | Automated test → staging → production deploy with auto-rollback |

## **3\. Architecture Decision Records (ADR): Expanded Trade-off Matrix**

Every decision is calculated to satisfy both Datathon rules and state-wide scale requirements.

| System Component | Selected Catalyst Tool | Industry Ideal | Justification & Trade-off |
| :---- | :---- | :---- | :---- |
| **Graph Storage** | Data Store + L3 Path Cache | Neo4j / TigerGraph | Third-party violates rules. Relational is slower for multi-hop. Mitigated via Redis BFS caching (4hr TTL) and Cron-driven async path materialization to L3 cache. |
| **Graph Traversal** | Serverless iterative BFS | SQL Recursive CTEs | ZCQL blocks WITH RECURSIVE. App-layer BFS limits fan-out via a hard 2-hop cap and \>500 degree-centrality cutoff (Super-Node ignore). |
| **Agent Constraints** | Context-as-Code .md files | MCP via API servers | Native Catalyst containers pull local .md metadata directly from their deployment directory. Loaded into RAM at boot to eliminate I/O latency. |
| **Voice Interface** | Zia STT (Bhashini Fallback) \+ Stratus Hash | Custom E2E Audio Model | **Trade-off:** High latency (\~6-8s). If regional Zia STT accuracy drops below 85%, fallback to Bhashini API. Raw audio saved to Stratus and hashed before STT processing. |
| **Vector Pre-Filter** | Serverless Strict Metadata | Pure Semantic Search | Searching millions of vectors is too slow. Router Agent *must* extract Date/Category filters to reduce search space to \<10k rows before Vector Search. |
| **HITL Orchestration** | Async Hydration Pattern | Long-running processes | Catalyst Circuits time out if paused too long for human approval. The circuit terminates, saves state to DB, and re-hydrates upon API approval. |
| **Session Memory** | Sliding Window Summarizer | Infinite Context Windows | Prevents token exhaustion. After 4 conversational turns, Serverless triggers QuickML to summarize context, discarding raw dialogue tokens. |

## **4\. The Five Innovation Layers (Detailed)**

### **4A. Temporal Intelligence Graph (TIG)**

Every Node and Edge record includes created\_at and dissolved\_at timestamps. **Super-Node Bottleneck Fix:** During live BFS traversal, any node with \>500 edges is classified as a "Public Infrastructure/Super-Node" (e.g., a bank, telecom tower) and is ignored during BFS expansion unless it is the explicit search target. Only raw heavy unstructured payloads are archived; topology graphs are permanently maintained in-memory/in DB.

### **4B. Multi-Modal Evidence Fusion Pipeline & Forensics**

To guarantee complete admissibility in legal proceedings, the platform enforces a **Unified Forensic Ingestion Protocol (UFIP)**:

1. **Voice Ingestion:** Raw audio files are saved directly to Catalyst Stratus, a SHA-256 cryptographic hash is generated, and this hash is immediately committed to the AI\_Execution\_Logs table *prior* to Zia STT processing.  
2. **Document Ingestion:** Scanned FIR PDFs are hashed (SHA-256) at the API Gateway and saved to Stratus. Zia OCR then parses the text, mapping the outputs directly to the original file hash in the Data Store logs, preventing unverified hearsay challenges.  
3. **Image Ingestion:** Suspect sketch uploads pass to Zia Face Detection, returning cosine similarity scores against known offenders (Requires HITL approval).

### **4C. Network Disruption Simulator (NDS)**

Investigator selects target node for hypothetical removal. AppSail Network Analyzer re-computes Eigenvector Centrality. **HITL Gate mandatory:** Circuit suspends execution via Async Hydration. Supervisor must accept a legal disclaimer via the UI before results render.

### **4D. Behavioral Fingerprinting Engine (BFE)**

Generates an MO vector based on behavioral features. Demographic features (caste, religion, economic class) are **explicitly excluded** to prevent proxy-variable bias.

### **4E. Differential Privacy for Sociological Analytics**

Laplace Mechanism applied to aggregate queries via Serverless. Queries returning fewer than 10 records are outright rejected before noise is calculated.

## **5\. Enhanced Cross-Functional Swimlane Sequence**

`sequenceDiagram`  
    `autonumber`

    `box rgba(0, 150, 255, 0.05) "Client Tier"`  
        `actor Inv as Investigator`  
        `participant UI as Slate`  
    `end`

    `box rgba(0, 255, 100, 0.05) "Compute & Orchestration"`  
        `participant API as API Gateway`  
        `participant Circuit as Circuits`  
        `participant Func as Serverless (Node.js)`  
        `participant AppSail as AppSail (Agents)`  
    `end`

    `box rgba(255, 150, 0, 0.05) "AI & Vision"`  
        `participant ML as QuickML`  
        `participant Zia as Zia Services`  
    `end`

    `box rgba(255, 0, 255, 0.05) "Data & Audit"`  
        `participant DB as Data Store`  
        `participant Stratus as Stratus`  
    `end`

    `%% === VOICE CHAIN OF CUSTODY ===`  
    `Inv->>UI: Speaks query in Kannada`  
    `UI->>Func: Upload Audio Chunk`  
    `Func->>Stratus: Save raw audio`  
    `Func->>DB: Log SHA-256 Hash (Chain of Custody)`  
    `Func->>Zia: Audio stream → Zia STT`  
    `Zia-->>UI: Transcribed text`  
    `UI->>API: POST /query`  
    `API->>Circuit: Begin Orchestration`

    `%% === INTENT & STRICT FILTERING ===`  
    `Circuit->>ML: Router Agent`  
    `ML-->>Circuit: Intent + { district, year >= 2023 } (Strict Metadata Filter)`

    `%% === BFS TRAVERSAL ===`  
    `Circuit->>Func: Execute Temporal BFS`  
    `loop ZCQL Cursor Pagination`  
        `Func->>DB: SELECT edges WHERE hop=N`  
    `end`

    `%% === PII REDACTION VAULT ===`  
    `Circuit->>Func: NER scan → PII swap { SUS_1: "Ramesh" }`  
    `Func-->>Circuit: Redacted context`

    `%% === MULTI-AGENT REFLEXION LOOP ===`  
    `rect rgb(40, 55, 40)`  
        `` Circuit->>AppSail: Load RAM `.agent_context.md` ``  
        `Circuit->>ML: Synthesizer Agent → Draft V1`  
        `Circuit->>ML: Reviewer Agent → Verify vs JSON`  
    `end`  
      
    `%% === ASYNC HITL HYDRATION PATTERN ===`  
    `Circuit->>AppSail: Network Disruption Simulator`  
    `AppSail-->>Circuit: Draft Scores`  
    `Circuit->>DB: Save State {job_id, pending_gate: DISCLAIMER}`  
    `Circuit->>Circuit: TERMINATE CIRCUIT (Avoids Timeout)`  
    `UI->>API: GET /status`  
    `API-->>UI: STATUS: AWAITING_DISCLAIMER`  
    `Inv->>UI: Accepts Disclaimer`  
    `UI->>API: POST /job/{id}/approve`  
    `API->>Circuit: NEW CIRCUIT: Re-hydrate State from DB`  
    `Circuit->>Circuit: RESUME JOB`

    `%% === OUTPUT ===`  
    `Circuit-->>DB: Store verified result`  
    `UI->>API: GET /status (polling)`  
    `UI-->>Inv: Render Data & Play TTS Audio`

## **6\. Security Architecture: Enhanced DPDP Framework**

### **6A. Zero-Trust Data Mesh**

* **QoS Emergency Throttling Override:** Queries tagged with priority=EMERGENCY in their ABAC JWT bypass standard API Gateway 10k/min throttling queues.

### **6B. DPDP Compliance: Programmatic Envelope Encryption & Session-Bound UX**

1. **Right to Be Forgotten via Programmatic Envelope Encryption:** Zoho Catalyst lacks a native standalone KMS. PII in the Data Store is encrypted at the column level via AES-256 inside Catalyst Serverless. Decryption relies on a Master Key secured within **Catalyst Developer Space Secrets (Environment Variables)** combined with unique salt keys derived dynamically from authenticated user JWTs. Expungement permanently destroys the specific salt key. If an older database backup is restored, the expunged data remains permanently shredded cipher-text.  
2. **Session-Bound PII Vault:** The Catalyst Cache PII unmasking map is tied directly to the active **JWT Auth Session token length** in Redis. If the officer's session expires or the device locks, the keys are instantly deleted from Redis, defaulting the UI back to safely redacted profiles.

## **7\. Admin Orchestration & Glass-Box**

### **7A. Immutable Audit Log Schema**

To ensure legal admissibility, the AI\_Execution\_Logs table uses **Cryptographic Hash Chaining**. Each log entry hashes the previous entry's signature. Daily logs are exported to Stratus as WORM (Write-Once-Read-Many) blobs.

### **7B. Glass-Box Config Engine**

| Config Parameter | Default | Business Impact |
| :---- | :---- | :---- |
| FALLBACK\_BASIC\_MODE | false | **SRE Toggle:** Bypasses all AppSail agents; executes basic textual RAG to guarantee uptime during container outages. |

### **7C. HITL Decision Gates (Async Hydration Pattern)**

To prevent serverless timeouts, all gates utilize the Async Hydration pattern (terminate and save state, rehydrate on approval):

1. **Network Disruption Simulation:** Legal disclaimer acceptance.  
2. **AutoML Retraining:** IT Admin reviews accuracy delta.  
3. **Bulk Expungement:** Dual-signature Admin confirmation.  
4. **Cross-District Share:** Originating Supervisor approves.  
5. **Privacy Budget Extension:** Supervisor explicit approval.

## **8\. Specialist Agent Architecture & Context-as-Code**

**Context-as-Code (MCP Alignment):** To guarantee consistency without burning I/O latency, contextual .md files are embedded into execution environments and **loaded into RAM at boot**.  
**1\. Database Schema Context (.db\_schema.md)** Stored in Catalyst Serverless. The Router Agent reads this to understand ZCQL boundaries.

* *Includes Legal Ontology:* Maps legacy IPC (Indian Penal Code) sections to modern BNS (Bharatiya Nyaya Sanhita) sections automatically. For example, queries searching for "theft" or "IPC 378" are dynamically translated to "BNS 303" to ensure unified semantic search across older and newer FIRs.

**2\. Agentic Context Files (.agent\_context.md)** Injected into AppSail Docker containers.

* *Example payload:* "Role: Compute Eigenvector Centrality. Constraint: Never output names. Only output node\_id and delta\_score."

**3\. Vector Pre-Filtering & Query Execution Path:**
* The Router Agent extracts metadata filters (e.g., date ranges, district codes, crime categories) from the prompt.
* A ZCQL query fetches matching `node_ids` (capped at $<10,000$ rows) to restrict the search space.
* The pre-filtered list of IDs is passed as an direct scope array to the QuickML Vector Search pipeline, ensuring semantic distance calculations are only performed on relevant records, avoiding scanning millions of global nodes.

## **9\. AI Telemetry, Tracing & Observability**

* UUIDv4 Correlation ID generated at API Gateway.  
* Token burn-down tracked per correlation ID.

## **10\. Auto-Maintenance SDLC**

**Security Rule:** The staging environment strictly utilizes a synthetically generated dummy database. Production data is *not* cloned to lower environments.

### **Dynamic Schema Drift Detector**

To prevent system breakage when database structures change, a Catalyst Serverless function runs on a weekly Cron. It queries Catalyst’s native database schema metadata APIs, compares the live table layouts against the repository's .db\_schema.md files, and generates a drift report. If discrepancies are found, it triggers a Catalyst Mail alert to the SRE team and suspends automated production pipelines.

### **Scheduled Jobs (Catalyst Cron)**

* **Nightly:** Duplicate node detection, DPDP audit sweeps.  
* **Weekly:** 200 curated golden query Regression Test Suite (100% pass required for CI/CD).  
* **Monthly:** Algorithmic Fairness Audit (Bias Circuit Breaker fires if deviation \>0.10).

## **11\. Scalability Architecture**

### **Dynamic Inference Queue (Anti-DDoS Mechanism)**

At scale, 10,000 users will overwhelm QuickML's concurrent API limits, causing cascading 500 errors. **Solution:** Serverless implements a **Dynamic Inference Queue** using Redis. If QuickML returns 429 Too Many Requests, the query enters a FIFO queue. The UI gracefully downgrades, showing "AI Processing (High Load) \- Estimated wait: X seconds" instead of crashing.

### **Horizontal Scaling & Cold Storage Split**

* **Cold Storage Split:** FIRs \>5 years old have their raw text archived to Stratus Blob Storage, but their **Vector Embeddings remain hot** in QuickML. Allows semantic matching on cold cases without high relational DB costs.

### **Three-Level Caching Hierarchy**

1. **L1 — Catalyst Cache (Redis):** BFS results, PII maps.  
2. **L2 — Semantic LLM Cache:** Resolves the cost penalty of 3x self-consistency checks. Uses a Cosine Similarity Threshold (\>0.95). If identical semantic questions hit the gateway, it serves the cached 3x-verified response instantly. **Dynamic Invalidation:** Under active investigations, writing a new FIR or Edge triggers a Catalyst Signals pipeline that clears any related L1/L2 cache blocks within 1.5 seconds.  
3. **L3 — Data Store Materialized Views & Path Cache:** Pre-computed sociological stats and async materialized multi-hop relationship paths updated via Cron.

## **12\. Expert Perspectives & Steelmanning**

**The Cloud Architect:** "Synchronously pausing a Catalyst Circuit for a human supervisor is a massive anti-pattern; it will time out. The Async Hydration pattern (terminating the circuit and saving state to DB, then starting a new one on approval) is the only reliable way to implement HITL in serverless orchestration."  
**The Privacy Lawyer:** "Tying the PII unmasking key directly to the active, authenticated JWT session is much more legally defensible than an arbitrary 5-minute timer. It ensures that if the officer's device locks, the data is instantly redacted."  
**The Database Administrator:** "Searching millions of vector embeddings across a state-wide database using only a 'district' pre-filter will throttle the system." *Mitigation:* The Router Agent is strictly instructed via .agent\_context.md to extract secondary hard-filters (e.g., date ranges, crime categories) to reduce the vector search space to \<10,000 rows prior to cosine similarity calculations.  
**Steelmanning the Opposite (Why we shouldn't build this):** *The Argument for a Monolithic COTS System (e.g., Palantir):* Building a multi-agent, 26-service microarchitecture on a generic cloud (Catalyst) introduces massive integration risk. A Commercial Off-The-Shelf (COTS) system is vertically integrated and battle-tested in court. *Why we reject this:* COTS systems violate the Datathon mandate to use Zoho Catalyst, incur massive licensing fees, lock the state into proprietary data formats, and offer zero transparent control over the AI's internal behavioral logic (Glass-Box requirement).

## **13\. KPIs & Success Metrics**

| KPI | Measurement | Target |
| :---- | :---- | :---- |
| Query resolution time (Text) | Distributed trace latency | \<3 seconds |
| Query resolution time (Voice) | Distributed trace latency | \<8 seconds |
| Network analysis accuracy | Manual case validation | \>90% correct edges |
| DPDP compliance | PII leakage in audit logs | 0 incidents |
| Reviewer catch rate | Reviewer FAILED events | \>95% |
| Voice query admissibility | Forensic hash match rate | 100% |
| **Demographic parity deviation** | Risk score gap across demographic groups | \<0.10 from baseline |
| **Expected Calibration Error (ECE)** | Predicted probability vs. actual rate | \<0.05 |
| **Regression suite pass rate** | 200 golden queries against schemas | 100% compliance |

## **14\. Financial Crime Integration**

1. **Catalyst Connections** → OAuth link to State Financial Intelligence Unit (SFIU) REST API.  
2. **Hawala Pattern Detection:** Serverless detects circular flows (A→B→C→A within 72hrs) as potential hawala indicators.  
3. Risk scores from Zia AutoML incorporate transaction anomaly signals (without exposing raw financials to general investigators — RBAC-gated).

## **15\. Multilingual & Voice Architecture**

`Field Officer Input (Kannada voice) → Zia STT (with Bhashini API Fallback)`   
  `→ Serverless language detector`   
  `→ Zia Translation (Kannada to English)`  
  `→ Standard multi-agent pipeline (English processing)`  
  `→ Zia Translation (English to Kannada)`  
  `→ Zia TTS → Kannada audio stream`

*Note on Latency:* As documented in the ADR, this full round-trip inevitably takes \~6-8 seconds. To maintain user engagement, the system streams the intermediate STT transcription text to the UI as visual feedback while the LLM and TTS layers process.

*Bhashini API Fallback:* To guarantee high-accuracy Kannada speech-to-text and translation across local dialects, the Serverless layer runs a confidence audit on Zia STT output. If the word-error-rate (WER) exceeds 15% or regional dialects confuse Zia services, the transcription falls back to the government-backed Bhashini API, ensuring regional dialect compliance.

## **16\. Conversational Memory & Token Preservation**

If an investigator asks multiple follow-up questions, appending the full raw conversation history to the prompt alongside RAG data and agent context files will rapidly breach the LLM context limits. **Solution:** Implement a **Sliding Window Summarizer** in Catalyst Cache. After 4 conversational turns, the Serverless function automatically calls QuickML to summarize the previous exchanges into a dense, single-paragraph context block, discarding raw dialogue tokens and preserving critical head space.

## **17\. Anti-Hallucination Engine (7 Layers)**

To guarantee legal admissibility and mathematical reliability under court scrutiny, the platform enforces a strict, closed-loop anti-hallucination framework.  
`Incoming Query`   
  `↓`  
`[Layer 1: Context Isolation (Pre-Filter)] → Discards unmapped vectors`  
  `↓`  
`[Layer 2: NLI Entailment Classifier] → Verifies context-to-claim logic`  
  `↓`  
`[Layer 3: Citation Anchoring Engine] → Rejects sentences without DB references`  
  `↓`  
`[Layer 4: Self-Consistency Sampling (3x Temp runs)] → Jaccard consensus checks`  
  `↓`  
`[Layer 5: Reviewer Agent Pass/Fail] → Dynamic agent-level criticism`  
  `↓`  
`[Layer 6: Semantic Deduplication Cache] → Locks verified responses`  
  `↓`  
`[Layer 7: Dynamic Abstention Shield] → Returns "Insufficient verified context"`

1. **Layer 1 — Context Isolation:** The RAG pipeline strictly isolates retrieve-and-generate prompts from arbitrary system actions. Metadata pre-filters discard any unstructured nodes that do not have direct relational edges inside the active search scope.  
2. **Layer 2 — NLI Entailment Classifier:** QuickML serving wraps output sentences in a secondary Natural Language Inference (NLI) step. Claims are scored as ENTAILMENT, NEUTRAL, or CONTRADICTION against the raw database context. Claims scored below an entailment threshold of 0.88 are automatically removed.  
3. **Layer 3 — Citation Anchoring Engine:** Every factual statement generated must programmatically anchor its claims to a specific primary key (e.g., FIR\_ID or TX\_ID). Any sentence failing to bind to a live Data Store reference is stripped from the final payload.  
4. **Layer 4 — Self-Consistency Sampling:** For HIGH\_STAKES queries, the Synthesizer executes three concurrent runs at temperatures 0.3, 0.4, and 0.5. A Jaccard similarity check measures token distribution consensus. If consensus falls below 0.92, the system trigger declines to make a claim.  
5. **Layer 5 — Reviewer Agent:** A dedicated QuickML Reviewer Agent compares drafts against raw database schemas and outputs, feeding programmatic critiques back into the synthesis engine for retry loops.  
6. **Layer 6 — Semantic Deduplication Cache:** Verified claims are locked inside the L2 cache based on semantic query hashes. Once a complex synthesis path is verified, future identical semantic searches bypass the generation layers completely.  
7. **Layer 7 — Dynamic Abstention Shield:** When retrieval returns zero matching context blocks or if confidence metrics drop, the system is hardcoded to refuse speculation, outputting a standard: *"I do not possess verified record-level evidence to answer this query safely."*

## **18\. Anti-Bias Framework (6 Pillars)**

Algorithmic models used in policing risk encoding socio-economic, racial, or caste disparities. The Zia AutoML scoring pipelines utilize a 6-pillar fairness shield.

1. **Pillar 1 — Complete Demographic Blindness:** All proxy features (e.g., family surnames, specific street addresses, religious identifiers, economic bracket) are explicitly omitted from tabular Zia AutoML training sets. Only behavioral variables (e.g., interval timestamps, tool signatures) are permitted.  
2. **Pillar 2 — Counterfactual Fairness Auditing:** Monthly SDLC checks run systematic "perturbation testing" on the models. For a sample of 1,000 suspect rows, synthetic demographic proxies are swapped. If the resulting risk score varies by more than a delta of 0.05, the model is flagged.  
3. **Pillar 3 — Equalized Odds Metrics:** Fairness reporting programmatically measures true-positive rate (TPR) and false-positive rate (FPR) parity across cohorts:  
4. **Pillar 4 — Feedback-Loop Intervention:** To prevent historical arresting biases from building self-reinforcing prediction loops, Zia AutoML risk scores are strictly prohibited from being written back to primary training tables as historical label metrics.  
5. **Pillar 5 — Model Calibration Check (ECE):** Ensures predicted probabilities map directly to actual recidivism rates. The Expected Calibration Error (ECE) is kept strictly below 0.05.  
6. **Pillar 6 — The Bias Circuit Breaker:** If monthly audits indicate that Demographic Parity or Equalized Odds metrics deviate from the baseline by \>0.10, the Bias Circuit Breaker fires. The Zia AutoML endpoint is programmatically suspended, Catalyst Mail alerts are dispatched, and the platform reverts to a simpler heuristic model.

## **19\. Accuracy & Repeatability Engine**

To ensure that defense lawyers cannot challenge AI evidence based on inconsistent outputs, the system forces deterministic prediction behavior.

1. **Ensemble Modeling (AutoML):** Predictions combine multiple model architectures via weighted majoritarian votes, reducing individual model variance.  
2. **Deterministic Graph Traversal:** App-layer BFS utilizes fixed database sorting orders (e.g., ordering by node\_id and created\_at timestamp) during pagination. This guarantees that BFS graphs are built identically across every execution run.  
3. **Query Normalization Pipeline:** Incoming natural language prompts are cleaned, whitespace is stripped, legacy IPC codes are mapped to modern BNS rules, and spelling errors are resolved before tokenization. This prevents minor phrasing differences from generating divergent RAG retrievals.