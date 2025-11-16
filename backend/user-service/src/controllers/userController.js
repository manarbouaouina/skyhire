// user-service/src/controllers/userController.js
const UserProfile = require('../models/UserProfile');
const mongoose = require('mongoose');
const Connection = require('../models/Connection');

// Obtenir le profil complet
// user-service/src/controllers/userController.js - MODIFIER getProfile
const getProfile = async (req, res) => {
  try {
    console.log('🔍 Searching profile for user:', req.user.id); // ← AJOUTE ÇA
    
    const profile = await UserProfile.findOne({ userId: req.user.id })
      
    
    console.log('📊 Profile found:', profile); // ← AJOUTE ÇA
    
    if (!profile) {
      console.log('❌ No profile found for user:', req.user.id); // ← AJOUTE ÇA
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found'
      });
    }

    await profile.updateLastActive();

    res.json({
      status: 'success',
      data: {
        profile
      }
    });
  } catch (error) {
    console.error('🚨 Get profile error:', error); // ← AMÉLIORE LE LOG
    res.status(500).json({
      status: 'error',
      message: 'Failed to get profile'
    });
  }
};

// Mettre à jour le profil
const updateProfile = async (req, res) => {
  try {
    const {
      headline,
      bio,
      location,
      phone,
      website,
      languages,
      skills,
      education,
      experience,
      certifications,
      socialLinks,
      preferences,
      aviationSpecific
    } = req.body;

    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          ...(headline && { headline }),
          ...(bio !== undefined && { bio }),
          ...(location !== undefined && { location }),
          ...(phone !== undefined && { phone }),
          ...(website !== undefined && { website }),
          ...(languages && { languages }),
          ...(skills && { skills }),
          ...(education && { education }),
          ...(experience && { experience }),
          ...(certifications && { certifications }),
          ...(socialLinks && { socialLinks }),
          ...(preferences && { preferences }),
          ...(aviationSpecific && { aviationSpecific })
        }
      },
      { new: true, runValidators: true, upsert: true }
    )

    res.json({
      status: 'success',
      data: {
        profile: updatedProfile
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

// Rechercher des utilisateurs
const searchUsers = async (req, res) => {
  try {
    const { 
      query, 
      skills, 
      location, 
      role, 
      page = 1, 
      limit = 10 
    } = req.query;

    let searchFilter = {};

    // Recherche texte
    if (query) {
      searchFilter.$text = { $search: query };
    }

    // Filtre par compétences
    if (skills) {
      const skillsArray = skills.split(',');
      searchFilter['skills.name'] = { $in: skillsArray };
    }

    // Filtre par localisation
    if (location) {
      searchFilter.location = new RegExp(location, 'i');
    }

    // Filtre par rôle (nécessite population)
    if (role) {
      searchFilter['userId.role'] = role;
    }

    const skip = (page - 1) * limit;

    const users = await UserProfile.find(searchFilter)
      .select('-education -experience -certifications') // Exclure les données lourdes
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ 'stats.lastActive': -1 });

    const total = await UserProfile.countDocuments(searchFilter);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search users'
    });
  }
};

// Obtenir les statistiques utilisateur
const getUserStats = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    
    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found'
      });
    }

    // Statistiques avancées
    const stats = {
      basic: profile.stats,
      skillCount: profile.skills.length,
      experienceCount: profile.experience.length,
      educationCount: profile.education.length,
      certificationCount: profile.certifications.length,
      languageCount: profile.languages.length,
      profileCompletion: calculateProfileCompletion(profile)
    };

    res.json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user stats'
    });
  }
};

// Calcul du pourcentage de complétion du profil
const calculateProfileCompletion = (profile) => {
  const fields = [
    profile.headline,
    profile.bio,
    profile.location,
    profile.phone,
    profile.skills.length,
    profile.experience.length,
    profile.education.length,
    profile.languages.length
  ];

  const completedFields = fields.filter(field => {
    if (Array.isArray(field)) return field.length > 0;
    return field && field !== '';
  }).length;

  return Math.round((completedFields / fields.length) * 100);
};

// Obtenir un profil public (sans données sensibles)
const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await UserProfile.findOne({ userId })
      .select('-preferences -stats -email -phone');

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found'
      });
    }

    // Incrémenter les vues de profil
    await profile.incrementProfileViews();

    res.json({
      status: 'success',
      data: {
        profile
      }
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get public profile'
    });
  }
};

// Ajouter une compétence
const addSkill = async (req, res) => {
  try {
    const { name, level = 'intermediate', category } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Skill name is required'
      });
    }

    const profile = await UserProfile.findOne({ userId: req.user.id });
    
    // Vérifier si la compétence existe déjà
    const skillExists = profile.skills.some(skill => 
      skill.name.toLowerCase() === name.toLowerCase()
    );

    if (skillExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Skill already exists'
      });
    }

    profile.skills.push({ name, level, category });
    await profile.save();

    res.json({
      status: 'success',
      data: {
        skills: profile.skills
      }
    });
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add skill'
    });
  }
};

// Supprimer une compétence
const removeSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    const profile = await UserProfile.findOne({ userId: req.user.id });
    profile.skills = profile.skills.filter(skill => skill._id.toString() !== skillId);
    await profile.save();

    res.json({
      status: 'success',
      data: {
        skills: profile.skills
      }
    });
  } catch (error) {
    console.error('Remove skill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove skill'
    });
  }
};

// AJOUTE CETTE FONCTION
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 [USER-SERVICE] Fetching user by ID:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user id'
      });
    }

    // 🔥 SOLUTION : Ne pas utiliser populate, récupérer directement UserProfile
    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      console.log('❌ [USER-SERVICE] Profile not found for user:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // SOLUTION : Retourner les données de base sans populate
    const userData = {
      _id: userId, // Utiliser l'ID directement
      name: profile.name || profile.headline || 'Aviation Professional', // Fallback si pas de nom
      email: '', // Pas d'email dans UserProfile
      avatar: '', // Pas d'avatar dans UserProfile  
      role: 'candidate', // Valeur par défaut
      isActive: true,
      profile: {
        headline: profile.headline,
        location: profile.location,
        skills: profile.skills,
        bio: profile.bio,
        stats: profile.stats
      },
      preferences: {
        notifications: {
          message: profile?.preferences?.notifications?.message !== false,
          connection: profile?.preferences?.notifications?.connection !== false,
          job: profile?.preferences?.notifications?.job !== false,
        }
      }
    };

    console.log(' [USER-SERVICE] User data prepared:', userData.name);

    res.json({
      status: 'success',
      data: {
        user: userData
      }
    });
  } catch (error) {
    console.error('🚨 [USER-SERVICE] Get user by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user: ' + error.message
    });
  }
};

// user-service/src/controllers/userController.js - AJOUTER CETTE FONCTION

// Création automatique du profil
const autoCreateProfile = async (req, res) => {
  try {
    const { userId, name, email, role } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }

    // Vérifier si le profil existe déjà
    const existingProfile = await UserProfile.findOne({ userId });
    if (existingProfile) {
      return res.json({
        status: 'success',
        message: 'Profile already exists'
      });
    }

    // Créer le profil avec des valeurs par défaut
    const newProfile = await UserProfile.create({
      userId,
      name: name || 'Aviation Professional', // 🔥 SAUVEGARDER LE NOM
      email: email || '',
      headline: `${role === 'recruiter' ? 'Aviation Recruiter' : 'Aviation Professional'}`,
      bio: `Welcome to my SkyHire profile!`,
      location: '',
      phone: '',
      skills: [],
      languages: [],
      education: [],
      experience: [],
      certifications: [],
      socialLinks: {},
      preferences: {
        jobAlerts: true,
        emailNotifications: true,
        pushNotifications: true,
        profileVisibility: 'public'
      },
      stats: {
        profileViews: 0,
        connectionCount: 0,
        jobApplications: 0,
        interviewCount: 0,
        lastActive: new Date()
      },
      aviationSpecific: {
        licenseType: [],
        flightHours: 0,
        aircraftTypes: [],
        destinations: [],
        specializations: []
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Profile created automatically',
      data: {
        profile: newProfile
      }
    });
  } catch (error) {
    console.error('Auto-create profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create profile automatically'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  searchUsers,
  getUserStats,
  getPublicProfile,
  addSkill,
  removeSkill,
  autoCreateProfile,
  getUserById
};