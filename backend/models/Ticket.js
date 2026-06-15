const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  qr_id: {
    type: DataTypes.STRING(36),
    unique: true,
    allowNull: false
  },
  is_scanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  scanned_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Ticket;
