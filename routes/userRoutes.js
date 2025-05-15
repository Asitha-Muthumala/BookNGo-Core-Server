const express = require('express');
const { signinUser, signupUser, userDetails } = require('../controllers/userController');
const router = express.Router();

router.post('/signin', signinUser); //login
router.post('/signup', signupUser); //register


module.exports = router;
