import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, profession, businessName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      profession: profession || 'Software Developer / IT Consultant',
      businessName: businessName || `${name}'s Consultancy`,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        profession: user.profession,
        currency: user.currency,
        country: user.country,
        upiId: user.upiId,
        logoUrl: user.logoUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    // Explicitly select password since select: false in schema
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        profession: user.profession,
        isSpecifiedProfession: user.isSpecifiedProfession,
        currency: user.currency,
        country: user.country,
        address: user.address,
        gstin: user.gstin,
        pan: user.pan,
        upiId: user.upiId,
        logoUrl: user.logoUrl,
        bankDetails: user.bankDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const {
      name,
      email,
      password,
      businessName,
      profession,
      isSpecifiedProfession,
      phone,
      address,
      country,
      currency,
      gstin,
      pan,
      upiId,
      bankDetails,
    } = req.body;

    if (name) user.name = name;
    if (businessName !== undefined) user.businessName = businessName;
    if (profession !== undefined) user.profession = profession;
    if (isSpecifiedProfession !== undefined) user.isSpecifiedProfession = isSpecifiedProfession;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (country !== undefined) user.country = country;
    if (currency !== undefined) user.currency = currency;
    if (gstin !== undefined) user.gstin = gstin;
    if (pan !== undefined) user.pan = pan;
    if (upiId !== undefined) user.upiId = upiId;
    if (bankDetails !== undefined) user.bankDetails = bankDetails;

    // Email change check
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'That email is already registered to another account.',
        });
      }
      user.email = email;
    }

    // Password change
    if (password && password.trim().length >= 6) {
      user.password = password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        businessName: updatedUser.businessName,
        profession: updatedUser.profession,
        isSpecifiedProfession: updatedUser.isSpecifiedProfession,
        phone: updatedUser.phone,
        address: updatedUser.address,
        country: updatedUser.country,
        currency: updatedUser.currency,
        gstin: updatedUser.gstin,
        pan: updatedUser.pan,
        upiId: updatedUser.upiId,
        logoUrl: updatedUser.logoUrl,
        bankDetails: updatedUser.bankDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload freelancer/business logo
// @route   POST /api/v1/auth/logo
// @access  Private
export const uploadLogoHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file.' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { logoUrl },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Business logo updated successfully.',
      logoUrl: user.logoUrl,
    });
  } catch (error) {
    next(error);
  }
};
