const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.post('/', verifyToken, requireRole('SCANNER'), scanController.scan);

module.exports = router;
