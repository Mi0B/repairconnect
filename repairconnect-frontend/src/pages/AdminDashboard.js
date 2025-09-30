import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8080";

function AdminDashboard() {
  const [data, setData] = useState(null);
  const token = localStorage.getItem("rc_token");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`${API_BASE}/admin/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        setData({ error: "Unauthorized" });
      }
    }
    fetchData();
  }, [token]);

  function logout() {
    localStorage.removeItem("rc_token");
    window.location.href = "/";
  }

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <h1>Admin Dashboard</h1>
      <button onClick={logout}>Log Out</button>
      <pre style={{ background: "#f5f5f5", padding: 12, marginTop: 20 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default AdminDashboard;
