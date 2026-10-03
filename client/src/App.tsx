import { useEffect, useState } from "react";

function App() {
  const [result, setResult] = useState("Loading...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setResult(JSON.stringify(data)))
      .catch(() => setResult("Gagal terhubung ke backend"));
  }, []);

  return (
    <div>
      <h1>Portfolio Tracker</h1>
      <p>Backend: {result}</p>
    </div>
  );
}

export default App;