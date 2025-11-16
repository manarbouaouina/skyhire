// user-service/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const UserProfile = require('../models/UserProfile');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'auth_token';

// user-service/src/middleware/auth.js - MODIFIER protect
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in HTTP-only cookie
    else if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, no token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // ✅ CRÉER LE PROFIL S'IL N'EXISTE PAS
    let userProfile = await UserProfile.findOne({ userId: decoded.userId });
    
    if (!userProfile) {
      userProfile = await UserProfile.create({
        userId: decoded.userId,
        headline: 'Aviation Professional',
        bio: 'Welcome to my SkyHire profile!',
        stats: {
          profileViews: 0,
          connectionCount: 0,
          jobApplications: 0,
          interviewCount: 0,
          lastActive: new Date()
        }
      });
    }

    req.user = {
      id: decoded.userId,
      profile: userProfile
    };
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Not authorized, invalid token'
    });
  }
};

module.exports = { protect };