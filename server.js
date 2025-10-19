import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import path from "path";
import { fileURLToPath } from "url";

// Derive __dirname in ESM context for static file serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "development-secret";
const PORT = process.env.PORT || 3000;

// Initialize SQLite
sqlite3.verbose();
const db = new sqlite3.Database("./du-doces.db");

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    address TEXT DEFAULT ''
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    price_cents INTEGER NOT NULL,
    promo INTEGER DEFAULT 0,
    image TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_cents INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    address TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    name TEXT,
    price_cents INTEGER,
    qty INTEGER,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments(
    id TEXT PRIMARY KEY,
    order_id INTEGER,
    provider TEXT,
    method TEXT,
    status TEXT,
    qr_code TEXT,
    qr_image_data TEXT,
    checkout_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Seed sample products if table is empty
db.get(`SELECT COUNT(*) AS n FROM products`, (err, row) => {
  if (row && row.n === 0) {
    const stmt = db.prepare(`INSERT INTO products(name,brand,category,price_cents,promo,image) VALUES (?,?,?,?,?,?)`);
    const insert = (name, brand, cat, price, promo, image) => {
      stmt.run(name, brand, cat, Math.round(price * 100), promo ? 1 : 0, image || "");
    };
    insert("Água LA 510ml (unidade)", "LA", "Bebidas", 0.75, false, "");
    insert("Água LA 510ml (fardo c/12)", "LA", "Bebidas", 9.00, true, "");
    insert("ThreeBond Cola (unidade)", "ThreeBond", "Utilidades", 1.99, false, "");
    insert("SuperBond Cola (unidade)", "SuperBond", "Utilidades", 4.95, false, "");
    insert("Pipoca OZ 40g Doce (unidade)", "OZ", "Salgadinhos", 0.70, false, "");
    insert("Pipoca OZ 40g Salgada (unidade)", "OZ", "Salgadinhos", 0.70, false, "");
    insert("Pipoca OZ 40g Doce (fardo c/30)", "OZ", "Salgadinhos", 21.00, true, "");
    insert("Pipoca OZ 40g Salgada (fardo c/30)", "OZ", "Salgadinhos", 21.00, true, "");
    insert("Pipoca OZ 12g Doce (c/50)", "OZ", "Salgadinhos", 16.50, true, "");
    insert("Coca-Cola 350ml (unidade)", "Coca-Cola", "Bebidas", 3.25, false, "");
    insert("Coca-Cola 200ml PET (unidade)", "Coca-Cola", "Bebidas", 1.65, false, "");
    insert("Coca-Cola 200ml Zero PET (unidade)", "Coca-Cola", "Bebidas", 1.65, false, "");
    stmt.finalize();
    console.log("Sample products inserted.");
  }
});

// Helper functions
const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
};

// Auth routes
app.post("/api/signup", (req, res) => {
  const { name, email, password, address = "" } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
  const password_hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(`INSERT INTO users(name,email,password_hash,role,address) VALUES (?,?,?,?,?)`);
  stmt.run(name, email, password_hash, "user", address, function (err) {
    if (err) return res.status(400).json({ error: "Email already exists" });
    const user = { id: this.lastID, name, email, role: "user" };
    const token = signToken(user);
    res.json({ user, token });
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  db.get(`SELECT * FROM users WHERE email=?`, [email], (err, user) => {
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, address: user.address };
    const token = signToken(safeUser);
    res.json({ user: safeUser, token });
  });
});

// Products routes
app.get("/api/products", (req, res) => {
  db.all(`SELECT * FROM products`, (err, rows) => res.json(rows || []));
});
app.get("/api/products/:id", (req, res) => {
  db.get(`SELECT * FROM products WHERE id=?`, [req.params.id], (err, row) => {
    if (!row) return res.status(404).json({ error: "Product not found" });
    res.json(row);
  });
});

// Admin product CRUD
app.get("/api/admin/products", authMiddleware, adminOnly, (req, res) => {
  db.all(`SELECT * FROM products`, (err, rows) => res.json(rows || []));
});
app.post("/api/admin/products", authMiddleware, adminOnly, (req, res) => {
  const { name, brand, category, price_cents, promo = 0, image = "" } = req.body || {};
  const stmt = db.prepare(`INSERT INTO products(name,brand,category,price_cents,promo,image) VALUES (?,?,?,?,?,?)`);
  stmt.run(name, brand, category, price_cents, promo ? 1 : 0, image, function () {
    res.json({ id: this.lastID });
  });
});
app.put("/api/admin/products/:id", authMiddleware, adminOnly, (req, res) => {
  const { name, brand, category, price_cents, promo = 0, image = "" } = req.body || {};
  const stmt = db.prepare(`UPDATE products SET name=?,brand=?,category=?,price_cents=?,promo=?,image=? WHERE id=?`);
  stmt.run(name, brand, category, price_cents, promo ? 1 : 0, image, req.params.id, function () {
    res.json({ updated: this.changes });
  });
});
app.delete("/api/admin/products/:id", authMiddleware, adminOnly, (req, res) => {
  const stmt = db.prepare(`DELETE FROM products WHERE id=?`);
  stmt.run(req.params.id, function () {
    res.json({ deleted: this.changes });
  });
});

// Orders
app.post("/api/orders", authMiddleware, (req, res) => {
  const { items = [], address = "" } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Order empty" });
  const total = items.reduce((acc, it) => acc + it.price_cents * it.qty, 0);
  const stmt = db.prepare(`INSERT INTO orders(user_id,total_cents,status,address) VALUES (?,?,?,?)`);
  stmt.run(req.user.id, total, "pending", address, function () {
    const orderId = this.lastID;
    const itemStmt = db.prepare(`INSERT INTO order_items(order_id,product_id,name,price_cents,qty) VALUES (?,?,?,?,?)`);
    items.forEach(i => itemStmt.run(orderId, i.product_id, i.name, i.price_cents, i.qty));
    itemStmt.finalize(() => res.json({ orderId, total_cents: total }));
  });
});

app.get("/api/orders/:userId", authMiddleware, (req, res) => {
  const userId = Number(req.params.userId);
  if (userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  db.all(`SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC`, [userId], (err, rows) => {
    res.json(rows || []);
  });
});

// Payments: simple PIX mock
const paymentTimers = new Map();
app.post("/api/payments/pix", authMiddleware, async (req, res) => {
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ error: "OrderId required" });
  db.get(`SELECT * FROM orders WHERE id=?`, [orderId], async (err, order) => {
    if (!order) return res.status(404).json({ error: "Order not found" });
    const paymentId = uuidv4();
    const payload = `000201DU-DOCES-ORDER:${orderId}|TOTAL:${(order.total_cents/100).toFixed(2)}`;
    const qrImageData = await QRCode.toDataURL(payload);
    db.run(
      `INSERT INTO payments(id,order_id,provider,method,status,qr_code,qr_image_data,checkout_url) VALUES (?,?,?,?,?,?,?,?)`,
      [paymentId, orderId, "mock", "pix", "pending", payload, qrImageData, ""],
      function () {
        const timer = setTimeout(() => {
          db.run(`UPDATE payments SET status='paid' WHERE id=?`, [paymentId]);
          db.run(`UPDATE orders SET status='paid' WHERE id=?`, [orderId]);
          paymentTimers.delete(paymentId);
        }, 20000);
        paymentTimers.set(paymentId, timer);
        res.json({ paymentId, status: "pending", qrCode: payload, qrImageData });
      }
    );
  });
});
app.get("/api/payments/status/:id", authMiddleware, (req, res) => {
  db.get(`SELECT * FROM payments WHERE id=?`, [req.params.id], (err, payment) => {
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json({ status: payment.status, orderId: payment.order_id });
  });
});


// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Serve static files from the project root.  This allows the backend to deliver
// the frontend assets (index.html, app.js, style.css, etc.) when deployed on
// Railway or another Node hosting environment.  Any route that does not match
// an API endpoint or the health check will fall back to serving index.html,
// enabling client-side routing for the SPA.
app.use(express.static(__dirname));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});