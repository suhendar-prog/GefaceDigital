
import React, { useState } from 'react';
import { Camera, MapPin, CheckCircle, AlertCircle, ScanLine, ArrowRight, Loader2, Mic, Shield, Clock } from 'lucide-react';
import CameraCapture from './CameraCapture';
import { extractDetailsFromIDCard, verifySelfie, ExtractedID } from '../services/gemini';
import { saveAttendance, getSettings, getStudents } from '../services/storage';
import { LocationData } from '../types';
import { sendTelegramMessage, formatMessage } from '../services/notification';

interface StudentCheckInProps {
  onBack: () => void;
  onSuccess: () => void;
}

const StudentCheckIn: React.FC<StudentCheckInProps> = ({ onBack, onSuccess }) => {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [step, setStep] = useState<number>(0); // 0: ID Method, 1: Scan ID, 2: Confirm ID, 3: Selfie, 4: Location, 5: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idData, setIdData] = useState<ExtractedID | null>(null);
  const [manualId, setManualId] = useState('');
  const [manualName, setManualName] = useState('');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [verificationResult, setVerificationResult] = useState<{status: string, note: string} | null>(null);
  
  // Late Status State
  const [attendanceStatus, setAttendanceStatus] = useState<{isLate: boolean, minutesLate: number, time: string} | null>(null);

  // --- Permission Handler ---
  const requestPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Request Camera & Mic
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Stop tracks immediately as we just wanted to trigger the permission prompt
      stream.getTracks().forEach(track => track.stop());

      // 2. Request Location
      await new Promise<void>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not supported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });

      setPermissionsGranted(true);
    } catch (err) {
      console.error(err);
      setError("Access denied. Please allow Camera, Microphone, and Location permissions in your browser settings to continue.");
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleIDScanCapture = async (imageSrc: string) => {
    setLoading(true);
    setError(null);
    try {
      // Send to Gemini
      const result = await extractDetailsFromIDCard(imageSrc);
      setIdData(result);
      if (result.valid) {
        setStep(2); // Review extracted data
      } else {
        setError("Could not read ID card. Please try again or use manual entry.");
      }
    } catch (err) {
      setError("AI Service error. Please use manual entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId || !manualName) return;
    setIdData({ studentId: manualId, name: manualName, valid: true });
    setStep(3); // Go straight to selfie
  };

  const handleConfirmID = () => {
    setStep(3);
  };

  const handleSelfieCapture = async (imageSrc: string) => {
    setSelfieImage(imageSrc);
    setLoading(true);
    // Optional: Verify liveness immediately or just store it. 
    // Let's verify it to show off Gemini.
    const verify = await verifySelfie(imageSrc);
    setVerificationResult(verify);
    setLoading(false);
    setStep(4);
  };

  const handleGetLocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setLoading(false);
      },
      (err) => {
        setError("Unable to retrieve your location. Please ensure GPS is enabled.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!idData || !selfieImage || !location) return;

    setLoading(true);
    const settings = getSettings();
    const now = Date.now();
    
    // Check Late Status
    const currentTime = new Date(now);
    const [startHour, startMinute] = settings.startTime.split(':').map(Number);
    const deadline = new Date(currentTime);
    deadline.setHours(startHour, startMinute, 0, 0);
    
    const isLate = currentTime > deadline;
    const minutesLate = isLate ? Math.floor((currentTime.getTime() - deadline.getTime()) / 60000) : 0;
    
    setAttendanceStatus({
      isLate,
      minutesLate,
      time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    saveAttendance({
      id: crypto.randomUUID(),
      studentId: idData.studentId,
      studentName: idData.name,
      timestamp: now,
      location: location,
      selfieUrl: selfieImage,
      verificationStatus: (verificationResult?.status as any) || 'pending',
      verificationNote: verificationResult?.note
    });

    // Send Notifications
    try {
        const students = getStudents();
        const student = students.find(s => s.id === idData.studentId);

        if (student && settings.telegramBotToken && student.telegramChatId) {
           const message = formatMessage(settings.notificationTemplate, {
             student_name: idData.name,
             school_name: settings.schoolName,
             date: new Date(now).toLocaleDateString(),
             time: new Date(now).toLocaleTimeString()
           });
           
           await sendTelegramMessage(settings.telegramBotToken, student.telegramChatId, message);
        }
    } catch(e) {
        console.error("Notification failed", e);
    }
    
    setLoading(false);
    setStep(5); // Show Success/Result Screen
  };

  // --- Renders ---

  // Global Loader for non-camera steps
  if (loading && step !== 1 && step !== 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-slate-600 font-medium">Processing...</p>
      </div>
    );
  }

  // --- Permission Screen ---
  if (!permissionsGranted) {
    return (
      <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto pt-8">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2">
          <Shield size={32} />
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Permissions Required</h2>
          <p className="text-slate-500">To check in securely, GeoFace needs the following permissions:</p>
        </div>

        <div className="w-full bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Camera</h3>
              <p className="text-xs text-slate-500">Required for ID scanning and selfie verification.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
              <Mic size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Microphone</h3>
              <p className="text-xs text-slate-500">Required for system security checks.</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-green-50 p-2 rounded-lg text-green-600">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Location</h3>
              <p className="text-xs text-slate-500">Required to verify you are at school.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="w-full bg-red-50 border border-red-100 p-3 rounded-lg flex items-center space-x-3 text-red-600 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button 
          onClick={requestPermissions}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center space-x-2"
        >
          <span>Allow Access & Continue</span>
          <ArrowRight size={18} />
        </button>

        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm">
          Cancel
        </button>
      </div>
    );
  }

  // Step 0: Choose Method
  if (step === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center text-slate-800">Check In</h2>
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => setStep(1)}
            className="flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <ScanLine size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-800">Scan ID Card</h3>
                <p className="text-sm text-slate-500">Use AI to read your card</p>
              </div>
            </div>
            <ArrowRight className="text-slate-300 group-hover:text-indigo-500" />
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label>
              <input 
                required
                type="text" 
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: STU-2023-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                required
                type="text" 
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: John Doe"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 transition-colors"
            >
              Continue Manually
            </button>
          </form>
        </div>
        <button onClick={onBack} className="w-full text-slate-500 text-sm hover:text-slate-800">Cancel</button>
      </div>
    );
  }

  // Step 1: Scan ID
  if (step === 1) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center mb-2">Scan Your ID Card</h2>
        <p className="text-center text-slate-500 text-sm mb-4">Place your ID card within the frame.</p>
        <CameraCapture 
          label="Capture ID Card" 
          onCapture={handleIDScanCapture} 
          facingMode="environment"
          isProcessing={loading} 
        />
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}
        <button 
          onClick={() => setStep(0)} 
          className="w-full py-3 text-slate-500"
          disabled={loading}
        >
          Back
        </button>
      </div>
    );
  }

  // Step 2: Confirm ID
  if (step === 2 && idData) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Confirm Details</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center space-x-3">
             <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
               <CheckCircle />
             </div>
             <div>
               <p className="text-sm text-slate-500">AI Successfully Scanned</p>
               <p className="font-bold text-slate-800">Data Extracted</p>
             </div>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Student Name</span>
              <p className="text-lg font-medium text-slate-900">{idData.name}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Student ID</span>
              <p className="text-lg font-medium text-slate-900">{idData.studentId}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={handleConfirmID}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md"
        >
          Yes, That's Me
        </button>
        <button onClick={() => setStep(1)} className="w-full text-slate-500 text-sm">Retake Scan</button>
      </div>
    );
  }

  // Step 3: Selfie
  if (step === 3) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center mb-2">Take a Selfie</h2>
        <p className="text-center text-slate-500 text-sm mb-4">Ensure your face is clearly visible for verification.</p>
        <CameraCapture 
          label="Take Selfie" 
          onCapture={handleSelfieCapture} 
          facingMode="user" 
          isProcessing={loading}
        />
      </div>
    );
  }

  // Step 4: Location & Submit
  if (step === 4) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Final Step</h2>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Selfie Preview */}
          <div className="aspect-video w-full bg-slate-100 relative">
             {selfieImage && <img src={selfieImage} alt="Selfie" className="w-full h-full object-cover" />}
             <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded-md backdrop-blur-md">
                {verificationResult?.status === 'verified' ? '✅ Face Verified' : '⚠️ Verification Pending'}
             </div>
          </div>
          
          <div className="p-6 space-y-6">
             {/* ID Info */}
             <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                   <h3 className="font-bold text-slate-800">{idData?.name}</h3>
                   <p className="text-sm text-slate-500">{idData?.studentId}</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                  READY
                </div>
             </div>

             {/* Location Section */}
             <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-800 font-medium">
                  <MapPin className="text-indigo-600" size={20} />
                  <span>Location</span>
                </div>
                
                {!location ? (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                    <p className="text-slate-500 text-sm mb-3">Location is required for attendance.</p>
                    <button 
                      onClick={handleGetLocation}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm hover:bg-slate-50 transition-colors"
                    >
                      📍 Get My Location
                    </button>
                    {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                  </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-start space-x-3">
                     <div className="bg-white p-1 rounded-full shadow-sm text-green-600 mt-1">
                        <CheckCircle size={16} />
                     </div>
                     <div>
                        <p className="text-sm font-medium text-green-900">Location Locked</p>
                        <p className="text-xs text-green-700 mt-1">
                          Lat: {location.latitude.toFixed(5)}, Long: {location.longitude.toFixed(5)}
                          <br />
                          <span className="opacity-75">Accuracy: {Math.round(location.accuracy)}m</span>
                        </p>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        <button
          disabled={!location}
          onClick={handleSubmit}
          className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${
            location 
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-indigo-500/30' 
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Submit Attendance
        </button>
      </div>
    );
  }

  // Step 5: Success & Late Status Result
  if (step === 5 && attendanceStatus) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
             attendanceStatus.isLate ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-500'
          }`}>
             {attendanceStatus.isLate ? <Clock size={48} /> : <CheckCircle size={48} />}
          </div>

          <div className="space-y-2">
             <h2 className="text-3xl font-bold text-slate-800">Attendance Recorded!</h2>
             <p className="text-slate-500">Absensi Berhasil</p>
          </div>

          <div className={`w-full max-w-sm p-4 rounded-xl border-l-4 shadow-sm text-left ${
             attendanceStatus.isLate ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'
          }`}>
             <h3 className={`font-bold text-lg ${
                attendanceStatus.isLate ? 'text-orange-700' : 'text-green-700'
             }`}>
                {attendanceStatus.isLate ? 'You are Late (Terlambat)' : 'On Time (Tepat Waktu)'}
             </h3>
             <p className="text-slate-600 text-sm mt-1">
               {attendanceStatus.isLate 
                  ? `You arrived ${attendanceStatus.minutesLate} minutes after the start time.` 
                  : "Thank you for arriving on time."}
             </p>
             <div className="mt-3 pt-3 border-t border-black/5 flex justify-between items-center text-sm font-medium text-slate-700">
                <span>Clock In Time:</span>
                <span>{attendanceStatus.time}</span>
             </div>
          </div>

          <div className="w-full max-w-sm space-y-3">
             <button 
               onClick={onSuccess}
               className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
             >
               Return to Home
             </button>
          </div>
       </div>
    );
  }

  return null;
};

export default StudentCheckIn;
