// auth-service/src/controllers/authController.js
const User = require('../models/User');
const { generateToken, setTokenCookie, clearTokenCookie } = require('../config/jwt');
const { deleteUserData, anonymizeUserData } = require('../services/dataDeletion');

// Inscription
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    // Validation is handled by Joi middleware

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Créer nouvel utilisateur
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'candidate'
    });

    // ✅ CRÉER LE PROFIL AUTOMATIQUEMENT dans user-service
    try {
      await fetch('http://localhost:5002/api/users/profile/auto-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        })
      });
    } catch (profileError) {
      console.log('Profile auto-creation failed, but user created:', profileError.message);
    }

    // Générer token avec rôle
    const token = generateToken(newUser._id, newUser.role);

    await newUser.updateLastLogin();

    // Set token in HTTP-only cookie
    setTokenCookie(res, token);

    res.status(201).json({
      status: 'success',
      token, // Also return in response for backward compatibility
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Connexion
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Validation is handled by Joi middleware

    // Trouver l'utilisateur et vérifier le password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }

    // Générer token avec rôle
    const token = generateToken(user._id, user.role);

    // Mettre à jour lastLogin
    await user.updateLastLogin();

    // Set token in HTTP-only cookie
    setTokenCookie(res, token);

    res.json({
      status: 'success',
      token, // Also return in response for backward compatibility
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Obtenir le profil utilisateur
const getProfile = async (req, res) => {
  try {
    res.json({
      status: 'success',
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get profile'
    });
  }
};

// Mettre à jour le profil
const updateProfile = async (req, res) => {
  try {
    const { name, bio, location, phone, languages, skills, experience, avatar } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          ...(name && { name }),
          ...(avatar !== undefined && { avatar }),
          'profile.bio': bio,
          'profile.location': location,
          'profile.phone': phone,
          'profile.languages': languages,
          'profile.skills': skills,
          'profile.experience': experience
        }
      },
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

// auth-service/src/controllers/authController.js - AJOUTER CES FONCTIONS

// Supprimer le compte utilisateur (Right to Erasure / GDPR)
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get auth token for service calls
    const authToken = req.headers.authorization?.split(' ')[1] || 
                     req.cookies?.[process.env.JWT_COOKIE_NAME || 'auth_token'];

    // Log deletion request
    console.log('Account deletion requested:', {
      userId,
      email: user.email,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    // Delete user data from all services
    const deletionResults = await deleteUserData(userId, authToken);

    // Clear authentication cookie
    clearTokenCookie(res);

    if (deletionResults.success) {
      res.json({
        status: 'success',
        message: 'Account and all associated data deleted successfully',
        deletedAt: deletionResults.deletedAt,
        services: deletionResults.services
      });
    } else {
      // Some services failed, but account is deleted
      res.status(207).json({
        status: 'partial_success',
        message: 'Account deleted, but some data deletion failed',
        deletedAt: deletionResults.deletedAt,
        services: deletionResults.services,
        errors: deletionResults.errors
      });
    }

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete account',
      error: error.message
    });
  }
};

// Changer le mot de passe
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    
    // Vérifier l'ancien mot de passe
    if (!(await user.correctPassword(currentPassword))) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
};

// Google OAuth callback handler
const googleCallback = async (req, res) => {
  try {
    const user = req.user; // Set by passport after successful authentication
    
    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=authentication_failed`);
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Set token in HTTP-only cookie
    setTokenCookie(res, token);

    // Redirect to frontend with success
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?auth=success`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_error`);
  }
};

// Logout handler
const logout = async (req, res) => {
  try {
    clearTokenCookie(res);
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to logout'
    });
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile, 
  deleteAccount,
  changePassword,
  googleCallback,
  logout
};