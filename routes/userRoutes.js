const express = require('express');
const { signinUser, signupUser, updateUser } = require('../controllers/userController');
const router = express.Router();

router.post('/signin', signinUser); //login
router.post('/signup', signupUser); //register
router.put('/updateProfile/:id',updateUser);

module.exports = router;
