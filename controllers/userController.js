require('dotenv').config();
const prisma = require('../prisma/prismaClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require("../utils/AppError");
const { SIGNUP_USER_MODEL, SIGNIN_USER_MODEL } = require('../validation/user');
const validateRequest = require('../utils/validateRequest');
const secretKey = process.env.SECRET_KEY;

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
    return jwt.sign({ name: user.firstName }, secretKey, { expiresIn: "1d" });
};

exports.signupUser = async (req, res, next) => {
    try {
        const validationResult = handleValidation(req.body, SIGNUP_USER_MODEL);
        if (validationResult) return res.status(402).json(validationResult);

        const existingUser = await checkIfUserExists(req.body.email);
        if (existingUser) return next(new AppError("Email already exists", 400));

        const hashedPassword = await generateHashedPassword(req.body.password);

        await prisma.user.create({
            data: {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                password: hashedPassword,
            }
        });

        res.status(200).json({ status: true, message: "Signup successful" });
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

        res.status(200).json({ status: true, message: "Signin successful", token });
    } catch (err) {
        return next(new AppError(err.message, 500));
    }
};
