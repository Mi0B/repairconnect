// repairconnect-backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import sql from "./db.js"; // ✅ Supabase-style import

const app = express();

// pull values from .env
const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ✅ Public root route (for testing)
app.get("/", (req, res) => {
  console.log("GET / hit ✅");
  res.send("Backend is working!");
});

// ✅ Admin login (hardcoded from .env)
app.post("/auth/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  console.log("POST /auth/admin/login", email);

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: "admin", email }, JWT_SECRET, { expiresIn: "2h" });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

// ✅ Middleware
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
}

// ✅ Register new users
app.post("/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  console.log("REGISTER payload:", req.body);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${name}, ${email}, ${hashedPassword}, ${role})
      RETURNING id, email, role
    `;

    res.json({ message: "User registered", user: result[0] });
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ✅ Customer login (with status check)
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    const user = result[0];

    if (!user) return res.status(401).json({ error: "User not found" });

    // 🧠 Check user status before allowing login
    const status = (user.status || "active").toLowerCase();

    // Check if user is banned or suspended before login
    if (user.status === "banned") {
      return res.status(403).json({ error: "Your account has been permanently banned." });
    }

    if (user.status === "suspended") {
      const suspendedUntil = user.suspended_until ? new Date(user.suspended_until) : null;
      const now = new Date();

      if (suspendedUntil && suspendedUntil > now) {
        const remainingHours = Math.ceil((suspendedUntil - now) / 3600000);
        return res.status(403).json({
          error: `Your account is suspended for another ${remainingHours} hour(s).`,
        });
      } else {
        // Suspension expired — reactivate user
        await sql`
          UPDATE users SET status = 'active', suspended_until = NULL WHERE id = ${user.id}`;
        user.status = "active";
        user.suspended_until = null;
      }
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, status: user.status },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ✅ DB health check route
app.get("/db-check", async (req, res) => {
  try {
    const result = await sql`SELECT NOW()`;
    res.json({ db_time: result[0].now });
  } catch (err) {
    console.error("DB check failed:", err);
    res.status(500).json({ error: "Database not reachable" });
  }
});

// ✅ Protected admin summary route
app.get("/admin/summary", requireAuth, requireAdmin, (req, res) => {
  console.log("GET /admin/summary by", req.user.email);
  res.json({
    message: "Welcome, Admin!",
    stats: {
      totalUsers: 5,
      totalRequests: 10,
      pendingJobs: 3,
    },
  });
});

// ✅ List all users (without passwords)
app.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await sql`
      SELECT id, name, email, role, status, suspended_until
      FROM users
      ORDER BY id
    `;
    res.json(users);
  } catch (err) {
    console.error("Failed to load users:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

// ✅ Delete a user
app.delete("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const deleted = await sql`
      DELETE FROM users
      WHERE id = ${userId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted", id: deleted[0].id });
  } catch (err) {
    console.error("Failed to delete user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ✅ Suspend user temporarily (duration in hours)
app.post("/admin/users/:id/suspend", async (req, res) => {
  const { id } = req.params;
  const { duration } = req.body || {};

  try {
    // Default: 24 hours if not specified
    const suspendHours = parseInt(duration, 10) || 24;

    // Calculate suspension end time
    const suspendUntil = new Date(Date.now() + suspendHours * 60 * 60 * 1000);

    const updated = await sql`
      UPDATE users
      SET status = 'suspended',
          suspended_until = ${suspendUntil}
      WHERE id = ${id}
      RETURNING id, name, email, role, status, suspended_until;
    `;

    if (!updated.length) {
      return res.status(404).json({ error: "User not found." });
    }

    console.log(
      `⚠️ User ${id} suspended for ${suspendHours}h (until ${suspendUntil.toISOString()})`
    );

    res.json(updated[0]);
  } catch (err) {
    console.error("Error suspending user:", err);
    res.status(500).json({ error: "Failed to suspend user." });
  }
});

// ✅ Ban User
app.post("/admin/users/:id/ban", async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await sql`
      UPDATE users
      SET status = 'banned',
          suspended_until = NULL
      WHERE id = ${id}
      RETURNING id, name, email, role, status, suspended_until;
    `;

    if (!updated.length) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json(updated[0]);
  } catch (err) {
    console.error("Error banning user:", err);
    res.status(500).json({ error: "Failed to ban user." });
  }
});

// ✅ Reactivate User
app.post("/admin/users/:id/activate", async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await sql`
      UPDATE users
      SET status = 'active',
          suspended_until = NULL
      WHERE id = ${id}
      RETURNING id, name, email, role, status, suspended_until;
    `;

    if (!updated.length) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json(updated[0]);
  } catch (err) {
    console.error("Error reactivating user:", err);
    res.status(500).json({ error: "Failed to reactivate user." });
  }
});

// ✅ Start the server
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
