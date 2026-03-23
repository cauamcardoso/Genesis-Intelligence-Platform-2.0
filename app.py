"""Genesis Intelligence Platform 2.0 — Flask Backend"""
from flask import Flask, render_template, jsonify
import json
import os

app = Flask(__name__)

# Load data once at startup
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}

faculty_data = load_json('faculty.json')
challenges_data = load_json('challenges.json')
scores_data = load_json('scores.json')
metadata = load_json('metadata.json')

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/faculty")
def api_faculty():
    return jsonify(faculty_data)

@app.route("/api/challenges")
def api_challenges():
    return jsonify(challenges_data)

@app.route("/api/scores")
def api_scores():
    return jsonify(scores_data)

@app.route("/api/metadata")
def api_metadata():
    return jsonify(metadata)

@app.route("/health")
def health():
    return {"status": "ok"}, 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, port=port)
