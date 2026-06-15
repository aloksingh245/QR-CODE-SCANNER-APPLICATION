const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ScanLog = sequelize.define('ScanLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  qr_id: {
    type: DataTypes.STRING(36),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('SUCCESS', 'DUPLICATE', 'INVALID'),
    allowNull: false
  },
  scanned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false
});

module.exports = ScanLog;
