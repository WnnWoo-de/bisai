import express from 'express';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { validateActivity } from '../middleware/validation.js';

const router = express.Router();

// @route   POST /api/activities
// @desc    Create a new activity
// @access  Private
router.post('/', authenticateToken, validateActivity, async (req, res) => {
  try {
    const { type, category, description, carbonSaved, points, duration, location, tags, images } = req.body;

    const activity = new Activity({
      user: req.user._id,
      type,
      category,
      description,
      carbonSaved,
      points,
      duration,
      location,
      tags,
      images
    });

    await activity.save();

    // Update user stats
    const user = await User.findById(req.user._id);
    user.totalCarbonSaved += carbonSaved;
    await user.addPoints(points, 'Activity completion');
    await user.updateStreak();

    // Check for new achievements
    const newAchievements = await Achievement.checkUserAchievements(req.user._id);

    // Populate activity with user info
    await activity.populate('user', 'username avatar');

    res.status(201).json({
      message: 'Activity created successfully',
      activity,
      newAchievements: newAchievements.length > 0 ? newAchievements : undefined
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({
      error: 'Failed to create activity',
      message: error.message
    });
  }
});

// @route   GET /api/activities
// @desc    Get activities (with pagination and filters)
// @access  Public (with optional auth for personalized content)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Build query
    const query = { isPublic: true };

    if (type) query.type = type;
    if (category) query.category = category;
    if (userId) query.user = userId;
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const activities = await Activity.find(query)
      .populate('user', 'username avatar level')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Activity.countDocuments(query);

    // Add user interaction info if authenticated
    if (req.user) {
      for (const activity of activities) {
        activity.isLiked = activity.likes.some(like => 
          like.user.toString() === req.user._id.toString()
        );
      }
    }

    res.json({
      activities,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limitNum),
        total,
        hasNext: skip + limitNum < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      error: 'Failed to get activities',
      message: error.message
    });
  }
});

// @route   GET /api/activities/my
// @desc    Get current user's activities
// @access  Private
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const query = { user: req.user._id };
    if (type) query.type = type;
    if (category) query.category = category;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const activities = await Activity.find(query)
      .populate('user', 'username avatar level')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Activity.countDocuments(query);

    res.json({
      activities,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limitNum),
        total,
        hasNext: skip + limitNum < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get my activities error:', error);
    res.status(500).json({
      error: 'Failed to get activities',
      message: error.message
    });
  }
});

// @route   GET /api/activities/stats
// @desc    Get activity statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await Activity.getStats(req.user._id, startDate, endDate);
    
    res.json({
      stats: stats[0] || {
        byType: [],
        totalActivities: 0,
        totalCarbonSaved: 0,
        totalPoints: 0
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      error: 'Failed to get activity statistics',
      message: error.message
    });
  }
});

// @route   GET /api/activities/:id
// @desc    Get single activity
// @access  Public (with optional auth)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('user', 'username avatar level')
      .populate('comments.user', 'username avatar');

    if (!activity) {
      return res.status(404).json({
        error: 'Activity not found'
      });
    }

    // Check if activity is public or user owns it
    if (!activity.isPublic && (!req.user || activity.user._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Add user interaction info if authenticated
    if (req.user) {
      activity.isLiked = activity.likes.some(like => 
        like.user.toString() === req.user._id.toString()
      );
    }

    res.json({ activity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      error: 'Failed to get activity',
      message: error.message
    });
  }
});

// @route   PUT /api/activities/:id
// @desc    Update activity
// @access  Private (owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        error: 'Activity not found'
      });
    }

    // Check ownership
    if (activity.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const { description, location, tags, images, isPublic } = req.body;

    // Update allowed fields
    if (description !== undefined) activity.description = description;
    if (location !== undefined) activity.location = location;
    if (tags !== undefined) activity.tags = tags;
    if (images !== undefined) activity.images = images;
    if (isPublic !== undefined) activity.isPublic = isPublic;

    await activity.save();
    await activity.populate('user', 'username avatar level');

    res.json({
      message: 'Activity updated successfully',
      activity
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      error: 'Failed to update activity',
      message: error.message
    });
  }
});

// @route   DELETE /api/activities/:id
// @desc    Delete activity
// @access  Private (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        error: 'Activity not found'
      });
    }

    // Check ownership
    if (activity.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    await Activity.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      error: 'Failed to delete activity',
      message: error.message
    });
  }
});

// @route   POST /api/activities/:id/like
// @desc    Like/unlike activity
// @access  Private
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        error: 'Activity not found'
      });
    }

    const existingLike = activity.likes.find(like => 
      like.user.toString() === req.user._id.toString()
    );

    if (existingLike) {
      // Unlike
      await activity.removeLike(req.user._id);
      res.json({
        message: 'Activity unliked',
        liked: false,
        likeCount: activity.likeCount - 1
      });
    } else {
      // Like
      await activity.addLike(req.user._id);
      res.json({
        message: 'Activity liked',
        liked: true,
        likeCount: activity.likeCount + 1
      });
    }
  } catch (error) {
    console.error('Like activity error:', error);
    res.status(500).json({
      error: 'Failed to like activity',
      message: error.message
    });
  }
});

// @route   POST /api/activities/:id/comment
// @desc    Add comment to activity
// @access  Private
router.post('/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Comment text is required'
      });
    }

    if (text.length > 300) {
      return res.status(400).json({
        error: 'Comment cannot exceed 300 characters'
      });
    }

    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        error: 'Activity not found'
      });
    }

    await activity.addComment(req.user._id, text.trim());
    await activity.populate('comments.user', 'username avatar');

    res.status(201).json({
      message: 'Comment added successfully',
      comment: activity.comments[activity.comments.length - 1]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: 'Failed to add comment',
      message: error.message
    });
  }
});

export default router;