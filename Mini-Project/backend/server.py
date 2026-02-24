from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

@app.route("/")
def home():
    return "Backend is running!"

@app.route("/run", methods=["POST"])
def run_code():
    code = request.json.get("code")

    with open("temp.py", "w") as f:
        f.write(code)

    result = subprocess.run(
        ["python", "temp.py"],
        capture_output=True,
        text=True
    )

    return jsonify({
        "output": result.stdout,
        "error": result.stderr
    })

if __name__ == "__main__":
    app.run(debug=True)