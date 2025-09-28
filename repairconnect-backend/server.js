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

app.post("/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  console.log("REGISTER payload:", req.body); // ✅ log incoming

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




// ✅ Customer login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    const user = result[0];

    if (!user) return res.status(401).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
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

// ✅ Protected admin route
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

app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
