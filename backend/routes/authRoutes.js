import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  uploadLogoHandler,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadLogo } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/logo', protect, uploadLogo.single('logo'), uploadLogoHandler);

export default router;
