import { useState } from "react";

function App() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");

  const runCode = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      setOutput(data.output || data.error);
    } catch (error) {
      setOutput("Error connecting to backend");
    }
  };

  return (
    <div style={{ padding: "30px", fontFamily: "monospace" }}>
      <h1>Web Based Compiler</h1>

      <textarea
        rows="12"
        cols="70"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Write Python code here..."
      />

      <br /><br />

      <button onClick={runCode} style={{ padding: "10px 20px" }}>
        Run Code
      </button>

      <h3>Output:</h3>
      <pre style={{ background: "#f4f4f4", padding: "15px" }}>
        {output}
      </pre>
    </div>
  );
}

export default App;