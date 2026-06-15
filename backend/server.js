const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const { sequelize } = require('./config/db');
require('./models/Ticket');
require('./models/ScanLog');
require('./models/User');

const authRouter = require('./routes/auth');
const scanRouter = require('./routes/scan');
const dashboardRouter = require('./routes/dashboard');
const ticketsRouter = require('./routes/tickets');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Configure this to restrict origins in production
    methods: ["GET", "POST"]
  }
});

// Expose io to routes
app.set('io', io);

io.on('connection', async (socket) => {
  console.log('A user connected:', socket.id);
  
  // Emit current stats immediately
  try {
    const Ticket = require('./models/Ticket');
    const total = await Ticket.count();
    const scanned = await Ticket.count({ where: { is_scanned: true } });
    socket.emit('stats_update', { total, scanned, remaining: total - scanned });
  } catch (err) {
    console.error('Error fetching initial stats:', err);
  }
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/scan', scanRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/tickets', ticketsRouter);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

// Start server
const PORT = process.env.PORT || 5000;
sequelize.sync().then(() => {
  console.log('DB connected and synced');
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect or sync DB:', err);
});
