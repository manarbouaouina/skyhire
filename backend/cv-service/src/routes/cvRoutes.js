// cv-service/src/routes/cvRoutes.js
const express = require('express');
const {
  uploadAvatar,
  uploadCV,
  getUserCVs,
  getCVById,
  getCVAnalysis,
  deleteCV,
  deleteAllCVs,
  getCareerRoadmap
} = require('../controllers/cvController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadAvatarMw = require('../middleware/uploadAvatar');
const {
  uploadLimiter,
  avatarUploadLimiter,
  generalCVLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

// Avatar upload with rate limiting
router.post('/avatar', avatarUploadLimiter, uploadAvatarMw.single('avatar'), uploadAvatar);

// CV upload with strict rate limiting
router.post('/upload', uploadLimiter, upload.single('cv'), uploadCV);

// Delete all CVs endpoint (must be before /:id route)
router.delete('/all', generalCVLimiter, deleteAllCVs);

// Other CV routes with general rate limiting
router.get('/', generalCVLimiter, getUserCVs);
router.get('/:id', generalCVLimiter, getCVById);
router.get('/:id/analysis', generalCVLimiter, getCVAnalysis);
router.get('/:id/roadmap', generalCVLimiter, getCareerRoadmap);
router.delete('/:id', generalCVLimiter, deleteCV);

module.exports = router;