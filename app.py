"""Genesis Intelligence Platform 2.0 — Flask Backend"""
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, jsonify, request
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
advantages_data = load_json('utep_advantages.json')

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

@app.route("/api/advantages")
def api_advantages():
    return jsonify(advantages_data)

@app.route("/api/generate-concept", methods=["POST"])
def api_generate_concept():
    try:
        import anthropic
        data = request.json
        fa = data.get("focus_area", {})
        challenge = data.get("challenge", {})
        team = data.get("team", [])
        advantages = data.get("advantages", [])

        team_lines = []
        for m in team:
            line = f"- {m.get('name', 'Unknown')} ({m.get('department', '')}, {m.get('title', '').split('.')[0] if m.get('title') else 'Faculty'})"
            kws = m.get("expertise_keywords", [])[:6]
            if kws:
                line += f". Expertise: {', '.join(kws)}"
            metrics = m.get("scholar_metrics", {})
            if metrics.get("h_index"):
                line += f". h-index: {metrics['h_index']}, citations: {metrics.get('citations', 'N/A')}"
            team_lines.append(line)

        adv_text = ""
        if advantages:
            adv_text = f"\n\nUTEP Institutional Advantages:\n" + "\n".join(f"- {a}" for a in advantages)

        prompt = f"""You are helping a research university (UTEP) develop proposal concepts for the DOE Genesis Mission.

Given this focus area and research team, suggest 2-3 specific research directions that this particular team could pursue.

Challenge: {challenge.get('title', '')}
Focus Area: {fa.get('title', '')}
Focus Area Description: {fa.get('description', '')}

Research Team:
{chr(10).join(team_lines)}
{adv_text}

For each research direction, provide:
1. A concise title (under 10 words)
2. A 2-3 sentence description of the specific technical approach and what it would accomplish
3. One sentence on why this team's specific expertise makes them well-suited for it

Be specific and technical. Reference the team members' actual expertise areas. Do not use filler phrases, hedging language, or words like "leverage", "utilize", "robust", "cutting-edge", or "seamless". Write in third person. Do not use em dashes."""

        client = anthropic.Anthropic()
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        return jsonify({"concepts": message.content[0].text})

    except ImportError:
        return jsonify({"error": "Anthropic SDK not installed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health")
def health():
    return {"status": "ok"}, 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, port=port)
