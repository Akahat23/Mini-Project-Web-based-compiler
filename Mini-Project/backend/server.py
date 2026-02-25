from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import subprocess
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/run", methods=["POST"])
def run_code():
    code = request.json.get("code")

    file_path = os.path.join(os.path.dirname(__file__), "temp.py")

    with open(file_path, "w") as f:
        f.write(code)

    result = subprocess.run(
        ["python", file_path],
        capture_output=True,
        text=True
    )

    return jsonify({
        "output": result.stdout,
        "error": result.stderr
    })

if __name__ == "__main__":
    app.run(debug=True)