import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// Initialize Gemini SDK lazily with telemetry header to prevent crashes at module load
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

const JWT_SECRET = process.env.JWT_SECRET || "policysync-super-secret-key-2026";
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const isVercel = process.env.VERCEL === "1" || !!process.env.NOW_REGION;

function safeWriteDBFile(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Warning: Could not write database backup file locally:", err);
  }
}

// Define schema interfaces for JSON DB
interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "Agent" | "Agency Admin";
  agency_name: string;
  whatsapp_number: string;
  subscription_status: "trial" | "active" | "expired";
  trial_start_date: string; // YYYY-MM-DD
  trial_end_date: string; // YYYY-MM-DD
  razorpay_subscription_id: string;
  created_at: string;
}

interface Client {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  pan_number: string;
  aadhaar_number: string;
  nominee_name: string;
  notes: string;
  created_at: string;
}

interface Policy {
  id: string;
  user_id: string;
  client_id: string;
  policy_type: string;
  insurance_company: string;
  policy_number: string;
  premium_amount: number;
  payment_frequency: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly";
  start_date: string;
  expiry_date: string;
  renewal_date: string;
  commission_percentage: number;
  document_url: string;
  extracted_data_json: string; // Raw extraction details
  status: "Active" | "Expired" | "Pending Renewal";
  created_at: string;
}

interface DB {
  users: User[];
  clients: Client[];
  policies: Policy[];
}

// Ensure database directory and file exist
if (!isVercel && !fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Warning: Could not create DATA_DIR locally:", err);
  }
}

// Initialize Supabase Client (supporting secret keys and anon keys with proper fallback)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// High performance cached in-memory database
let cachedDB: DB | null = null;

function generateSeedDB(): DB {
  const hashedDemoPassword = bcrypt.hashSync("password123", 10);
  const today = new Date();
  const expiry = new Date();
  expiry.setDate(today.getDate() + 15);

  return {
    users: [
      {
        id: "demo-user-id",
        name: "Demo Agent",
        email: "agent@policysync.in",
        password_hash: hashedDemoPassword,
        role: "Agent",
        agency_name: "Sync Protection Group",
        whatsapp_number: "+919876543210",
        subscription_status: "trial",
        trial_start_date: today.toISOString().split("T")[0],
        trial_end_date: expiry.toISOString().split("T")[0],
        razorpay_subscription_id: "",
        created_at: today.toISOString(),
      },
    ],
    clients: [
      {
        id: "demo-client-1",
        user_id: "demo-user-id",
        full_name: "Amit Sharma",
        phone: "+919812345678",
        email: "amit.sharma@example.com",
        address: "102, Shanti Vihar, Sector 4, Gurgaon, Haryana",
        pan_number: "ABCPS1234D",
        aadhaar_number: "1234-5678-9012",
        nominee_name: "Suman Sharma (Wife)",
        notes: "Prefers updates via WhatsApp in the mornings.",
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-client-2",
        user_id: "demo-user-id",
        full_name: "Priya Patel",
        phone: "+919922334455",
        email: "priya.patel@example.com",
        address: "A-405, Neelkanth Heights, Thane West, Mumbai",
        pan_number: "XYZPK9876Q",
        aadhaar_number: "9876-5432-1098",
        nominee_name: "Rohan Patel (Son)",
        notes: "Requested a health insurance cover update.",
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    policies: [
      {
        id: "demo-policy-1",
        user_id: "demo-user-id",
        client_id: "demo-client-1",
        policy_type: "Term Life Insurance",
        insurance_company: "HDFC Ergo",
        policy_number: "TL-89472-A",
        premium_amount: 15400,
        payment_frequency: "Yearly",
        start_date: "2025-07-07",
        expiry_date: "2026-07-07", // Expiry in 7 days (near current local date June 30, 2026)
        renewal_date: "2026-07-07",
        commission_percentage: 15,
        document_url: "",
        extracted_data_json: "{}",
        status: "Pending Renewal",
        created_at: new Date(Date.now() - 360 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-policy-2",
        user_id: "demo-user-id",
        client_id: "demo-client-2",
        policy_type: "Family Floater Health",
        insurance_company: "Star Health Insurance",
        policy_number: "SH-90321-B",
        premium_amount: 24500,
        payment_frequency: "Yearly",
        start_date: "2025-07-30",
        expiry_date: "2026-07-30", // Expiry in 30 days
        renewal_date: "2026-07-30",
        commission_percentage: 12,
        document_url: "",
        extracted_data_json: "{}",
        status: "Active",
        created_at: new Date(Date.now() - 330 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };
}

function loadLocalDB(): DB {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    } catch (e) {
      console.error("Error reading local db.json:", e);
    }
  }
  const seed = generateSeedDB();
  safeWriteDBFile(seed);
  return seed;
}

async function initializeDatabase() {
  if (!supabase) {
    console.log("Supabase client is not configured. Standard local JSON file database loaded.");
    cachedDB = loadLocalDB();
    return;
  }

  console.log("Initializing database connection with Supabase...");

  try {
    // 1. Try fetching from Supabase Table "policysync_state"
    const { data: tableData, error: tableError } = await supabase
      .from("policysync_state")
      .select("value")
      .eq("id", "db_json")
      .maybeSingle();

    if (!tableError && tableData?.value) {
      cachedDB = tableData.value as DB;
      console.log("Successfully loaded database from Supabase Table 'policysync_state'!");
      safeWriteDBFile(cachedDB);
      return;
    }

    if (tableError) {
      console.log("Supabase table query returned error (table might not exist yet):", tableError.message);
    }

    // 2. Fallback to Supabase Storage bucket 'database'
    console.log("Trying Supabase Storage bucket 'database'...");
    try {
      const { data: fileData, error: fileError } = await supabase.storage
        .from("database")
        .download("db.json");

      if (!fileError && fileData) {
        const text = await fileData.text();
        cachedDB = JSON.parse(text);
        console.log("Successfully loaded database from Supabase Storage bucket 'database'!");
        safeWriteDBFile(cachedDB);
        return;
      } else if (fileError) {
        console.log("Supabase storage query returned error:", fileError.message);
      }
    } catch (storageErr) {
      console.error("Failed to read from Supabase Storage:", storageErr);
    }

    // 3. Complete Fallback: Load from local JSON and try to write it to Supabase so it is synchronized
    console.log("Could not find database state in Supabase. Loading from local database...");
    cachedDB = loadLocalDB();

    // Try to sync/upsert to Supabase so next time it is loaded from Supabase
    await persistToSupabase(cachedDB);
  } catch (err) {
    console.error("Unexpected error during Supabase initialization. Falling back to local db.json:", err);
    cachedDB = loadLocalDB();
  }
}

async function persistToSupabase(data: DB) {
  if (!supabase) return;

  // 1. Try saving to Supabase Table "policysync_state"
  try {
    const { error: tableError } = await supabase
      .from("policysync_state")
      .upsert({ id: "db_json", value: data, updated_at: new Date().toISOString() });

    if (!tableError) {
      console.log("Successfully persisted database to Supabase Table 'policysync_state'!");
      return;
    } else {
      console.log("Failed to persist to table (may not exist), trying Storage:", tableError.message);
    }
  } catch (err) {
    console.warn("Table persistence exception, trying storage fallback:", err);
  }

  // 2. Try saving to Supabase Storage bucket
  try {
    // Create the bucket (safe to call even if it already exists)
    await supabase.storage.createBucket("database", { public: false }).catch(() => {});
    
    // Upload the file
    const fileBuffer = Buffer.from(JSON.stringify(data, null, 2));
    const { error: storageError } = await supabase.storage
      .from("database")
      .upload("db.json", fileBuffer, {
        contentType: "application/json",
        upsert: true,
      });

    if (!storageError) {
      console.log("Successfully persisted database to Supabase Storage bucket 'database'!");
    } else {
      console.error("Failed to persist database to Supabase Storage:", storageError.message);
    }
  } catch (err) {
    console.error("Storage persistence exception:", err);
  }
}

function loadDB(): DB {
  if (cachedDB) {
    return cachedDB;
  }
  return loadLocalDB();
}

function saveDB(data: DB) {
  cachedDB = data;
  
  // Write to local file synchronously as a backup
  safeWriteDBFile(data);

  // Async upload to Supabase
  persistToSupabase(data).catch((err) => {
    console.error("Failed to persist database to Supabase asynchronously:", err);
  });
}

let expressAppInstance: express.Express | null = null;
let databaseInitialized = false;

export async function getApp(): Promise<express.Express> {
  if (expressAppInstance) {
    return expressAppInstance;
  }

  if (!databaseInitialized) {
    await initializeDatabase();
    databaseInitialized = true;
  }

  const app = express();

  // Enable CORS for all origins and headers to allow external clients like Vercel
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Alias middleware for API paths to ensure compatibility with both /api/login and /api/auth/login
  app.use((req, res, next) => {
    const urlPath = req.url.split("?")[0];
    if (urlPath === "/api/login" || urlPath === "/api/login/") {
      req.url = req.url.replace("/api/login", "/api/auth/login");
    } else if (urlPath === "/api/signup" || urlPath === "/api/signup/") {
      req.url = req.url.replace("/api/signup", "/api/auth/signup");
    } else if (urlPath === "/api/me" || urlPath === "/api/me/") {
      req.url = req.url.replace("/api/me", "/api/auth/me");
    }
    next();
  });

  // Use JSON payload size limit for high resolution policy photo uploads
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Helper: check if trial expired
  const checkTrialStatus = (user: User): "trial" | "active" | "expired" => {
    if (user.subscription_status === "active") {
      return "active";
    }
    const today = new Date();
    const trialEnd = new Date(user.trial_end_date);
    if (today > trialEnd) {
      return "expired";
    }
    return "trial";
  };

  // JWT Middleware for authentication and row-level isolation
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token is missing" });
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }

      const db = loadDB();
      const user = db.users.find((u) => u.id === decoded.userId);
      if (!user) {
        return res.status(404).json({ error: "Authenticated user not found" });
      }

      // Check and update trial status dynamically
      const currentStatus = checkTrialStatus(user);
      if (user.subscription_status !== currentStatus) {
        user.subscription_status = currentStatus;
        saveDB(db);
      }

      req.user = user;
      next();
    });
  };

  // Middleware to enforce active/trial status (blocks modification features on expired trial)
  const requireActiveOrTrial = (req: any, res: any, next: any) => {
    if (req.user.subscription_status === "expired") {
      return res.status(403).json({
        error: "Your 15-day free trial has expired. Please upgrade to a paid plan to resume full operations.",
        trialExpired: true,
      });
    }
    next();
  };

  // --- API ROUTES ---

  // Auth: Signup
  app.post("/api/auth/signup", (req, res) => {
    const { name, email, password, role, agencyName, whatsappNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const db = loadDB();
    const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 15);

    const newUser: User = {
      id: "user_" + Math.random().toString(36).substr(2, 9),
      name,
      email: email.toLowerCase(),
      password_hash: bcrypt.hashSync(password, 10),
      role: role === "Agency Admin" ? "Agency Admin" : "Agent",
      agency_name: agencyName || "Independent Agent",
      whatsapp_number: whatsappNumber || "",
      subscription_status: "trial",
      trial_start_date: today.toISOString().split("T")[0],
      trial_end_date: expiry.toISOString().split("T")[0],
      razorpay_subscription_id: "",
      created_at: today.toISOString(),
    };

    db.users.push(newUser);
    saveDB(db);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        agency_name: newUser.agency_name,
        whatsapp_number: newUser.whatsapp_number,
        subscription_status: newUser.subscription_status,
        trial_start_date: newUser.trial_start_date,
        trial_end_date: newUser.trial_end_date,
      },
    });
  });

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = loadDB();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Refresh subscription status
    const currentStatus = checkTrialStatus(user);
    if (user.subscription_status !== currentStatus) {
      user.subscription_status = currentStatus;
      saveDB(db);
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        agency_name: user.agency_name,
        whatsapp_number: user.whatsapp_number,
        subscription_status: user.subscription_status,
        trial_start_date: user.trial_start_date,
        trial_end_date: user.trial_end_date,
      },
    });
  });

  // Auth: Me profile context
  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        agency_name: req.user.agency_name,
        whatsapp_number: req.user.whatsapp_number,
        subscription_status: req.user.subscription_status,
        trial_start_date: req.user.trial_start_date,
        trial_end_date: req.user.trial_end_date,
        razorpay_subscription_id: req.user.razorpay_subscription_id,
      },
    });
  });

  // Auth: Update Profile Settings
  app.put("/api/auth/update", authenticateToken, (req: any, res) => {
    const { name, agency_name, whatsapp_number, password } = req.body;
    const db = loadDB();
    const userIndex = db.users.findIndex((u) => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name) db.users[userIndex].name = name;
    if (agency_name) db.users[userIndex].agency_name = agency_name;
    if (whatsapp_number) db.users[userIndex].whatsapp_number = whatsapp_number;
    if (password) {
      db.users[userIndex].password_hash = bcrypt.hashSync(password, 10);
    }

    saveDB(db);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: db.users[userIndex].id,
        name: db.users[userIndex].name,
        email: db.users[userIndex].email,
        role: db.users[userIndex].role,
        agency_name: db.users[userIndex].agency_name,
        whatsapp_number: db.users[userIndex].whatsapp_number,
        subscription_status: db.users[userIndex].subscription_status,
        trial_start_date: db.users[userIndex].trial_start_date,
        trial_end_date: db.users[userIndex].trial_end_date,
      },
    });
  });

  // Auth: Reset Trial / Upgrade (Simulated Razorpay transaction / plan webhook activation)
  app.post("/api/auth/upgrade", authenticateToken, (req: any, res) => {
    const { planId, subscriptionId } = req.body;
    const db = loadDB();
    const userIndex = db.users.findIndex((u) => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    db.users[userIndex].subscription_status = "active";
    db.users[userIndex].razorpay_subscription_id = subscriptionId || "sub_sim_" + Math.random().toString(36).substr(2, 9);
    saveDB(db);

    res.json({
      message: "Successfully upgraded to premium active subscription",
      user: {
        id: db.users[userIndex].id,
        name: db.users[userIndex].name,
        email: db.users[userIndex].email,
        role: db.users[userIndex].role,
        agency_name: db.users[userIndex].agency_name,
        whatsapp_number: db.users[userIndex].whatsapp_number,
        subscription_status: db.users[userIndex].subscription_status,
        trial_start_date: db.users[userIndex].trial_start_date,
        trial_end_date: db.users[userIndex].trial_end_date,
        razorpay_subscription_id: db.users[userIndex].razorpay_subscription_id,
      },
    });
  });

  // Clients: GET List
  app.get("/api/clients", authenticateToken, (req: any, res) => {
    const db = loadDB();
    // Row-level data isolation
    const clients = db.clients.filter((c) => c.user_id === req.user.id);
    res.json(clients);
  });

  // Clients: POST Create
  app.post("/api/clients", authenticateToken, requireActiveOrTrial, (req: any, res) => {
    const { full_name, phone, email, address, pan_number, aadhaar_number, nominee_name, notes } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ error: "Client full name and phone number are required" });
    }

    const db = loadDB();
    const newClient: Client = {
      id: "client_" + Math.random().toString(36).substr(2, 9),
      user_id: req.user.id,
      full_name,
      phone,
      email: email || "",
      address: address || "",
      pan_number: pan_number || "",
      aadhaar_number: aadhaar_number || "",
      nominee_name: nominee_name || "",
      notes: notes || "",
      created_at: new Date().toISOString(),
    };

    db.clients.push(newClient);
    saveDB(db);

    res.status(201).json(newClient);
  });

  // Clients: PUT Update
  app.put("/api/clients/:id", authenticateToken, requireActiveOrTrial, (req: any, res) => {
    const { full_name, phone, email, address, pan_number, aadhaar_number, nominee_name, notes } = req.body;
    const db = loadDB();

    const clientIndex = db.clients.findIndex((c) => c.id === req.params.id && c.user_id === req.user.id);
    if (clientIndex === -1) {
      return res.status(404).json({ error: "Client not found or access denied" });
    }

    const updatedClient = {
      ...db.clients[clientIndex],
      full_name: full_name || db.clients[clientIndex].full_name,
      phone: phone || db.clients[clientIndex].phone,
      email: email !== undefined ? email : db.clients[clientIndex].email,
      address: address !== undefined ? address : db.clients[clientIndex].address,
      pan_number: pan_number !== undefined ? pan_number : db.clients[clientIndex].pan_number,
      aadhaar_number: aadhaar_number !== undefined ? aadhaar_number : db.clients[clientIndex].aadhaar_number,
      nominee_name: nominee_name !== undefined ? nominee_name : db.clients[clientIndex].nominee_name,
      notes: notes !== undefined ? notes : db.clients[clientIndex].notes,
    };

    db.clients[clientIndex] = updatedClient;
    saveDB(db);

    res.json(updatedClient);
  });

  // Clients: DELETE Client (and cascade delete their policies)
  app.delete("/api/clients/:id", authenticateToken, requireActiveOrTrial, (req: any, res) => {
    const db = loadDB();

    const clientIndex = db.clients.findIndex((c) => c.id === req.params.id && c.user_id === req.user.id);
    if (clientIndex === -1) {
      return res.status(404).json({ error: "Client not found or access denied" });
    }

    // Remove client
    db.clients.splice(clientIndex, 1);

    // Cascade remove policies
    db.policies = db.policies.filter((p) => p.client_id !== req.params.id || p.user_id !== req.user.id);

    saveDB(db);

    res.json({ message: "Client and associated policies deleted successfully" });
  });

  // Policies: GET List
  app.get("/api/policies", authenticateToken, (req: any, res) => {
    const db = loadDB();
    // Row-level data isolation
    const policies = db.policies.filter((p) => p.user_id === req.user.id);
    res.json(policies);
  });

  // Policies: POST Create
  app.post("/api/policies", authenticateToken, requireActiveOrTrial, (req: any, res) => {
    const {
      client_id,
      policy_type,
      insurance_company,
      policy_number,
      premium_amount,
      payment_frequency,
      start_date,
      expiry_date,
      renewal_date,
      commission_percentage,
      document_url,
      extracted_data_json,
    } = req.body;

    if (!client_id || !policy_type || !insurance_company || !policy_number || !premium_amount) {
      return res.status(400).json({ error: "Required policy fields are missing" });
    }

    const db = loadDB();
    // Verify client belongs to user
    const clientExists = db.clients.some((c) => c.id === client_id && c.user_id === req.user.id);
    if (!clientExists) {
      return res.status(404).json({ error: "Invalid client selection or access denied" });
    }

    // Compute status automatically
    const expiry = new Date(expiry_date);
    const today = new Date();
    const timeDiff = expiry.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 360 * 24));
    let status: "Active" | "Expired" | "Pending Renewal" = "Active";

    if (daysDiff < 0) {
      status = "Expired";
    } else if (daysDiff <= 30) {
      status = "Pending Renewal";
    }

    const newPolicy: Policy = {
      id: "policy_" + Math.random().toString(36).substr(2, 9),
      user_id: req.user.id,
      client_id,
      policy_type,
      insurance_company,
      policy_number,
      premium_amount: parseFloat(premium_amount) || 0,
      payment_frequency: payment_frequency || "Yearly",
      start_date: start_date || "",
      expiry_date: expiry_date || "",
      renewal_date: renewal_date || expiry_date || "",
      commission_percentage: parseFloat(commission_percentage) || 0,
      document_url: document_url || "",
      extracted_data_json: extracted_data_json || "{}",
      status,
      created_at: new Date().toISOString(),
    };

    db.policies.push(newPolicy);
    saveDB(db);

    res.status(201).json(newPolicy);
  });

  // Policies: PUT Update
  app.put("/api/policies/:id", authenticateToken, requireActiveOrTrial, (req: any, res) => {
    const db = loadDB();

    const policyIndex = db.policies.findIndex((p) => p.id === req.params.id && p.user_id === req.user.id);
    if (policyIndex === -1) {
      return res.status(404).json({ error: "Policy not found or access denied" });
    }

    const {
      policy_type,
      insurance_company,
      policy_number,
      premium_amount,
      payment_frequency,
      start_date,
      expiry_date,
      renewal_date,
      commission_percentage,
      document_url,
      status: customStatus,
    } = req.body;

    // Auto-update status unless explicitly passed and overridden
    const computedExpiryDate = expiry_date || db.policies[policyIndex].expiry_date;
    const expiry = new Date(computedExpiryDate);
    const today = new Date();
    const timeDiff = expiry.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 360 * 24));
    let status: "Active" | "Expired" | "Pending Renewal" = "Active";

    if (daysDiff < 0) {
      status = "Expired";
    } else if (daysDiff <= 30) {
      status = "Pending Renewal";
    }

    if (customStatus) {
      status = customStatus;
    }

    const updatedPolicy = {
      ...db.policies[policyIndex],
      policy_type: policy_type || db.policies[policyIndex].policy_type,
      insurance_company: insurance_company || db.policies[policyIndex].insurance_company,
      policy_number: policy_number || db.policies[policyIndex].policy_number,
      premium_amount: premium_amount !== undefined ? parseFloat(premium_amount) : db.policies[policyIndex].premium_amount,
      payment_frequency: payment_frequency || db.policies[policyIndex].payment_frequency,
      start_date: start_date || db.policies[policyIndex].start_date,
      expiry_date: computedExpiryDate,
      renewal_date: renewal_date || computedExpiryDate,
      commission_percentage: commission_percentage !== undefined ? parseFloat(commission_percentage) : db.policies[policyIndex].commission_percentage,
      document_url: document_url !== undefined ? document_url : db.policies[policyIndex].document_url,
      status,
    };

    db.policies[policyIndex] = updatedPolicy;
    saveDB(db);

    res.json(updatedPolicy);
  });

  // Policies: DELETE
  app.delete("/api/policies/:id", authenticateToken, requireActiveOrTrial, (req: any, res) => {
    const db = loadDB();

    const policyIndex = db.policies.findIndex((p) => p.id === req.params.id && p.user_id === req.user.id);
    if (policyIndex === -1) {
      return res.status(404).json({ error: "Policy not found or access denied" });
    }

    db.policies.splice(policyIndex, 1);
    saveDB(db);

    res.json({ message: "Policy deleted successfully" });
  });

  // OCR SCANNING: Gemini 3.5 Flash Policy OCR Extraction
  app.post("/api/policies/ocr", authenticateToken, requireActiveOrTrial, async (req: any, res) => {
    const { base64Data, mimeType } = req.body;

    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: "Missing document file payload or MIME type" });
    }

    try {
      // Prompt designed to force precise JSON structured output matching our schema
      const promptText = `Analyze this insurance policy document and extract the key details with high accuracy.
If some fields are blurry, incomplete, or missing, formulate your best guess from standard insurance records, or return empty/default values where appropriate. Do not make up fake policy numbers or names if they are completely unidentifiable.

Please extract the following structured properties:
- policyNumber (String)
- customerName (String)
- insuranceCompany (String, e.g. "LIC of India", "HDFC Ergo", "Star Health Insurance", "ICICI Lombard", etc.)
- premiumAmount (Number, ignore currency symbols, extract numeric value only)
- paymentFrequency (Enum: "Monthly", "Quarterly", "Half-Yearly", "Yearly")
- startDate (String, format as YYYY-MM-DD)
- expiryDate (String, format as YYYY-MM-DD)
- policyType (String, e.g., "Term Life Insurance", "Family Floater Health", "Comprehensive Motor", "Personal Accident")
- sumAssured (Number, numeric amount only)

Please ensure the response matches the provided schema perfectly.`;

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const response = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, { text: promptText }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              policyNumber: { type: Type.STRING },
              customerName: { type: Type.STRING },
              insuranceCompany: { type: Type.STRING },
              premiumAmount: { type: Type.NUMBER },
              paymentFrequency: {
                type: Type.STRING,
                enum: ["Monthly", "Quarterly", "Half-Yearly", "Yearly"],
              },
              startDate: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              policyType: { type: Type.STRING },
              sumAssured: { type: Type.NUMBER },
            },
            required: ["policyNumber", "customerName", "insuranceCompany", "premiumAmount"],
          },
        },
      });

      const extractedText = response.text;
      if (!extractedText) {
        throw new Error("No text returned from Gemini extraction model.");
      }

      const parsedJSON = JSON.parse(extractedText.trim());
      res.json({
        success: true,
        extracted_data: parsedJSON,
        raw_json_str: extractedText,
      });
    } catch (error: any) {
      console.error("Gemini OCR extraction failed:", error);
      res.status(500).json({
        error: "AI scanning failed to process this document. Please check the image quality or enter fields manually.",
        details: error.message,
      });
    }
  });

  // AI MESSAGE GENERATOR: Gemini 3.5 Flash reminder copy generator
  app.post("/api/messages/generate", authenticateToken, requireActiveOrTrial, async (req: any, res) => {
    const { clientName, policyType, policyNumber, renewalDate, premiumAmount, type, tone } = req.body;

    if (!clientName || !policyType || !policyNumber || !renewalDate) {
      return res.status(400).json({ error: "Missing client or policy variables for generating notification template" });
    }

    try {
      const typeLabel = type || "Renewal Reminder"; // Renewal Reminder, Premium Due Reminder, Upsell Suggestion, Custom Message
      const toneLabel = tone || "Professional"; // Professional, Friendly, Urgent, Premium
      const agencyName = req.user.agency_name || "Sync Insurance Protection";

      const promptText = `You are the core AI copywriting module of policysync.in, a premium CRM SaaS for insurance agents in India.
Your task is to draft a personalized, high-conversion reminder message for a client that will be sent via WhatsApp.

Variables to interpolate:
- Client Name: ${clientName}
- Policy Type: ${policyType}
- Policy Number: ${policyNumber}
- Expiry / Renewal Date: ${renewalDate}
- Premium Amount: ₹${premiumAmount || "N/A"}
- Agency Name: ${agencyName}

Message Type: ${typeLabel}
Communication Tone: ${toneLabel}

Guidelines:
1. Make the message concise, friendly, and easy to read in a single glance on WhatsApp (max 3-4 short lines).
2. Incorporate custom emojis naturally (e.g., 🛡️, 🔔, ✍️, ☕) to match the selected tone.
3. Clearly state the action step the client needs to take (e.g., "Reply here or tap link to renew instantly").
4. Always end by signing off professionally on behalf of "${agencyName}".
5. Never output instructions, conversational preambles, or brackets. Only output the actual message text ready to copy or send.`;

      const response = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No text returned from Gemini assistant copywriting model.");
      }

      res.json({
        success: true,
        message: resultText.trim(),
      });
    } catch (error: any) {
      console.error("Gemini reminder copywriting failed:", error);
      res.status(500).json({
        error: "AI message generator failed to construct copy. Please write the message manually or retry.",
        details: error.message,
      });
    }
  });

  // DASHBOARD SUMMARY ENDPOINT
  app.get("/api/dashboard/summary", authenticateToken, (req: any, res) => {
    const db = loadDB();
    const userId = req.user.id;

    const clients = db.clients.filter((c) => c.user_id === userId);
    const policies = db.policies.filter((p) => p.user_id === userId);

    const totalClients = clients.length;
    const totalActivePolicies = policies.filter((p) => p.status === "Active").length;

    // Detect expiring policies in 7 days vs 30 days
    const today = new Date();
    let expiringIn7DaysCount = 0;
    let expiringIn30DaysCount = 0;
    const alertList: any[] = [];

    policies.forEach((p) => {
      const client = clients.find((c) => c.id === p.client_id);
      if (!p.expiry_date) return;

      const expiry = new Date(p.expiry_date);
      const timeDiff = expiry.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 360 * 24));

      if (daysDiff >= 0) {
        if (daysDiff <= 7) {
          expiringIn7DaysCount++;
          alertList.push({
            policyId: p.id,
            clientName: client ? client.full_name : "Unknown",
            clientPhone: client ? client.phone : "",
            policyType: p.policy_type,
            policyNumber: p.policy_number,
            insuranceCompany: p.insurance_company,
            expiryDate: p.expiry_date,
            premiumAmount: p.premium_amount,
            daysLeft: daysDiff,
            severity: "critical", // red
          });
        } else if (daysDiff <= 30) {
          expiringIn30DaysCount++;
          alertList.push({
            policyId: p.id,
            clientName: client ? client.full_name : "Unknown",
            clientPhone: client ? client.phone : "",
            policyType: p.policy_type,
            policyNumber: p.policy_number,
            insuranceCompany: p.insurance_company,
            expiryDate: p.expiry_date,
            premiumAmount: p.premium_amount,
            daysLeft: daysDiff,
            severity: "warning", // yellow
          });
        }
      } else {
        // Expired already
        if (p.status !== "Expired") {
          p.status = "Expired";
        }
      }
    });

    // Monthly expected commission = sum(premium_amount * commission_percentage / 100)
    // Group by frequency or simple aggregate
    const expectedCommission = policies.reduce((acc, p) => {
      if (p.status === "Expired") return acc;
      const annualPremium = p.premium_amount; // simplified to raw premium amount as baseline
      const commission = (annualPremium * (p.commission_percentage || 10)) / 100;
      return acc + commission;
    }, 0);

    res.json({
      totalClients,
      activePoliciesCount: policies.filter((p) => p.status === "Active" || p.status === "Pending Renewal").length,
      expiringIn7DaysCount,
      expiringIn30DaysCount,
      monthlyExpectedCommission: Math.round(expectedCommission),
      alertList,
    });
  });

  // REPORTS & ANALYTICS DATA ENDPOINT
  app.get("/api/dashboard/reports", authenticateToken, (req: any, res) => {
    const db = loadDB();
    const userId = req.user.id;

    const policies = db.policies.filter((p) => p.user_id === userId);

    // Total Premium Under Management
    const premiumUnderManagement = policies.reduce((sum, p) => {
      if (p.status === "Expired") return sum;
      return sum + p.premium_amount;
    }, 0);

    // Policy distribution chart format
    const distMap: { [key: string]: number } = {};
    policies.forEach((p) => {
      distMap[p.policy_type] = (distMap[p.policy_type] || 0) + 1;
    });
    const policyDistribution = Object.keys(distMap).map((key) => ({
      name: key,
      value: distMap[key],
    }));

    // Monthly forecasts (Simple premium flow based on expiry date month)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const premiumForecast = monthNames.map((month, idx) => {
      // Find policies expiring or renewing in this month
      const matchingPolicies = policies.filter((p) => {
        if (!p.expiry_date) return false;
        const expDate = new Date(p.expiry_date);
        return expDate.getMonth() === idx;
      });

      const totalPremium = matchingPolicies.reduce((sum, p) => sum + p.premium_amount, 0);
      const totalCommission = matchingPolicies.reduce((sum, p) => sum + (p.premium_amount * (p.commission_percentage || 10)) / 100, 0);

      return {
        month,
        premium: totalPremium,
        commission: Math.round(totalCommission),
      };
    });

    // Commission Tracker History (aggregate last 6 months based on policy creation or renewal)
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mLabel = monthNames[d.getMonth()];
      const mIdx = d.getMonth();

      // Find policy lists expiring or registered in this month
      const matching = policies.filter((p) => {
        const pDate = new Date(p.created_at);
        return pDate.getMonth() === mIdx;
      });

      const commSum = matching.reduce((sum, p) => sum + (p.premium_amount * (p.commission_percentage || 12)) / 100, 0);
      last6Months.push({
        month: mLabel,
        commission: Math.round(commSum) || 12000 + i * 1500, // Seed safe demo chart values if database is fresh
      });
    }

    res.json({
      premiumUnderManagement,
      policyDistribution: policyDistribution.length > 0 ? policyDistribution : [{ name: "Life", value: 4 }, { name: "Health", value: 3 }, { name: "Motor", value: 2 }],
      monthlyForecast: premiumForecast,
      commissionHistory: last6Months,
    });
  });

  expressAppInstance = app;
  return app;
}

if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  getApp().then(async (app) => {
    // --- DEV / PRODUCTION INTEGRATION WITH VITE ---
    if (process.env.NODE_ENV !== "production") {
      const viteModuleName = "vite";
      const { createServer: createViteServer } = await import(viteModuleName);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`policysync.in server running securely on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error("Critical: Failed to launch full-stack Express server:", err);
  });
}
