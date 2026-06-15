const Ticket = require('../models/Ticket');

exports.getStats = async (req, res) => {
  try {
    const total = await Ticket.count();
    const scanned = await Ticket.count({ where: { is_scanned: true } });
    const remaining = total - scanned;
    
    res.status(200).json({ total, scanned, remaining });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
