import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import { NotificationBell } from '../components/NotificationBell';

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPathName = pathParts.length > 0 
    ? pathParts[pathParts.length - 1].charAt(0).toUpperCase() + pathParts[pathParts.length - 1].slice(1)
    : 'Overview';

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#0D0D0D] text-white">Loading...</div>;
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D]">
        <div className="bg-[#1A1A1A] p-8 rounded border border-[#2A2A2A] flex flex-col items-center">
          <div className="w-12 h-12 bg-[#DC2626] rounded flex items-center justify-center font-bold text-2xl text-white mb-4">
            R
          </div>
          <h1 className="text-xl font-bold text-white mb-6">
            Rental<span className="text-[#DC2626]">Sync</span> Login
          </h1>
          <button 
            onClick={handleSignIn}
            className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F9FAFB] text-slate-900 font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full">
        <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="hover:text-[#DC2626] cursor-pointer">Dashboard</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-900">{currentPathName.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <NotificationBell />
            <div className="h-8 w-px bg-gray-200"></div>
            <button 
              onClick={() => navigate('/bookings')}
              className="text-xs bg-[#DC2626] text-white px-4 py-1.5 rounded font-bold hover:bg-red-700 cursor-pointer"
            >
              + New Booking
            </button>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
