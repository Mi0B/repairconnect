// src/pages/Home.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // ✅ named import
import styles from "./Home.module.css";

const API_BASE = "http://localhost:8080";

function Home() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ✅ LOGIN
  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      // Try admin first
      let res = await fetch(`${API_BASE}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      let data = await res.json();

      if (res.ok) {
        localStorage.setItem("rc_token", data.token);
        return navigate("/admin/dashboard");
      }

      // Fallback: customer/provider
      res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      data = await res.json();

      if (res.ok) {
        localStorage.setItem("rc_token", data.token);

        const decoded = jwtDecode(data.token);
        console.log("Decoded token:", decoded);

        if (decoded.role === "provider") {
          return navigate("/provider/dashboard");
        } else {
          return navigate("/customer/dashboard");
        }
      }

      throw new Error(data.error || "Login failed");
    } catch (e) {
      setError(e.message);
    }
  }

  // ✅ REGISTER
  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Registration failed");

      // After register → back to login form
      setIsRegistering(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("customer");
      console.log({name, email, password, role });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Welcome to <span className={styles.brand}>RepairConnect</span>
      </h1>
      <p className={styles.slogan}>Repair smarter. Connect faster.</p>

      {isRegistering ? (
        <>
          <p className={styles.subtitle}>Register</p>
          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="name">Name</label>
              <input
                id="name"
                className={styles.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="role">Role</label>
              <select
                id="role"
                className={styles.input}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="customer">Customer</option>
                <option value="provider">Provider</option>
              </select>
            </div>
            <button className={styles.submitButton} type="submit">
              Register
            </button>
          </form>
          <p>
            Already have an account?{" "}
            <button
              className={styles.linkButton}
              type="button"
              onClick={() => setIsRegistering(false)}
            >
              Sign In
            </button>
          </p>
        </>
      ) : (
        <>
          <p className={styles.subtitle}>Sign-in</p>
          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className={styles.submitButton} type="submit">
              Sign In
            </button>
          </form>
          <p>
            Don’t have an account?{" "}
            <button
              className={styles.linkButton}
              type="button"
              onClick={() => setIsRegistering(true)}
            >
              Register
            </button>
          </p>
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

export default Home;
