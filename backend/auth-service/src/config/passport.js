// auth-service/src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { generateToken } = require('./jwt');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || 5001}/api/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User exists, update last login
          await user.updateLastLogin();
          return done(null, user);
        }

        // Check if user exists with this email (for linking accounts)
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          if (!user.avatar && profile.photos && profile.photos[0]) {
            user.avatar = profile.photos[0].value;
          }
          await user.save();
          await user.updateLastLogin();
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName || profile.name.givenName + ' ' + profile.name.familyName,
          email: profile.emails[0].value,
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
          role: 'candidate', // Default role
          password: 'google-oauth-' + Date.now() // Dummy password for OAuth users
        });

        // Create profile in user-service
        try {
          await fetch(process.env.USER_SERVICE_URL || 'http://localhost:5002/api/users/profile/auto-create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user._id,
              name: user.name,
              email: user.email,
              role: user.role
            })
          });
        } catch (profileError) {
          console.log('Profile auto-creation failed, but user created:', profileError.message);
        }

        await user.updateLastLogin();
        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;

