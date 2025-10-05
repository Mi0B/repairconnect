import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8080";

function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const token = localStorage.getItem("rc_token");

  useEffect(() => {
    if (!token) {
      setError("Missing token");
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const headers = { Authorization: `Bearer ${token}` };

        const [summaryRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}/admin/summary`, { headers }),
          fetch(`${API_BASE}/admin/users`, { headers }),
        ]);

        if (summaryRes.status === 401 || usersRes.status === 401) {
          throw new Error("Unauthorized");
        }

        if (!summaryRes.ok) {
          throw new Error("Failed to load summary");
        }

        if (!usersRes.ok) {
          throw new Error("Failed to load users");
        }

        const summaryData = await summaryRes.json();
        const usersData = await usersRes.json();

        setSummary(summaryData);
        setUsers(usersData);
      } catch (err) {
        console.error("Failed to load admin data", err);
        setError(err.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  function logout() {
    localStorage.removeItem("rc_token");
    window.location.href = "/";
  }

  async function handleDelete(userId) {
    if (!token) return;
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    try {
      setDeletingId(userId);
      setError(null);
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete user");
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      console.error("Failed to delete user", err);
      setError(err.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <h1>Admin Dashboard</h1>
      <button onClick={logout}>Log Out</button>
      {loading && <p style={{ marginTop: 20 }}>Loading...</p>}
      {!loading && error && (
        <p style={{ marginTop: 20, color: "#b00020" }}>{error}</p>
      )}
      {!loading && !error && (
        <>
          {summary && (
            <section style={{ marginTop: 20 }}>
              {summary.message && (
                <h2 style={{ marginBottom: 10 }}>{summary.message}</h2>
              )}
              {summary.stats && (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  }}
                >
                  {Object.entries(summary.stats).map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        background: "#f5f5f5",
                        padding: "12px 14px",
                        borderRadius: 8,
                        textTransform: "capitalize",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: "bold" }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section style={{ marginTop: 30 }}>
            <h2>Users</h2>
            {users.length === 0 ? (
              <p style={{ color: "#666" }}>No users yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: 12,
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left", background: "#fafafa" }}>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #ddd" }}>
                        ID
                      </th>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #ddd" }}>
                        Name
                      </th>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #ddd" }}>
                        Email
                      </th>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #ddd" }}>
                        Role
                      </th>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #ddd" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                          {user.id}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                          {user.name || "-"}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                          {user.email}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textTransform: "capitalize" }}>
                          {user.role}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={deletingId === user.id}
                            style={{
                              padding: "6px 12px",
                              background: "#d32f2f",
                              color: "white",
                              border: "none",
                              borderRadius: 6,
                              cursor: deletingId === user.id ? "not-allowed" : "pointer",
                            }}
                          >
                            {deletingId === user.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
