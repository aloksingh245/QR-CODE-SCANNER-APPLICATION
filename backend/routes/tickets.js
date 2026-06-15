const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.get('/', verifyToken, requireRole('ADMIN'), ticketController.getTickets);
router.patch('/:id/reset', verifyToken, requireRole('ADMIN'), ticketController.resetTicket);
router.get('/export', verifyToken, requireRole('ADMIN'), ticketController.exportTickets);

module.exports = router;
