const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.get('/stats', verifyToken, requireRole('ADMIN'), dashboardController.getStats);

module.exports = router;
