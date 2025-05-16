const express = require('express');
const { updateEvent, eventBook, getBookings, getBookingById, getTouristProfileById, getAllEvents, userDetails, getBookingByTouristId, updateUserProfile } = require('../controllers/touristController');
const router = express.Router();

router.post('/eventBooking', eventBook);
router.get('/getBookings', getBookings);
router.get('/getBooking/:id', getBookingById);
router.put('/updateEvent/:id', updateEvent);
router.get('/getBookingByTouristId/:id', getBookingByTouristId);
router.get('/touristProfile/:id', getTouristProfileById);
router.get('/getAllEvents', getAllEvents);
router.get('/userDetails', userDetails); 
router.put('/updateProfile/:userId', updateUserProfile);

module.exports = router;