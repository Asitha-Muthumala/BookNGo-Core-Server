require('dotenv').config();
const prisma = require('../prisma/prismaClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require("../utils/AppError");
const { SIGNUP_USER_MODEL, SIGNIN_USER_MODEL } = require('../validation/user');
const validateRequest = require('../utils/validateRequest');
const secretKey = process.env.SECRET_KEY;
const expiredIn = process.env.TOKEN_EXPIRES_IN || "120m"; //2 hour

const handleValidation = (reqBody, validationModel) => {
    const validationErrors = validateRequest(reqBody, validationModel);
    if (validationErrors) {
        return { status: false, message: "Validation failed", validationErrors };
    }
    return null;
};

const checkIfUserExists = async (email) => {
    return await prisma.user.findUnique({ where: { email } });
};

const generateHashedPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const generateToken = (user) => {
    return jwt.sign({ name: user.name, id: user.id }, secretKey, { expiresIn: expiredIn });
};

exports.signupUser = async (req, res, next) => {
    try {
        const validationResult = handleValidation(req.body, SIGNUP_USER_MODEL);
        if (validationResult) return res.status(402).json(validationResult);

        const existingUser = await checkIfUserExists(req.body.email);
        if (existingUser) return next(new AppError("Email already exists", 400));

        const hashedPassword = await generateHashedPassword(req.body.password);

        const user = await prisma.user.create({
            data: {
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                role: req.body.role
            }
        });

        if (req.body.role === 'BUSINESS') {
            await prisma.business.create({
              data: {
                id: user.id,
              },
            });
        }

        if (req.body.role === 'TOURIST') {
            await prisma.tourist.create({
              data: {
                id: user.id,
              },
            });
        }

        res.status(200).json({
            status: true, 
            message: "Signup successful" 
        });
    } catch (err) {
        return next(new AppError(err.message, 500));
    }
};

exports.signinUser = async (req, res, next) => {
    try {
        const validationResult = handleValidation(req.body, SIGNIN_USER_MODEL);
        if (validationResult) return res.status(402).json(validationResult);

        const user = await checkIfUserExists(req.body.email);
        if (!user) return next(new AppError("Invalid email or password", 400));

        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordMatch) return next(new AppError("Invalid email or password", 400));

        const token = generateToken(user);

        res.status(200).json({ 
            status: true, 
            message: "Signin successful", 
            token: token, 
            role: user.role ,
            expiredIn: expiredIn
        });
    } catch (err) {
        return next(new AppError(err.message, 500));
    }
};


exports.updateUser = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const { name, email, contactNo, imageUrl, password, currentPassword } = req.body;

        // Basic validation
        if (!name || !email) {
            return res.status(400).json({
                status: false,
                message: 'Name and email are required'
            });
        }

        // Check if email exists (excluding current user)
        const existingUser = await prisma.user.findFirst({
            where: {
                email: email,
                NOT: { id: userId }
            }
        });

        if (existingUser) {
            return res.status(400).json({
                status: false,
                message: 'Email already in use by another account'
            });
        }

        // Prepare update data
        const updateData = {
            name,
            email,
            contactNo,
            imageUrl
        };

        // Handle password change if provided
        if (password) {
            if (!currentPassword) {
                return res.status(400).json({
                    status: false,
                    message: 'Current password is required to change password'
                });
            }

            // Verify current password
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const isMatch = await comparePasswords(currentPassword, user.password);
            
            if (!isMatch) {
                return res.status(400).json({
                    status: false,
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            updateData.password = await generateHashedPassword(password);
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        // Remove password from response
        const { password: _, ...userData } = updatedUser;

        res.status(200).json({
            status: true,
            data: userData
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to update user profile',
            error: error.message
        });
    }
};
