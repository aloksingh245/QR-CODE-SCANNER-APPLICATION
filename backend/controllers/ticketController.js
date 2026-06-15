const Ticket = require('../models/Ticket');
const exceljs = require('exceljs');
const { Op } = require('sequelize');

exports.getTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = {};
    if (search) {
      const searchNumber = parseInt(search.replace(/\D/g, ''), 10);
      whereClause = {
        [Op.or]: [
          { qr_id: { [Op.like]: `%${search}%` } },
          ...(isNaN(searchNumber) ? [] : [{ id: searchNumber }])
        ]
      };
    }

    const { count, rows } = await Ticket.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['id', 'ASC']]
    });

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      tickets: rows
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.is_scanned = false;
    ticket.scanned_at = null;
    await ticket.save();

    // Broadcast stats update since counts changed
    const io = req.app.get('io');
    if (io) {
      const total = await Ticket.count();
      const scanned = await Ticket.count({ where: { is_scanned: true } });
      io.emit('stats_update', { total, scanned, remaining: total - scanned });
    }

    res.status(200).json({ success: true, message: 'Ticket reset' });
  } catch (error) {
    console.error('Reset ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.exportTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ order: [['id', 'ASC']] });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Tickets');

    worksheet.columns = [
      { header: 'Ticket No', key: 'id', width: 10 },
      { header: 'QR ID', key: 'qr_id', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Scanned At', key: 'scanned_at', width: 25 }
    ];

    tickets.forEach(ticket => {
      worksheet.addRow({
        id: ticket.id,
        qr_id: ticket.qr_id,
        status: ticket.is_scanned ? 'SCANNED' : 'UNSCANNED',
        scanned_at: ticket.scanned_at ? new Date(ticket.scanned_at.replace(' ', 'T')).toLocaleString() : '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=tickets.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
