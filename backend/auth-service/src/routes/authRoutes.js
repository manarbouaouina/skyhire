// auth-service/src/routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const { 
  signup, 
  login, 
  getProfile, 
  updateProfile, 
  deleteAccount, 
  changePassword,
  googleCallback,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} = require('../validators/authValidators');
const {
  loginLimiter,
  signupLimiter,
  passwordChangeLimiter,
  generalAuthLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

// Google OAuth routes (with general rate limiting)
router.get('/google', generalAuthLimiter, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
  googleCallback
);
router.get('/google/failure', (req, res) => {
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
});

// Standard auth routes with validation and rate limiting
router.post('/signup', signupLimiter, validate(signupSchema), signup);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', generalAuthLimiter, logout);
router.get('/profile', protect, generalAuthLimiter, getProfile);
router.put('/profile', protect, generalAuthLimiter, validate(updateProfileSchema), updateProfile);
router.delete('/account', protect, generalAuthLimiter, deleteAccount);
router.put('/change-password', protect, passwordChangeLimiter, validate(changePasswordSchema), changePassword);

module.exports = router;