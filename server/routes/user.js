import express from 'express';
import User, { initUserModel } from '../models/User.js';
import Activity, { initActivityModel } from '../models/Activity.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { getSequelize } from '../config/database.js';

const router = express.Router();

// @route   GET /api/users/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'points', limit = 10 } = req.query;
    
    // Development mode: use mock data
    if (process.env.NODE_ENV === 'development') {
      const mockUsers = [
        { id: '1', username: 'EcoWarrior', avatar: '🌱', points: 1250, totalCarbonSaved: 45.2, level: 5, streak: 15 },
        { id: '2', username: 'GreenGuru', avatar: '🌿', points: 1100, totalCarbonSaved: 38.7, level: 4, streak: 12 },
        { id: '3', username: 'CarbonCrusher', avatar: '♻️', points: 950, totalCarbonSaved: 32.1, level: 4, streak: 8 },
        { id: '4', username: 'EcoFriend', avatar: '🌍', points: 800, totalCarbonSaved: 28.5, level: 3, streak: 6 },
        { id: '5', username: 'NatureLover', avatar: '🌳', points: 650, totalCarbonSaved: 22.3, level: 3, streak: 4 }
      ];

      let sortedUsers = [...mockUsers];
      if (type === 'carbon') {
        sortedUsers.sort((a, b) => b.totalCarbonSaved - a.totalCarbonSaved);
      } else if (type === 'level') {
        sortedUsers.sort((a, b) => b.level - a.level);
      } else {
        sortedUsers.sort((a, b) => b.points - a.points);
      }

      const limitedUsers = sortedUsers.slice(0, parseInt(limit));

      return res.json({
        success: true,
        leaderboard: limitedUsers.map((user, index) => ({
          rank: index + 1,
          user
        }))
      });
    }

    // Production mode: use database
    try {
      // 初始化模型
      const UserModel = initUserModel();
      if (!UserModel) {
        throw new Error('Database not available');
      }

      let sortField = 'points';
      if (type === 'carbon') sortField = 'totalCarbonSaved';
      if (type === 'level') sortField = 'level';
      
      const users = await UserModel.findAll({
        where: { isActive: true },
        attributes: ['id', 'username', 'avatar', 'points', 'totalCarbonSaved', 'level', 'streak', 'createdAt'],
        order: [[sortField, 'DESC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        leaderboard: users.map((user, index) => ({
          rank: index + 1,
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            points: user.points,
            totalCarbonSaved: user.totalCarbonSaved,
            level: user.level,
            streak: user.streak ? user.streak.current : 0
          }
        }))
      });
    } catch (dbError) {
      console.error('Database error during leaderboard fetch:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard',
        message: 'Database connection error'
      });
    }
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      message: error.message
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user profile
// @access  Public (with optional auth for privacy settings)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    // 初始化模型
    const UserModel = initUserModel();
    const ActivityModel = initActivityModel();
    if (!UserModel) {
      return res.status(500).json({
        error: 'Database not available'
      });
    }

    const user = await UserModel.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'email'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check privacy settings
    const preferences = user.preferences || { privacy: { showProfile: true, showActivities: true } };
    if (!preferences.privacy.showProfile && 
        (!req.user || req.user.id !== user.id)) {
      return res.status(403).json({
        error: 'Profile is private'
      });
    }

    // Get user's recent activities if allowed
    let recentActivities = [];
    if (ActivityModel && (preferences.privacy.showActivities || 
        (req.user && req.user.id === user.id))) {
      recentActivities = await ActivityModel.findAll({ 
        where: { 
          userId: user.id, 
          isPublic: true 
        },
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['type', 'category', 'description', 'carbonSaved', 'points', 'createdAt']
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        points: user.points,
        level: user.level,
        totalCarbonSaved: user.totalCarbonSaved,
        streak: user.streak,
        achievements: user.achievements,
        createdAt: user.createdAt,
        recentActivities
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      message: error.message
    });
  }
});

// @route   GET /api/users/:id/activities
// @desc    Get user's activities
// @access  Public (respects privacy settings)
router.get('/:id/activities', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if activities are public or user is viewing their own
    const isOwner = req.user && req.user._id.toString() === user._id.toString();
    if (!user.preferences.privacy.showActivities && !isOwner) {
      return res.status(403).json({
        error: 'User activities are private'
      });
    }

    const query = { user: user._id };
    if (!isOwner) {
      query.isPublic = true;
    }

    const activities = await Activity.find(query)
      .populate('user', 'username avatar level')
      .sort({ createdAt: -1 })
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
    console.error('Get user activities error:', error);
    res.status(500).json({
      error: 'Failed to get user activities',
      message: error.message
    });
  }
});

// @route   GET /api/users/:id/stats
// @desc    Get user statistics
// @access  Public (respects privacy settings)
router.get('/:id/stats', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const isOwner = req.user && req.user._id.toString() === user._id.toString();
    if (!user.preferences.privacy.showActivities && !isOwner) {
      return res.status(403).json({
        error: 'User statistics are private'
      });
    }

    const query = { user: user._id };
    if (!isOwner) {
      query.isPublic = true;
    }

    const stats = await Activity.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalCarbonSaved: { $sum: '$carbonSaved' },
          totalPoints: { $sum: '$points' }
        }
      }
    ]);

    const totalActivities = await Activity.countDocuments(query);

    res.json({
      stats: {
        totalActivities,
        byType: stats,
        totalCarbonSaved: user.totalCarbonSaved,
        totalPoints: user.points,
        level: user.level,
        streak: user.streak,
        achievementCount: user.achievements.length
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get user statistics',
      message: error.message
    });
  }
});

// @route   POST /api/users/search
// @desc    Search users
// @access  Public
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.find({
      $and: [
        { isActive: true },
        { 'preferences.privacy.showProfile': true },
        {
          $or: [
            { username: { $regex: query.trim(), $options: 'i' } }
          ]
        }
      ]
    })
    .select('username avatar points level totalCarbonSaved')
    .limit(parseInt(limit));

    res.json({
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        points: user.points,
        level: user.level,
        totalCarbonSaved: user.totalCarbonSaved
      }))
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      error: 'Failed to search users',
      message: error.message
    });
  }
});

export default router;