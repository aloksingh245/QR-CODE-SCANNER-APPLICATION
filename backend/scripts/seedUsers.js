const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' }); // Ensure dotenv is loaded for the script

async function seedUsers() {
  try {
    await sequelize.authenticate();
    
    // Check if they already exist
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    const scannerExists = await User.findOne({ where: { username: 'scanner' } });

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const scannerPassword = process.env.SCANNER_PASSWORD || 'scanner123';

    if (!adminExists) {
      const adminHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        username: 'admin',
        password_hash: adminHash,
        role: 'ADMIN'
      });
      console.log('✓ Admin user seeded');
    } else {
      console.log('Admin user already exists.');
    }

    if (!scannerExists) {
      const scannerHash = await bcrypt.hash(scannerPassword, 10);
      await User.create({
        username: 'scanner',
        password_hash: scannerHash,
        role: 'SCANNER'
      });
      console.log('✓ Scanner user seeded');
    } else {
      console.log('Scanner user already exists.');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
