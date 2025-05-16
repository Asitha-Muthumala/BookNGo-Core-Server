const express = require('express');
const { eventBook, getBookings, getBookingById } = require('../controllers/touristController');
const router = express.Router();

router.post('/eventBooking', eventBook);
router.get('/getBookings', getBookings);
router.get('/getBooking/:id', getBookingById);



module.exports = router;