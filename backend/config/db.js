const { Sequelize } = require('sequelize');
require('dotenv').config();

// Calculate local timezone offset dynamically (e.g., '+05:30')
const offset = new Date().getTimezoneOffset();
const sign = offset > 0 ? '-' : '+';
const absOffset = Math.abs(offset);
const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
const minutes = String(absOffset % 60).padStart(2, '0');
const localTimezone = `${sign}${hours}:${minutes}`;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    timezone: localTimezone, // Set MySQL session timezone
    dialectOptions: {
      dateStrings: true, // Fetch dates as strings to prevent JS from overriding the timezone
      typeCast: true
    }
  }
);

module.exports = { sequelize, Sequelize };
