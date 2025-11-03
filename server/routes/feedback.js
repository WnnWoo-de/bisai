import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateFeedback } from '../middleware/validation.js';

const router = express.Router();

// Mock feedback storage (in a real app, you'd use a database)
const feedbacks = [];

// @route   POST /api/feedback
// @desc    Submit feedback
// @access  Private
router.post('/', authenticateToken, validateFeedback, async (req, res) => {
  try {
    const { type, subject, message, rating } = req.body;

    const feedback = {
      id: Date.now().toString(),
      user: req.user._id,
      username: req.user.username,
      type,
      subject,
      message,
      rating,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    feedbacks.push(feedback);

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback.id,
        type: feedback.type,
        subject: feedback.subject,
        status: feedback.status,
        createdAt: feedback.createdAt
      }
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      message: error.message
    });
  }
});

// @route   GET /api/feedback/my
// @desc    Get user's feedback
// @access  Private
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userFeedbacks = feedbacks
      .filter(f => f.user.toString() === req.user._id.toString())
      .map(f => ({
        id: f.id,
        type: f.type,
        subject: f.subject,
        message: f.message,
        rating: f.rating,
        status: f.status,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ feedbacks: userFeedbacks });
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({
      error: 'Failed to get feedback',
      message: error.message
    });
  }
});

export default router;