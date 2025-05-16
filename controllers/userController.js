require('dotenv').config();
const prisma = require('../prisma/prismaClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendEmail = require("../utils/SendEmail");
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

        // sendEmail("akmuthumala1@gmail.com", "BookNGo Notification", "Test");

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
