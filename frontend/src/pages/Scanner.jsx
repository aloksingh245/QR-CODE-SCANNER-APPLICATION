import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';

export default function Scanner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (mounted.current) return;
    mounted.current = true;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          handleScan,
          undefined // Ignore regular scan frame failures
        );
      } catch (err) {
        console.error("Camera start error:", err);
        setCameraError("Camera permission denied or device not found. Please allow camera access in your browser settings.");
      }
    };

    startScanner();

    // Cleanup when component unmounts
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleScan = async (decodedText) => {
    // Prevent multiple API calls for the same scan
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setIsVerifying(true);

    // Stop/Pause the camera visually
    if (scannerRef.current) {
      scannerRef.current.pause(true);
    }

    try {
      const res = await api.post('/scan', { qr_id: decodedText });
      setResult({ status: res.data.status, text: res.data.message });
    } catch (error) {
      console.error("Scan API Error:", error);
      setResult({ 
        status: 'ERROR', 
        text: error.response?.data?.message || 'Connection failed, try again' 
      });
    } finally {
      setIsVerifying(false);
      
      // Keep result overlay visible for 2 seconds
      setTimeout(() => {
        setResult(null);
        isScanningRef.current = false;
        
        // Resume the camera
        if (scannerRef.current) {
          scannerRef.current.resume();
        }
      }, 2000);
    }
  };

  const handleLogout = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white overflow-hidden relative">
      {/* Top Bar */}
      <header className="flex justify-between items-center p-4 bg-gray-900 z-10 shadow-md">
        <div>
          <h1 className="text-xl font-bold text-blue-400">QR Scanner</h1>
          <p className="text-gray-400 text-xs">Scanner: {user?.username}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-4 rounded-lg transition font-semibold text-sm"
        >
          Logout
        </button>
      </header>

      {/* Camera Viewfinder Container */}
      <main className="flex-1 relative flex items-center justify-center bg-black w-full">
        {cameraError ? (
          <div className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-lg font-semibold">{cameraError}</p>
          </div>
        ) : (
          <div id="reader" className="w-full max-w-lg mx-auto overflow-hidden rounded-lg shadow-lg"></div>
        )}
      </main>

      {/* Overlays */}
      {isVerifying && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mb-6"></div>
          <h2 className="text-3xl font-bold text-white tracking-widest uppercase">Verifying...</h2>
        </div>
      )}

      {result && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center z-50 text-white ${
          result.status === 'SUCCESS' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {result.status === 'SUCCESS' ? (
            <svg className="w-40 h-40 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-40 h-40 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-center px-4 uppercase tracking-wide">
            {result.status === 'SUCCESS' ? 'ENTRY ALLOWED' : 
             result.status === 'DUPLICATE' ? 'ALREADY SCANNED' : 
             result.status === 'INVALID' ? 'INVALID QR CODE' : 'ERROR'}
          </h1>
          
          {result.status === 'ERROR' && (
            <p className="mt-4 text-xl font-medium text-center px-6">{result.text}</p>
          )}
        </div>
      )}
    </div>
  );
}
