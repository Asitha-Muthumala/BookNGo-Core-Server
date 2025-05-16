const express = require('express');
const { eventBook, getBookings, getBookingById, getTouristProfileById, getAllEvents, userDetails, getBookingByTouristId } = require('../controllers/touristController');
const router = express.Router();

router.post('/eventBooking', eventBook);
router.get('/getBookings', getBookings);
router.get('/getBooking/:id', getBookingById);
router.get('/getBookingByTouristId/:id', getBookingByTouristId);
router.get('/touristProfile/:id', getTouristProfileById);
router.get('/getAllEvents', getAllEvents);
router.get('/userDetails', userDetails); 
module.exports = router;