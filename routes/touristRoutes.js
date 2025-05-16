const express = require('express');
const { eventBook, getBookings, getBookingById, updateEvent } = require('../controllers/touristController');
const router = express.Router();

router.post('/eventBooking', eventBook);
router.get('/getBookings', getBookings);
router.get('/getBooking/:id', getBookingById);
router.put('/updateEvent/:id', updateEvent);

module.exports = router;