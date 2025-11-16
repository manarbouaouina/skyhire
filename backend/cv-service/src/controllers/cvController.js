// cv-service/src/controllers/cvController.js
const CV = require('../models/CV');
const { analyzeCV } = require('../services/cvAnalysis');
const fs = require('fs');
const path = require('path');

// Upload avatar image
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload an image file'
      });
    }

    // Public URL path served by CV service and proxied by Gateway
    const publicUrl = `/uploads/avatars/${req.file.filename}`;

    res.status(201).json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: { url: publicUrl }
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    console.error('Upload avatar error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload avatar: ' + error.message
    });
  }
};

// Upload CV
const uploadCV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a file'
      });
    }

    // Vérifier la taille du fichier
    if (req.file.size > 5 * 1024 * 1024) {
      // Supprimer le fichier uploadé
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        status: 'error',
        message: 'File size too large. Maximum 5MB allowed.'
      });
    }

    // Créer entrée CV dans la base de données
    const cv = await CV.create({
      userId: req.user.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: path.extname(req.file.originalname).toLowerCase()
    });

    // Démarrer l'analyse en arrière-plan
    analyzeCVInBackground(cv._id, req.file.path, req.user.id);

    res.status(201).json({
      status: 'success',
      message: 'CV uploaded successfully. Analysis in progress...',
      data: {
        cv: {
          id: cv._id,
          originalName: cv.originalName,
          fileSize: cv.fileSize,
          uploadDate: cv.uploadDate,
          analysisStatus: 'pending'
        }
      }
    });

  } catch (error) {
    // Supprimer le fichier uploadé en cas d'erreur
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Upload CV error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload CV: ' + error.message
    });
  }
};

// Analyse en arrière-plan
const analyzeCVInBackground = async (cvId, filePath, userId) => {
  try {
    const analysisResult = await analyzeCV(filePath, userId);
    
    await CV.findByIdAndUpdate(cvId, {
      analysisResult: analysisResult,
      isAnalyzed: true
    });

    console.log(`✅ CV analysis completed for CV: ${cvId}`);
  } catch (error) {
    console.error('CV analysis error:', error);
    // Marquer comme échec d'analyse mais garder le CV
    await CV.findByIdAndUpdate(cvId, {
      isAnalyzed: true,
      'analysisResult.analysisDate': new Date()
    });
  }
};

// Obtenir tous les CVs d'un utilisateur
const getUserCVs = async (req, res) => {
  try {
    const cvs = await CV.find({ 
      userId: req.user.id,
      isActive: true 
    })
    .sort({ uploadDate: -1 })
    .select('-filePath'); // Exclure le chemin du fichier

    res.json({
      status: 'success',
      results: cvs.length,
      data: {
        cvs
      }
    });
  } catch (error) {
    console.error('Get user CVs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get CVs'
    });
  }
};

// Obtenir un CV spécifique
const getCVById = async (req, res) => {
  try {
    const cv = await CV.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!cv) {
      return res.status(404).json({
        status: 'error',
        message: 'CV not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        cv
      }
    });
  } catch (error) {
    console.error('Get CV by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get CV'
    });
  }
};

// Obtenir l'analyse d'un CV
const getCVAnalysis = async (req, res) => {
  try {
    const cv = await CV.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!cv) {
      return res.status(404).json({
        status: 'error',
        message: 'CV not found'
      });
    }

    if (!cv.isAnalyzed || !cv.analysisResult) {
      return res.status(404).json({
        status: 'error',
        message: 'CV analysis not available yet'
      });
    }

    res.json({
      status: 'success',
      data: {
        analysis: cv.analysisResult
      }
    });
  } catch (error) {
    console.error('Get CV analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get CV analysis'
    });
  }
};

// Supprimer un CV
const deleteCV = async (req, res) => {
  try {
    const cv = await CV.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!cv) {
      return res.status(404).json({
        status: 'error',
        message: 'CV not found'
      });
    }

    // Supprimer le fichier physique
    if (fs.existsSync(cv.filePath)) {
      fs.unlinkSync(cv.filePath);
    }

    // Permanently delete (hard delete for GDPR compliance)
    await CV.findByIdAndDelete(cv._id);

    res.json({
      status: 'success',
      message: 'CV deleted successfully'
    });
  } catch (error) {
    console.error('Delete CV error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete CV'
    });
  }
};

// Delete all CVs for a user (GDPR Right to Erasure)
const deleteAllCVs = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all CVs for this user
    const cvs = await CV.find({ userId });
    
    let deletedCount = 0;
    let fileErrors = [];

    // Delete all CV files and records
    for (const cv of cvs) {
      try {
        // Delete physical file
        if (cv.filePath && fs.existsSync(cv.filePath)) {
          fs.unlinkSync(cv.filePath);
        }
        
        // Delete avatar if exists
        if (cv.avatar && fs.existsSync(cv.avatar)) {
          fs.unlinkSync(cv.avatar);
        }
        
        // Permanently delete document
        await CV.findByIdAndDelete(cv._id);
        deletedCount++;
      } catch (fileError) {
        fileErrors.push({
          cvId: cv._id,
          error: fileError.message
        });
        // Still delete the document even if file deletion fails
        await CV.findByIdAndDelete(cv._id);
        deletedCount++;
      }
    }

    res.json({
      status: 'success',
      message: `Deleted ${deletedCount} CV(s)`,
      deletedCount,
      fileErrors: fileErrors.length > 0 ? fileErrors : undefined
    });
  } catch (error) {
    console.error('Delete all CVs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete CVs',
      error: error.message
    });
  }
};

// Générer career roadmap basée sur l'analyse
const getCareerRoadmap = async (req, res) => {
  try {
    const cv = await CV.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!cv || !cv.analysisResult) {
      return res.status(404).json({
        status: 'error',
        message: 'CV analysis not available'
      });
    }

    const analysis = cv.analysisResult;
    
    // Générer roadmap basée sur l'analyse
    const roadmap = generateRoadmap(analysis);

    res.json({
      status: 'success',
      data: {
        roadmap
      }
    });
  } catch (error) {
    console.error('Get career roadmap error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate career roadmap'
    });
  }
};

// Générer roadmap basée sur l'analyse
const generateRoadmap = (analysis) => {
  const roadmap = [
    {
      step: 1,
      title: 'Improve Core Skills',
      description: 'Focus on developing key aviation competencies',
      actions: analysis.improvements.slice(0, 2),
      timeline: '1-3 months',
      priority: 'high'
    },
    {
      step: 2,
      title: 'Obtain Certifications',
      description: 'Acquire industry-recognized certifications',
      actions: analysis.aviationMatch.suggestions.slice(0, 2),
      timeline: '3-6 months',
      priority: 'medium'
    },
    {
      step: 3,
      title: 'Gain Practical Experience',
      description: 'Build hands-on experience in aviation roles',
      actions: ['Apply for entry-level positions', 'Network with professionals', 'Attend industry events'],
      timeline: '6-12 months',
      priority: 'medium'
    },
    {
      step: 4,
      title: 'Career Advancement',
      description: 'Progress to senior aviation roles',
      actions: ['Apply for senior positions', 'Mentor junior staff', 'Continue professional development'],
      timeline: '1-2 years',
      priority: 'low'
    }
  ];

  return roadmap;
};

module.exports = {
  uploadAvatar,
  uploadCV,
  getUserCVs,
  getCVById,
  getCVAnalysis,
  deleteCV,
  deleteAllCVs,
  getCareerRoadmap
};