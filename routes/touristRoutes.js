const express = require('express');
const { eventBook, helloTourist, getTouristProfileById } = require('../controllers/touristController');
const router = express.Router();

router.post('/eventBooking', eventBook);

router.get('/hello', helloTourist); 
//get tourist data

router.get('/touristProfile/:id', getTouristProfileById);




module.exports = router;