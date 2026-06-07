'use strict';
# Flask microservice for topological network calculations
import os
from flask import Flask, request, jsonify
import networkx as nx

app = Flask(__name__)

@app.route('/centrality', methods=['POST'])
def calculate_centrality():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing graph data payload"}), 400

        nodes = data.get("nodes", [])
        edges = data.get("edges", [])

        if not nodes:
            return jsonify({"centrality_scores": {}}), 200

        # 1. Build the NetworkX graph
        G = nx.Graph()
        for node in nodes:
            G.add_node(node["id"])

        for edge in edges:
            weight = float(edge.get("weight", 1.0))
            G.add_edge(edge["source"], edge["target"], weight=weight)

        # 2. Compute Eigenvector Centrality
        # Using numpy solver for robustness with detached component graphs
        try:
            centrality = nx.eigenvector_centrality(G, weight='weight', max_iter=1000)
        except nx.PowerIterationFailedConvergence:
            # Fallback to degree centrality if power iteration fails to converge
            print("[WARN] Eigenvector power iteration failed to converge. Falling back to degree centrality.")
            centrality = nx.degree_centrality(G)

        # Round scores for clean presentation
        rounded_centrality = {node_id: round(score, 4) for node_id, score in centrality.items()}

        return jsonify({
            "status": "success",
            "centrality_scores": rounded_centrality
        }), 200

    except Exception as e:
        print(f"[CRITICAL_ERROR] AppSail centralizer failed: {str(e)}")
        return jsonify({
            "status": "error",
            "error_code": "APPSAIL_ANALYSIS_FAILED",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    print(f"[APPSAIL_START] AppSail Centrality Analyzer starting on port {port}...")
    app.run(host='0.0.0.0', port=port)
