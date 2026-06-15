const { sequelize, Sequelize } = require('../config/db');
const Ticket = require('../models/Ticket');
const ScanLog = require('../models/ScanLog');

exports.scan = async (req, res) => {
  const { qr_id } = req.body;

  if (!qr_id) {
    return res.status(400).json({ success: false, status: 'INVALID', message: 'qr_id is required' });
  }

  const t = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });

  try {
    // 1. SELECT * FROM tickets WHERE qr_id = ? FOR UPDATE;
    const ticket = await Ticket.findOne({
      where: { qr_id },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    let status = '';
    let success = false;
    let message = '';
    let scanned_at = new Date();

    // Case 1 — qr_id not found
    if (!ticket) {
      await t.rollback();
      status = 'INVALID';
      success = false;
      message = 'Invalid QR Code';
      await ScanLog.create({ qr_id, status });
    } 
    // Case 2 — is_scanned = true
    else if (ticket.is_scanned) {
      await t.rollback();
      status = 'DUPLICATE';
      success = false;
      message = 'Already Scanned';
      await ScanLog.create({ qr_id, status });
    } 
    // Case 3 — is_scanned = false
    else {
      ticket.is_scanned = true;
      ticket.scanned_at = scanned_at;
      await ticket.save({ transaction: t });
      
      status = 'SUCCESS';
      success = true;
      message = 'Entry Allowed';
      
      await ScanLog.create({ qr_id, status }, { transaction: t });
      await t.commit();
    }

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.emit('scan_update', { qr_id, status, scanned_at });
      
      if (success) {
        const total = await Ticket.count();
        const scanned = await Ticket.count({ where: { is_scanned: true } });
        io.emit('stats_update', { total, scanned, remaining: total - scanned });
      }
    }

    return res.status(200).json({ success, status, message });

  } catch (error) {
    await t.rollback();
    console.error('Scan error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
