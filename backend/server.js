import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB successfully!'))
.catch((err) => console.error('MongoDB connection error:', err));

// Mongoose Schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

const DailyRecordSchema = new mongoose.Schema({
  email: { type: String, required: true },
  date: { type: String, required: true },
  goals: [{
    goalId: String,
    description: String
  }],
  reflections: [{
    goalId: String,
    assessment: String,
    reflectionText: String
  }],
  revisions: [{
    topic: String,
    sourceGoalId: String,
    reason: String
  }]
}, { timestamps: true });

// Compound index to quickly find records by email and date
DailyRecordSchema.index({ email: 1, date: 1 }, { unique: true });

const DailyRecord = mongoose.model('DailyRecord', DailyRecordSchema);

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({ email, passwordHash, name });
    await user.save();

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: { id: req.user._id, email: req.user.email, name: req.user.name }
  });
});

// Normalize date to YYYY-MM-DD
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch(e) {
    return null;
  }
}

// GET route
app.get('/api/daily-records', authMiddleware, async (req, res) => {
  try {
    // Override requested email with authenticated user's email to ensure they can only fetch their own data
    const email = req.user.email;
    const { date } = req.query;
    
    if (date) {
      const normDate = normalizeDate(date);
      if (!normDate) return res.status(400).json({ error: 'Invalid date format' });
      const record = await DailyRecord.findOne({ email, date: normDate });
      return res.json(record); // return object or null
    }

    const records = await DailyRecord.find({ email });
    res.json(records);
  } catch (error) {
    console.error('GET error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST route (Create only)
app.post('/api/daily-records', authMiddleware, async (req, res) => {
  try {
    const { date, goals, reflections, revisions } = req.body;
    // Enforce authenticated user's email
    const email = req.user.email;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const normDate = normalizeDate(date);
    if (!normDate) return res.status(400).json({ error: 'Invalid date format' });

    let record = await DailyRecord.findOne({ email, date: normDate });
    if (record) {
      return res.status(409).json({ error: 'Record already exists for this date. Use PATCH.' });
    }

    record = new DailyRecord({
      email,
      date: normDate,
      goals: Array.isArray(goals) ? goals : [],
      reflections: Array.isArray(reflections) ? reflections : [],
      revisions: Array.isArray(revisions) ? revisions : []
    });

    await record.save();
    res.status(200).json(record);
  } catch (error) {
    console.error('POST error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /goals
app.patch('/api/daily-records/:id/goals', authMiddleware, async (req, res) => {
  try {
    const { mode, goals } = req.body;
    if (!Array.isArray(goals)) return res.status(400).json({ error: 'Goals must be an array' });
    
    const record = await DailyRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    if (record.email !== req.user.email) return res.status(403).json({ error: 'Forbidden' });

    if (mode === 'override') {
      // Keep locked goals (those with a reflection)
      const reflectedGoalIds = new Set(record.reflections.map(r => r.goalId));
      const lockedGoals = record.goals.filter(g => reflectedGoalIds.has(g.goalId || g._id?.toString() || g.id));
      record.goals = [...lockedGoals, ...goals];
    } else {
      // mode === 'append' or default
      record.goals.push(...goals);
    }
    
    await record.save();
    res.status(200).json(record);
  } catch (error) {
    console.error('PATCH goals error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /reflections
app.patch('/api/daily-records/:id/reflections', authMiddleware, async (req, res) => {
  try {
    const { goalId, assessment, reflectionText } = req.body;
    if (!goalId) return res.status(400).json({ error: 'goalId is required' });
    
    const record = await DailyRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    if (record.email !== req.user.email) return res.status(403).json({ error: 'Forbidden' });

    // Reject if goal doesn't exist
    const goalExists = record.goals.some(g => (g.goalId || g._id?.toString() || g.id) === goalId);
    if (!goalExists) return res.status(400).json({ error: 'Goal ID not found in record' });

    // Reject if already reflected
    const alreadyReflected = record.reflections.some(r => r.goalId === goalId);
    if (alreadyReflected) return res.status(400).json({ error: 'Goal already has a reflection' });

    record.reflections.push({ goalId, assessment, reflectionText });

    if (assessment === 'insufficient') {
      record.revisions.push({
        topic: goalId,
        sourceGoalId: goalId,
        reason: assessment
      });
    }

    await record.save();
    res.status(200).json(record);
  } catch (error) {
    console.error('PATCH reflections error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Simple Backend running on http://localhost:${PORT}`);
});
