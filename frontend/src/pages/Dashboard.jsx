import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import StatsCard from '../components/StatsCard';
import TicketTable from '../components/TicketTable';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ total: 0, scanned: 0, remaining: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // 1. Fetch initial stats
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch initial stats", err);
      }
    };
    fetchStats();

    // 2. Setup Socket.IO for real-time updates
    // Use environment variable for production, fallback to root for Vite proxy
    const socketUrl = import.meta.env.VITE_API_URL || '/';
    const socket = io(socketUrl, { path: '/socket.io' });

    // Listen for the stats update directly (since we added it in the backend for immediate update and resets)
    socket.on('stats_update', (newStats) => {
      setStats(newStats);
      // Trigger table refresh
      setRefreshTrigger(prev => prev + 1);
    });

    // Also listen for scan_update just in case
    socket.on('scan_update', (data) => {
      // If it was successful, trigger table refresh
      if (data.status === 'SUCCESS') {
        setRefreshTrigger(prev => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Navbar */}
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Event Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Admin: {user?.username}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-semibold py-2 px-6 rounded-lg transition shadow-sm"
          >
            Logout
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard 
            label="Total Tickets" 
            value={stats.total} 
            colorClass="border-blue-500" 
          />
          <StatsCard 
            label="Scanned Tickets" 
            value={stats.scanned} 
            colorClass="border-green-500" 
          />
          <StatsCard 
            label="Remaining" 
            value={stats.remaining} 
            colorClass="border-orange-500" 
          />
        </div>

        {/* Tickets Table */}
        <TicketTable refreshTrigger={refreshTrigger} />
        
      </div>
    </div>
  );
}
