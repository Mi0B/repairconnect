import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8080";

function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);

  // Modal management
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

  // Suspension duration
  const [suspendDuration, setSuspendDuration] = useState("24");

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

        if (summaryRes.status === 401 || usersRes.status === 401)
          throw new Error("Unauthorized");

        if (!summaryRes.ok) throw new Error("Failed to load summary");
        if (!usersRes.ok) throw new Error("Failed to load users");

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

  function confirmLogout() {
    setLogoutVisible(true);
  }

  function handleLogout() {
    localStorage.removeItem("rc_token");
    window.location.href = "/";
  }

  function openConfirmModal(user, action) {
    setConfirmUser(user);
    setConfirmAction(action);
    setConfirmVisible(true);
    if (action === "suspend") setSuspendDuration("24");
  }

  function closeConfirmModal() {
    setConfirmVisible(false);
    setConfirmUser(null);
    setConfirmAction(null);
  }

  async function handleConfirmedAction() {
    if (!token || !confirmUser || !confirmAction) return;

    try {
      setActioningId(confirmUser.id);
      setError(null);

      const method = confirmAction === "delete" ? "DELETE" : "POST";
      const url =
        confirmAction === "delete"
          ? `${API_BASE}/admin/users/${confirmUser.id}`
          : `${API_BASE}/admin/users/${confirmUser.id}/${confirmAction}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const body =
        confirmAction === "suspend"
          ? JSON.stringify({ duration: suspendDuration })
          : undefined;

      const res = await fetch(url, { method, headers, body });

      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to ${confirmAction} user`);
      }

      if (confirmAction === "delete") {
        setUsers((prev) => prev.filter((u) => u.id !== confirmUser.id));
      } else {
        const updatedUser = await res.json().catch(() => null);
        if (updatedUser) {
          setUsers((prev) =>
            prev.map((u) => (u.id === confirmUser.id ? { ...u, ...updatedUser } : u))
          );
        }
      }
    } catch (err) {
      console.error(`Failed to ${confirmAction} user`, err);
      setError(err.message || `Failed to ${confirmAction} user`);
    } finally {
      setActioningId(null);
      closeConfirmModal();
    }
  }

  function Modal({
    visible,
    title,
    color,
    message,
    onConfirm,
    onCancel,
    confirmLabel,
    showDuration,
    durationValue,
    setDurationValue,
  }) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: visible ? "rgba(0,0,0,0.4)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: visible ? "auto" : "none",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            background: "white",
            padding: "24px 28px",
            borderRadius: 10,
            width: "90%",
            maxWidth: 400,
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            transform: visible ? "scale(1)" : "scale(0.9)",
            transition: "transform 0.25s ease",
          }}
        >
          <h3 style={{ marginBottom: 12, color }}>{title}</h3>
          <p style={{ marginBottom: 20 }}>{message}</p>

          {showDuration && (
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  color: "#444",
                  textAlign: "left",
                }}
              >
                Suspension Duration:
              </label>
              <select
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                }}
              >
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">1 day</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
              </select>
            </div>
          )}

          <div>
            <button
              onClick={onConfirm}
              style={{
                padding: "8px 16px",
                background: color,
                color: "white",
                border: "none",
                borderRadius: 6,
                marginRight: 10,
                cursor: "pointer",
              }}
            >
              {confirmLabel || "Confirm"}
            </button>
            <button
              onClick={onCancel}
              style={{
                padding: "8px 16px",
                background: "#ccc",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  function getActionDetails(action) {
    const map = {
      suspend: { color: "#ff9800", label: "Suspend User" },
      ban: { color: "#9c27b0", label: "Ban User" },
      activate: { color: "#388e3c", label: "Reactivate User" },
      delete: { color: "#d32f2f", label: "Delete User" },
    };
    return map[action] || { color: "#555", label: "Confirm Action" };
  }

  // 🧠 Format Suspended Until as MM/DD/YYYY
  function formatDate(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date)) return "—";
    return date.toLocaleDateString("en-US"); // MM/DD/YYYY
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>Admin Dashboard</h1>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <button
          onClick={confirmLogout}
          style={{
            padding: "8px 16px",
            background: "#555",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Log Out
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && error && <p style={{ color: "#b00020" }}>{error}</p>}

      {!loading && !error && (
        <>
          {summary && summary.stats && (
            <section style={{ marginBottom: 40 }}>
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
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: "bold" }}>{value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ✅ Users Table */}
          <section>
            <h2 style={{ marginBottom: 10 }}>Users</h2>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  borderRadius: 6,
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", background: "#fafafa" }}>
                    {["ID", "Name", "Email", "Role", "Status", "Suspended Until", "Actions"].map(
                      (th) => (
                        <th
                          key={th}
                          style={{
                            padding: "10px 12px",
                            borderBottom: "1px solid #ddd",
                            fontWeight: "600",
                          }}
                        >
                          {th}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isActive = user.status === "active" || !user.status;
                    const isSuspended = user.status === "suspended";
                    const isBanned = user.status === "banned";

                    return (
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
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                          {user.role}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            borderBottom: "1px solid #eee",
                            color: isBanned
                              ? "#d32f2f"
                              : isSuspended
                              ? "#ff9800"
                              : "#388e3c",
                            textTransform: "capitalize",
                          }}
                        >
                          {user.status || "active"}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                          {formatDate(user.suspended_until)}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            borderBottom: "1px solid #eee",
                            whiteSpace: "nowrap", // ✅ keeps buttons on one line
                          }}
                        >
                          {isActive && (
                            <>
                              <button
                                onClick={() => openConfirmModal(user, "suspend")}
                                style={{
                                  marginRight: 6,
                                  padding: "5px 10px",
                                  background: "#ff9800",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 4,
                                  fontSize: 13,
                                }}
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => openConfirmModal(user, "ban")}
                                style={{
                                  marginRight: 6,
                                  padding: "5px 10px",
                                  background: "#9c27b0",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 4,
                                  fontSize: 13,
                                }}
                              >
                                Ban
                              </button>
                            </>
                          )}
                          {isSuspended && (
                            <>
                              <button
                                onClick={() => openConfirmModal(user, "activate")}
                                style={{
                                  marginRight: 6,
                                  padding: "5px 10px",
                                  background: "#388e3c",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 4,
                                  fontSize: 13,
                                }}
                              >
                                Reactivate
                              </button>
                              <button
                                onClick={() => openConfirmModal(user, "ban")}
                                style={{
                                  marginRight: 6,
                                  padding: "5px 10px",
                                  background: "#9c27b0",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 4,
                                  fontSize: 13,
                                }}
                              >
                                Ban
                              </button>
                            </>
                          )}
                          {isBanned && (
                            <button
                              onClick={() => openConfirmModal(user, "activate")}
                              style={{
                                marginRight: 6,
                                padding: "5px 10px",
                                background: "#388e3c",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                fontSize: 13,
                              }}
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            onClick={() => openConfirmModal(user, "delete")}
                            style={{
                              padding: "5px 10px",
                              background: "#d32f2f",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 13,
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Confirmation Modals */}
      <Modal
        visible={confirmVisible}
        title={getActionDetails(confirmAction).label}
        color={getActionDetails(confirmAction).color}
        message={`Are you sure you want to ${confirmAction} ${
          confirmUser?.name || confirmUser?.email
        }?`}
        onConfirm={handleConfirmedAction}
        onCancel={closeConfirmModal}
        confirmLabel={`Yes, ${getActionDetails(confirmAction).label.split(" ")[0]}`}
        showDuration={confirmAction === "suspend"}
        durationValue={suspendDuration}
        setDurationValue={setSuspendDuration}
      />

      <Modal
        visible={logoutVisible}
        title="Confirm Logout"
        color="#555"
        message="Are you sure you want to log out of the admin dashboard?"
        onConfirm={handleLogout}
        onCancel={() => setLogoutVisible(false)}
        confirmLabel="Log Out"
      />
    </div>
  );
}

export default AdminDashboard;
