import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Mock Database Path
  const DB_PATH = path.join(__dirname, 'db.json');
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      teachers: [{ id: "1", username: "teacher", password: "password" }],
      exams: [],
      submissions: [],
      questions: []
    }, null, 2));
  }

  const getDb = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const saveDb = (data: any) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

  // --- API Routes ---

  // Auth
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const db = getDb();
    const teacher = db.teachers.find((t: any) => t.username === username && t.password === password);
    if (teacher) {
      res.json({ success: true, user: { id: teacher.id, username: teacher.username } });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Questions (Bank)
  app.get("/api/questions", (req, res) => {
    const db = getDb();
    res.json(db.questions || []);
  });

  app.post("/api/questions/import", (req, res) => {
    const db = getDb();
    if (!db.questions) db.questions = [];
    
    // Validate input
    if (!req.body.questions || !Array.isArray(req.body.questions)) {
      return res.status(400).json({ success: false, message: "Invalid question data" });
    }

    const newQuestions = req.body.questions.map((q: any) => ({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      ...q,
      createdAt: new Date().toISOString()
    }));
    
    db.questions.push(...newQuestions);
    saveDb(db);
    res.json({ success: true, count: newQuestions.length });
  });

  app.delete("/api/questions/:id", (req, res) => {
    const { id } = req.params;
    const db = getDb();
    if (!db.questions) db.questions = [];
    
    const initialLength = db.questions.length;
    db.questions = db.questions.filter((q: any) => q.id !== id);
    
    if (db.questions.length < initialLength) {
      saveDb(db);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Question not found" });
    }
  });

  // Exams
  app.get("/api/exams", (req, res) => {
    const db = getDb();
    res.json(db.exams);
  });

  app.post("/api/exams", (req, res) => {
    const db = getDb();
    const newExam = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    db.exams.push(newExam);
    saveDb(db);
    res.json(newExam);
  });

  app.put("/api/exams/:id", (req, res) => {
    const db = getDb();
    const index = db.exams.findIndex((e: any) => e.id === req.params.id);
    if (index !== -1) {
      db.exams[index] = { ...db.exams[index], ...req.body };
      saveDb(db);
      res.json(db.exams[index]);
    } else {
      res.status(404).json({ message: "Exam not found" });
    }
  });

  app.delete("/api/exams/:id", (req, res) => {
    const db = getDb();
    db.exams = db.exams.filter((e: any) => e.id !== req.params.id);
    db.submissions = db.submissions.filter((s: any) => s.examId !== req.params.id);
    saveDb(db);
    res.json({ success: true });
  });

  // Submissions
  app.get("/api/submissions", (req, res) => {
    const db = getDb();
    res.json(db.submissions);
  });

  app.post("/api/submissions", (req, res) => {
    const db = getDb();
    const newSubmission = {
      id: Date.now().toString(),
      ...req.body,
      processedAt: new Date().toISOString()
    };
    db.submissions.push(newSubmission);
    saveDb(db);
    res.json(newSubmission);
  });

  app.put("/api/submissions/:id", (req, res) => {
    const db = getDb();
    const index = db.submissions.findIndex((s: any) => s.id === req.params.id);
    if (index !== -1) {
      db.submissions[index] = { ...db.submissions[index], ...req.body };
      saveDb(db);
      res.json(db.submissions[index]);
    } else {
      res.status(404).json({ message: "Submission not found" });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
