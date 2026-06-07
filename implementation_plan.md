# **Implementation Plan: KSP Crime Database Intelligent Assistant**

This document outlines the phase-by-phase engineering plan to build the state-wide law enforcement intelligence platform using Zoho Catalyst.

---

## **Goal Description**
The goal is to build an intelligent, legally admissible, and secure Conversational AI for the Karnataka State Police (KSP) Crime Database. The platform integrates a Temporal Intelligence Graph, multi-modal evidence ingestion, network simulation, and differential privacy, all constrained within a 100% Zoho Catalyst-native architecture.

---

## **User Review Required**

> [!IMPORTANT]
> **Data Center Region Match:** Ensure that your Zoho Catalyst account matches the Datacenter selected during login (e.g., India DC for local Indian Police data compliance).
> **Zia regional STT/OCR limits:** We are designing Bhashini API as a fallback if Kannada translation accuracy drops. You will need to obtain a Bhashini API access key if you wish to enable the fallback capability.

---

## **Open Questions**
1. Do you have a pre-existing Bhashini API key for Kannada speech-to-text integration, or should we mock the translation fallback for testing?
2. Should we initialize a local React SPA in `client/` immediately or implement the backend routes first?

---

## **Proposed Changes**

### **Backend Core Component**
Defines the serverless endpoint logic, databases, schemas, and AI contexts.

*   #### [NEW] [catalyst.json](file:///c:/Users/athar/Desktop/Projects/Datathon/catalyst.json)
    Primary project configuration linking functions and client paths.
*   #### [NEW] [data_store_schema.json](file:///c:/Users/athar/Desktop/Projects/Datathon/config/data_store_schema.json)
    Database table creation definitions for Data Store.
*   #### [NEW] [.db_schema.md](file:///c:/Users/athar/Desktop/Projects/Datathon/.db_schema.md)
    Legal ontology and schema mappings for LLM runtime context.
*   #### [NEW] [.agent_context.md](file:///c:/Users/athar/Desktop/Projects/Datathon/.agent_context.md)
    System guardrails and specialist agent constraints.
*   #### [NEW] [index.js](file:///c:/Users/athar/Desktop/Projects/Datathon/functions/backend_logic/index.js)
    Express routes (Query, Status, Approvals, Disruption).

### **Containerized Agents Component**
Dockerized analytics agents running on AppSail.

*   #### [NEW] [Dockerfile](file:///c:/Users/athar/Desktop/Projects/Datathon/app-sail/network-analyzer/Dockerfile)
    Docker container configuration for AppSail.
*   #### [NEW] [analyzer.py](file:///c:/Users/athar/Desktop/Projects/Datathon/app-sail/network-analyzer/analyzer.py)
    Python Network Analyzer computing centrality and disruption impact.

### **Frontend Slate UI Component**
The visual investigator control panel.

*   #### [NEW] [client/](file:///c:/Users/athar/Desktop/Projects/Datathon/client)
    React SPA with D3.js timelines, node graph charts, and voice input module.

---

## **Phase-by-Phase Roadmap**

### **Phase 1: Environment Setup (Completed)**
*   Globally install CLI tools, verify Node/Docker versions, associate directory with Zoho Catalyst project `KSP-Crime-Database`.
*   Generate baseline project configs (`catalyst.json`, `.catalystrc`, `package.json`).

### **Phase 2: Relational Data Store Schema Configuration**
*   Create tables inside Catalyst Data Store Console using the schema defined in [.db_schema.md](file:///c:/Users/athar/Desktop/Projects/Datathon/.db_schema.md).
*   Create indexes on `Nodes.label`, `Edges.source_id`, `Edges.target_id`, and `FIRs.forensic_hash` to optimize search speeds.

### **Phase 3: Core Serverless API Development**
*   **Temporal BFS:** Write SQL query generator in Node.js to traverse connections up to 2-hops, bypassing super-nodes ($>500$ edges).
*   **PII Vault:** Implement AES-256 column-level encryption in functions, fetching master key from Catalyst Secrets and salting using JWT session IDs.
*   **Hash Chaining:** Write a utility to chain-hash audit logs into `AI_Execution_Logs`.
*   **Memory Summarizer:** Set up a Sliding Window Summarizer that triggers a QuickML call to collapse context after 4 conversational turns.

### **Phase 4: AI Ingestion & Fallback Pipeline**
*   **Vector Database:** Configure QuickML vector search tables.
*   **Pre-Filtering:** Integrate Router Agent logic to filter by `district`/`date` before calculating cosine similarity.
*   **Forensic Ingestion (STT/OCR):** Set up Zia STT & OCR. Implement SHA-256 generation on Stratus upload. Add Bhashini API webhook fallback for regional Kannada speech-to-text.

### **Phase 5: Orchestration & AppSail Containers**
*   **AppSail Analyzer:** Develop python container calculating Eigenvector Centrality. Deploy to AppSail.
*   **Circuits & Hydration:** Implement Catalyst Circuits flow diagram. Create the state-saver table to pause operations during Human-in-the-Loop gates and resume via POST requests.

### **Phase 6: Frontend Slate React Application**
*   Initialize Catalyst Slate client React SPA.
*   Build D3.js Graph Visualizer to render network nodes.
*   Integrate Timeline component showing historical evolution of criminal contacts.
*   Implement Voice Recorder capturing audio for Zia STT ingestion.

### **Phase 7: Auditing, Compliance & Drift Detection**
*   Write weekly drift detector cron comparing live schemas with `.db_schema.md`.
*   Write monthly fairness audit cron running counterfactual testing (swapping surnames/caste features to verify risk score parity).

---

## **Verification Plan**

### **Automated Tests**
*   **ZCQL Performance Run:** Run pagination query script to measure ZCQL index performance on simulated 10k nodes:
    ```bash
    npm run test:query-performance
    ```
*   **Golden Queries Regression Suite:** Run 200 verification queries against local database emulators:
    ```bash
    catalyst serve
    ```

### **Manual Verification**
*   Run local emulator via `catalyst serve`. Open browser and verify voice recording captures and translates Kannada to English, rendering redacted names (`SUS_1`) in the chat UI.
*   Simulate node deletion on the UI and check if the dashboard prompts the supervisor disclaimer page prior to rendering centrality changes.
