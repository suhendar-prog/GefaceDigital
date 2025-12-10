import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import Dashboard from './components/Dashboard';
import StudentCheckIn from './components/StudentCheckIn';
import { seedDatabase, getSettings } from './services/storage';
import { User, ShieldCheck, MapPin, Camera, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => {
    // Initialize dummy data for the demo experience
    seedDatabase();
    setSettings(getSettings());
  }, []);

  const handleStudentSuccess = () => {
    // Alert removed, UI handled in StudentCheckIn component
    setView(AppView.LANDING);
  };

  if (view === AppView.TEACHER_DASHBOARD) {
    return <Dashboard onBack={() => setView(AppView.LANDING)} />;
  }

  if (view === AppView.STUDENT_CHECKIN) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="max-w-lg mx-auto w-full p-4 flex-grow">
          <StudentCheckIn 
            onBack={() => setView(AppView.LANDING)} 
            onSuccess={handleStudentSuccess} 
          />
        </div>
      </div>
    );
  }

  // Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        {/* Hero Section */}
        <div className="relative h-48 bg-slate-900 overflow-hidden flex items-center justify-center">
          {settings.schoolLogo ? (
            <>
              {/* Blurred background version of logo */}
              <div 
                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 scale-110"
                style={{ backgroundImage: `url(${settings.schoolLogo})` }}
              />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-white p-1 shadow-xl mb-2 overflow-hidden">
                  <img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-cover rounded-full" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-md">{settings.schoolName}</h1>
              </div>
            </>
          ) : (
             <>
               <img 
                 src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                 alt="School" 
                 className="w-full h-full object-cover opacity-60 absolute inset-0"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent flex flex-col justify-end p-6">
                 <h1 className="text-3xl font-extrabold text-white tracking-tight">GeoFace</h1>
                 <p className="text-slate-300 text-sm">Smart Attendance System</p>
               </div>
             </>
          )}
        </div>

        {/* Feature Pills */}
        <div className="flex justify-around py-4 bg-slate-50 border-b border-slate-100">
           <div className="flex flex-col items-center gap-1">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600"><MapPin size={16} /></div>
              <span className="text-[10px] uppercase font-bold text-slate-500">GPS</span>
           </div>
           <div className="flex flex-col items-center gap-1">
              <div className="p-2 bg-green-100 rounded-full text-green-600"><Camera size={16} /></div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Selfie</span>
           </div>
           <div className="flex flex-col items-center gap-1">
              <div className="p-2 bg-purple-100 rounded-full text-purple-600"><ShieldCheck size={16} /></div>
              <span className="text-[10px] uppercase font-bold text-slate-500">AI Verify</span>
           </div>
        </div>

        {/* Main Actions */}
        <div className="p-8 space-y-4">
          <p className="text-center text-slate-500 mb-4">Select your role to continue</p>
          
          <button 
            onClick={() => setView(AppView.STUDENT_CHECKIN)}
            className="w-full group relative flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-500 transition-all hover:shadow-lg"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <User size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800">Student</h3>
                <p className="text-xs text-slate-500">Check-in for class</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
              ➜
            </div>
          </button>

          <button 
            onClick={() => setView(AppView.TEACHER_DASHBOARD)}
            className="w-full group relative flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-purple-500 transition-all hover:shadow-lg"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <LayoutDashboard size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800">Administrator</h3>
                <p className="text-xs text-slate-500">Manage system & logs</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
              ➜
            </div>
          </button>

        </div>

        <div className="bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-400">
            Powered by Gemini AI • React • Tailwind
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;