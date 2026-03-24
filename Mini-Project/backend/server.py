from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import uuid
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
    language = request.json.get("language")
    input_data = request.json.get("input", "")  # 🔥 input support

    base_path = os.path.dirname(__file__)

    try:
        # ================= PYTHON =================
        if language == "python":
            unique_id = str(uuid.uuid4())
            file_path = os.path.join(base_path, f"{unique_id}.py")

            with open(file_path, "w") as f:
                f.write(code)

            result = subprocess.run(
                ["python", file_path],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=5
            )

            os.remove(file_path)

        # ================= C =================
        elif language == "c":
            unique_id = str(uuid.uuid4())
            file_path = os.path.join(base_path, f"{unique_id}.c")
            exe_path = os.path.join(base_path, f"{unique_id}.exe")

            with open(file_path, "w") as f:
                f.write(code)

            compile = subprocess.run(
                ["gcc", file_path, "-o", exe_path],
                capture_output=True,
                text=True
            )

            if compile.returncode != 0:
                return jsonify({"output": "", "error": compile.stderr})

            result = subprocess.run(
                ["cmd", "/c", exe_path],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=5
            )

            os.remove(file_path)
            os.remove(exe_path)

        # ================= C++ =================
        elif language == "cpp":
            unique_id = str(uuid.uuid4())
            file_path = os.path.join(base_path, f"{unique_id}.cpp")
            exe_path = os.path.join(base_path, f"{unique_id}.exe")

            with open(file_path, "w") as f:
                f.write(code)

            compile = subprocess.run(
                ["g++", file_path, "-o", exe_path],
                capture_output=True,
                text=True
            )

            if compile.returncode != 0:
                return jsonify({"output": "", "error": compile.stderr})

            result = subprocess.run(
                ["cmd", "/c", exe_path],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=5
            )

            os.remove(file_path)
            os.remove(exe_path)

        # ================= JAVA (FIXED) =================
        elif language == "java":
            unique_id = str(uuid.uuid4()).replace("-", "")  # 🔥 remove hyphens
            class_name = "Main" + unique_id[:8]  # 🔥 valid class name

            file_path = os.path.join(base_path, f"{class_name}.java")

            # Replace class name properly
            code = code.replace("public class Main", f"public class {class_name}")

            with open(file_path, "w") as f:
                f.write(code)

            # Compile
            compile = subprocess.run(
                ["javac", file_path],
                capture_output=True,
                text=True
            )

            if compile.returncode != 0:
                return jsonify({"output": "", "error": compile.stderr})

            # Run
            result = subprocess.run(
                ["cmd", "/c", "java", "-cp", base_path, class_name],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=5
            )

            # Cleanup
            os.remove(file_path)
            class_file = os.path.join(base_path, f"{class_name}.class")
            if os.path.exists(class_file):
                os.remove(class_file)

        else:
            return jsonify({"output": "", "error": "Unsupported language"})

        return jsonify({
            "output": result.stdout,
            "error": result.stderr
        })

    except subprocess.TimeoutExpired:
        return jsonify({"output": "", "error": "Execution timed out!"})


if __name__ == "__main__":
    app.run(debug=True)