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

// GET route
app.get('/api/daily-records', async (req, res) => {
  try {
    const { email, date } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    let query = { email };
    if (date) query.date = date;

    const records = await DailyRecord.find(query);
    res.json(records);
  } catch (error) {
    console.error('GET error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST route (Upsert logic to merge goals/reflections into existing day)
app.post('/api/daily-records', async (req, res) => {
  try {
    const { email, date, goals, reflections, revisions } = req.body;
    
    if (!email || !date) {
      return res.status(400).json({ error: 'Email and date are required' });
    }

    // Try to find an existing record for today
    let record = await DailyRecord.findOne({ email, date });

    if (!record) {
      // Create new
      record = new DailyRecord({ email, date, goals: [], reflections: [], revisions: [] });
    }

    // Append new goals
    if (Array.isArray(goals)) {
      record.goals.push(...goals);
    }
    
    // Append new reflections
    if (Array.isArray(reflections)) {
      record.reflections.push(...reflections);
    }

    // Append new revisions
    if (Array.isArray(revisions)) {
      record.revisions.push(...revisions);
    }

    await record.save();
    res.status(200).json(record);
  } catch (error) {
    console.error('POST error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Simple Backend running on http://localhost:${PORT}`);
});
