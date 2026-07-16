import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB successfully!'))
.catch((err) => console.error('MongoDB connection error:', err));

// Mongoose Schema
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
app.get('/api/daily-records', async (req, res) => {
  try {
    const { email, date } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
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
app.post('/api/daily-records', async (req, res) => {
  try {
    const { email, date, goals, reflections, revisions } = req.body;
    
    if (!email || !date) {
      return res.status(400).json({ error: 'Email and date are required' });
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
app.patch('/api/daily-records/:id/goals', async (req, res) => {
  try {
    const { mode, goals } = req.body;
    if (!Array.isArray(goals)) return res.status(400).json({ error: 'Goals must be an array' });
    
    const record = await DailyRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

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
app.patch('/api/daily-records/:id/reflections', async (req, res) => {
  try {
    const { goalId, assessment, reflectionText } = req.body;
    if (!goalId) return res.status(400).json({ error: 'goalId is required' });
    
    const record = await DailyRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

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
