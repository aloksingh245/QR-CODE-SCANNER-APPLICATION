import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function TicketTable({ refreshTrigger }) {
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tickets?page=${page}&limit=20&search=${encodeURIComponent(debouncedSearch)}`);
      setTickets(res.data.tickets);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch tickets', error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  // Fetch when page, debouncedSearch, or refreshTrigger changes
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, refreshTrigger]);

  const handleReset = async (id) => {
    try {
      await api.patch(`/tickets/${id}/reset`);
      // Update local state to reflect change instantly instead of full refetch
      setTickets(prev => prev.map(t => 
        t.id === id ? { ...t, is_scanned: false, scanned_at: null } : t
      ));
    } catch (error) {
      console.error('Failed to reset ticket', error);
      alert('Error resetting ticket');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get('/tickets/export', { responseType: 'blob' });
      // Create a blob from the response data
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'tickets.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export failed', error);
      alert('Error exporting tickets');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
        <h2 className="text-lg font-bold text-gray-800">Ticket Registry</h2>
        <div className="flex gap-4 items-center w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search Ticket No (e.g., T-001) or QR ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-sm text-sm font-semibold transition disabled:opacity-50 whitespace-nowrap"
          >
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
              <th className="p-4 border-b">No.</th>
              <th className="p-4 border-b">QR ID</th>
              <th className="p-4 border-b">Status</th>
              <th className="p-4 border-b">Scanned At</th>
              <th className="p-4 border-b text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && tickets.length === 0 ? (
              <tr><td colSpan="5" className="p-6 text-center text-gray-500">Loading...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan="5" className="p-6 text-center text-gray-500">No tickets found.</td></tr>
            ) : (
              tickets.map(ticket => (
                <tr key={ticket.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm text-gray-700 font-medium">T-{String(ticket.id).padStart(3, '0')}</td>
                  <td className="p-4 text-xs text-gray-500 truncate max-w-[150px] md:max-w-[250px]">{ticket.qr_id}</td>
                  <td className="p-4">
                    {ticket.is_scanned ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                        Scanned
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {ticket.scanned_at ? new Date(ticket.scanned_at.replace(' ', 'T')).toLocaleString() : '-'}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleReset(ticket.id)}
                      disabled={!ticket.is_scanned}
                      className={`text-xs font-semibold px-3 py-1.5 rounded transition ${
                        ticket.is_scanned 
                          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      Reset
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
        <button 
          disabled={page === 1} 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="px-4 py-2 border rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600 font-medium">
          Page {page} of {totalPages}
        </span>
        <button 
          disabled={page >= totalPages} 
          onClick={() => setPage(p => p + 1)}
          className="px-4 py-2 border rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
