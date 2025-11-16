// auth-service/src/middleware/auth.js
const { verifyToken, COOKIE_NAME } = require('../config/jwt');
const User = require('../models/User');

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

    const decoded = verifyToken(token);
    const currentUser = await User.findById(decoded.userId);
    
    if (!currentUser || !currentUser.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists or is inactive'
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Not authorized, invalid token'
    });
  }
};

module.exports = { protect };