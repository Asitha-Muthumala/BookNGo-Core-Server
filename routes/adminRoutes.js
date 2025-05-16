
const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController.js');

// Test route
router.post('/test', controller.adminTest);

// Get pending approval events
router.get('/approvals/pending-approval', controller.getPendingApprovals);

// Get history events
router.get('/approvals/history', controller.getApprovedEvents);
router.put('/approvals/:id', controller.updateApprovalStatus);
router.get('/approvals/pending-count', controller.getPendingApprovalCount);
router.get('/event/country-count', controller.getEventCountByCountry);
router.get('/event/total', controller.getTotalEventCount);
router.get('/booking-stats', controller.getBookingStats);

// router.get('/event/:id', controller.getEventById);
router.get('/event/search', controller.getEventsByName);
router.put('/event/:id/', controller.toggleEventStatus);
router.get('/business/count', controller.getBusinessCount);
router.get('/tourist/count', controller.getTouristCount);
router.get('/business/search', controller.searchBusinessesByName);
router.put('/business/:id', controller.toggleBusinessStatus);


module.exports = router;