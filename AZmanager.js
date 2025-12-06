import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp
} from 'firebase/firestore';
import { 
  Calendar, MessageSquare, CheckCircle, XCircle, 
  LogOut, Image as ImageIcon, CreditCard, Users, Bell, 
  MapPin, Eye, EyeOff, Lock, Copy, Unlock, Ban, Trash2, 
  Upload, Plus, ChevronLeft, Settings, Mail, Key
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Utility Functions ---
const generateUsername = (fullName, count) => {
  const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
  const sequence = String(count + 1).padStart(3, '0');
  return `${cleanName}.${sequence}`;
};

const generatePassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// Image Compression
const compressImage = (file, maxWidth = 800, quality = 0.5) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          const maxHeight = maxWidth;
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Custom Components ---

const Notification = ({ message, type, onClose }) => {
  if (!message) return null;
  const bg = type === 'error' ? 'bg-red-900/90 border-red-500' : 'bg-green-900/90 border-green-500';
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl border ${bg} text-white flex items-center gap-2 animate-in fade-in slide-in-from-top-4`}>
      {type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 hover:text-gray-300"><XCircle size={16} /></button>
    </div>
  );
};

const BjjLogo = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 20h18L12 4z" />
    <path d="M12 14v6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const AuthScreen = ({ onLogin, onRegister, onRecover }) => {
  const [view, setView] = useState('login'); // login, register, recover
  const [successCredentials, setSuccessCredentials] = useState(null);
  const [formData, setFormData] = useState({
    username: '', password: '', fullName: '', idCard: '', age: '', gender: 'Male', experience: 'None', phone: ''
  });
  const [recoverEmail, setRecoverEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (view === 'register') {
      const creds = await onRegister(formData);
      if (creds) setSuccessCredentials(creds);
    } else if (view === 'login') {
      await onLogin(formData.username.trim().toLowerCase(), formData.password);
    } else if (view === 'recover') {
      await onRecover(recoverEmail);
      setView('login');
    }
    setLoading(false);
  };

  const handleCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try { document.execCommand('copy'); } catch (err) { console.error(err); }
    document.body.removeChild(textArea);
  };

  if (successCredentials) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-100 relative overflow-hidden">
        <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-md border border-green-500/30 rounded-2xl shadow-2xl p-8 z-10 text-center animate-in zoom-in-95">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4 text-green-400"><CheckCircle size={32} /></div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-zinc-400 text-sm mb-6">Your account has been created. Please save these credentials.</p>
          <div className="space-y-4 mb-8">
            <div className="bg-black/50 p-4 rounded-lg border border-zinc-800 flex justify-between items-center group">
              <div className="text-left"><p className="text-xs text-zinc-500 uppercase">Username</p><p className="text-lg font-mono font-bold text-white tracking-wide">{successCredentials.username}</p></div>
              <button onClick={() => handleCopy(successCredentials.username)} className="p-2 text-zinc-500 hover:text-white transition-colors active:scale-95"><Copy size={16}/></button>
            </div>
            <div className="bg-black/50 p-4 rounded-lg border border-zinc-800 flex justify-between items-center group">
              <div className="text-left"><p className="text-xs text-zinc-500 uppercase">Password</p><p className="text-lg font-mono font-bold text-purple-400 tracking-wide">{successCredentials.password}</p></div>
              <button onClick={() => handleCopy(successCredentials.password)} className="p-2 text-zinc-500 hover:text-white transition-colors active:scale-95"><Copy size={16}/></button>
            </div>
          </div>
          <button onClick={() => { setSuccessCredentials(null); setView('login'); setFormData({ ...formData, username: successCredentials.username, password: '' }); }} className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors">Proceed to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
         <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-900 rounded-full blur-3xl"></div>
         <div className="absolute top-1/2 right-0 w-64 h-64 bg-zinc-800 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl p-8 z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4 shadow-lg shadow-purple-900/50">
            <BjjLogo size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">AZ Academy</h1>
          <p className="text-purple-400 font-medium">BJJ Dojo Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {view === 'login' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
                <input type="text" required className="auth-input" placeholder="admin or username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
                <input type="password" required className="auth-input" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                <div className="text-right mt-1">
                  <button type="button" onClick={() => setView('recover')} className="text-xs text-purple-400 hover:text-purple-300">Forgot Password?</button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="auth-btn">
                {loading ? 'Processing...' : 'Login'}
              </button>
            </>
          )}

          {view === 'register' && (
            <div className="space-y-3">
              <div className="h-96 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                <input type="text" placeholder="Full Name" required className="auth-input" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                <input type="text" placeholder="ID Card Number" required className="auth-input" value={formData.idCard} onChange={e => setFormData({...formData, idCard: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Age" required className="auth-input" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                  <select className="auth-input" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <input type="text" placeholder="Phone Number" required className="auth-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <textarea placeholder="Previous Experience" className="auth-input h-20" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} className="auth-btn">
                {loading ? 'Processing...' : 'Submit Application'}
              </button>
            </div>
          )}

          {view === 'recover' && (
            <div className="space-y-4">
              <div className="bg-zinc-800/50 p-4 rounded border border-zinc-700 text-sm text-zinc-400 mb-4">
                Enter your recovery email. If it matches our records, we will send your credentials.
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Recovery Email</label>
                <input type="email" required className="auth-input" placeholder="admin@example.com" value={recoverEmail} onChange={e => setRecoverEmail(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="auth-btn">Send Recovery Email</button>
            </div>
          )}
        </form>

        <div className="mt-6">
          <button 
            onClick={() => setView(view === 'login' ? 'register' : 'login')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg border border-zinc-700 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group"
          >
            {view === 'register' || view === 'recover' ? (
               <> <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Login </>
            ) : (
               <> <Plus size={18} /> New Student? Join Academy </>
            )}
          </button>
        </div>
      </div>
      <style>{`
        .auth-input { width: 100%; background-color: #09090b; border: 1px solid #27272a; border-radius: 0.5rem; padding: 0.75rem 1rem; color: white; outline: none; transition: border-color 0.2s; }
        .auth-input:focus { border-color: #a855f7; }
        .auth-btn { width: 100%; background-color: #9333ea; color: white; font-weight: bold; padding: 0.75rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(147, 51, 234, 0.3); transition: all 0.2s; }
        .auth-btn:hover { background-color: #7e22ce; }
        .auth-btn:disabled { opacity: 0.5; }
        .auth-btn:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
};

const AdminDashboard = ({ currentUser, users, schedule, attendance, messages, payments, scheduleImage, actions }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [newMessage, setNewMessage] = useState('');
  const [targetUser, setTargetUser] = useState('all');
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', location: '', classType: 'Gi' });
  const [sortConfig, setSortConfig] = useState({ key: 'fullName', direction: 'ascending' });
  const [viewPassword, setViewPassword] = useState({});
  const [chatImage, setChatImage] = useState(null);
  
  // Settings State
  const [adminForm, setAdminForm] = useState({ username: currentUser.username, password: currentUser.password, email: currentUser.email || '' });

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const pendingAttendance = attendance.filter(a => a.status === 'pending');

  const handlePostSchedule = (e) => { e.preventDefault(); actions.addSchedule(scheduleForm); setScheduleForm({ date: '', time: '', location: '', classType: 'Gi' }); };
  const handleUploadScheduleImage = async (e) => { const f = e.target.files[0]; if (f) { try { const c = await compressImage(f, 1200, 0.7); actions.uploadScheduleImage(c); } catch (err) { console.error(err); } } };
  const handleSendMessage = (e) => { e.preventDefault(); if (!newMessage && !chatImage) return; actions.sendMessage(newMessage, targetUser, chatImage); setNewMessage(''); setChatImage(null); };
  const handleChatImageUpload = async (e) => { const f = e.target.files[0]; if (f) { try { const c = await compressImage(f, 800, 0.5); setChatImage(c); } catch (err) { console.error(err); } } };
  const togglePassword = (uid) => { setViewPassword(prev => ({ ...prev, [uid]: !prev[uid] })); };
  
  const handleUpdateAdminProfile = (e) => {
    e.preventDefault();
    actions.updateAdminProfile(adminForm);
  };

  const sortedUsers = [...users.filter(u => u.role !== 'admin')];
  sortedUsers.sort((a, b) => {
    if (sortConfig.key === 'paymentStatus') {
      const isPaidA = a.paymentPaidUntil && new Date(a.paymentPaidUntil.toDate()) > new Date();
      const isPaidB = b.paymentPaidUntil && new Date(b.paymentPaidUntil.toDate()) > new Date();
      return sortConfig.direction === 'ascending' ? (isPaidA === isPaidB ? 0 : isPaidA ? -1 : 1) : (isPaidA === isPaidB ? 0 : isPaidA ? 1 : -1);
    }
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; }
    setSortConfig({ key, direction });
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-900/40"><BjjLogo size={20} className="text-white" /></div>
          <div><h1 className="font-bold text-lg leading-tight">Admin Portal</h1><p className="text-xs text-zinc-400">Master Control</p></div>
        </div>
        <button onClick={actions.logout} className="p-2 bg-zinc-800 rounded-full hover:bg-red-900/50 hover:text-red-400 transition-colors"><LogOut size={20} /></button>
      </header>

      <div className="flex overflow-x-auto p-2 gap-2 bg-zinc-950 border-b border-zinc-800 scrollbar-hide">
        {['users', 'schedule', 'attendance', 'messages', 'settings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'users' && pendingPayments.length > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-yellow-500 inline-block" />}
            {tab === 'attendance' && pendingAttendance.length > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-blue-500 inline-block" />}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {activeTab === 'users' && (
          <div className="space-y-4">
             {pendingPayments.length > 0 && (
               <div className="mb-6 bg-zinc-900 border border-yellow-500/30 p-4 rounded-xl">
                 <h3 className="text-yellow-500 font-bold mb-3 flex items-center gap-2"><Bell size={18} /> Review Pending Payments ({pendingPayments.length})</h3>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                   {pendingPayments.map(payment => {
                     const payer = users.find(u => u.uid === payment.userId);
                     return (
                       <div key={payment.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                         <div className="flex justify-between items-start mb-2"><div><p className="font-bold text-white text-sm">{payer?.fullName || 'Unknown'}</p><p className="text-xs text-zinc-400">Month: {payment.monthInfo}</p></div></div>
                         <div className="w-full h-24 bg-black rounded mb-2 flex items-center justify-center border border-zinc-800 overflow-hidden cursor-pointer group">
                           {payment.imageUrl ? <img src={payment.imageUrl} alt="Receipt" className="object-cover w-full h-full group-hover:scale-110 transition-transform" onClick={() => { const w = window.open(""); w.document.write('<img src="'+payment.imageUrl+'"/>'); }} /> : <span className="text-zinc-600 text-xs">No Image</span>}
                         </div>
                         <div className="flex gap-2"><button onClick={() => actions.approvePayment(payment.id, payment.userId, 1)} className="flex-1 bg-green-900/50 hover:bg-green-800 border border-green-700 text-green-200 text-xs font-bold py-1 rounded">Accept 1 Mo.</button></div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
             <div className="overflow-x-auto rounded-xl border border-zinc-800 shadow-xl">
                <table className="w-full text-left text-sm bg-zinc-900">
                  <thead className="bg-zinc-950 text-xs uppercase text-zinc-400 font-medium">
                    <tr><th onClick={() => requestSort('fullName')} className="p-4 cursor-pointer hover:text-white">Student Details</th><th className="p-4">Login</th><th onClick={() => requestSort('belt')} className="p-4 cursor-pointer hover:text-white">Belt</th><th onClick={() => requestSort('paymentStatus')} className="p-4 cursor-pointer hover:text-white">Pay Status</th><th className="p-4">Attendance</th><th className="p-4 text-center">Msg</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {sortedUsers.map((user) => {
                      const isPaid = user.paymentPaidUntil && new Date(user.paymentPaidUntil.toDate()) > new Date();
                      const userAtt = attendance.filter(a => a.userId === user.uid && a.status === 'approved');
                      return (
                        <tr key={user.uid} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="p-4"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${user.belt === 'White' ? 'bg-gray-200 text-black' : user.belt === 'Blue' ? 'bg-blue-600 text-white' : user.belt === 'Purple' ? 'bg-purple-600 text-white' : user.belt === 'Brown' ? 'bg-amber-800 text-white' : 'bg-black border border-zinc-600 text-white'}`}>{user.belt ? user.belt[0] : 'W'}</div><div><p className="font-bold text-white">{user.fullName}</p><p className="text-xs text-zinc-500">ID: {user.idCard}</p></div></div></td>
                          <td className="p-4"><div className="space-y-1"><p className="text-xs text-zinc-400">User: <span className="text-zinc-200 font-mono">{user.username}</span></p><div className="flex items-center gap-2"><p className="text-xs text-zinc-400">Pass:</p>{viewPassword[user.uid] ? <span className="text-purple-400 font-mono text-xs">{user.password}</span> : <span className="text-zinc-600 text-xs">••••••</span>}<button onClick={() => togglePassword(user.uid)} className="text-zinc-500 hover:text-white">{viewPassword[user.uid] ? <EyeOff size={12}/> : <Eye size={12}/>}</button></div></div></td>
                          <td className="p-4"><select className="bg-zinc-950 border border-zinc-700 text-xs text-zinc-300 rounded px-2 py-1 outline-none focus:border-purple-500" value={user.belt || 'White'} onChange={(e) => actions.assignBelt(user.uid, e.target.value)}>{['White', 'Blue', 'Purple', 'Brown', 'Black'].map(b => <option key={b}>{b}</option>)}</select></td>
                          <td className="p-4">{isPaid ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-900/30 text-green-400 text-xs border border-green-500/20"><CheckCircle size={10} /> Paid</span> : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-900/30 text-red-400 text-xs border border-red-500/20"><XCircle size={10} /> Unpaid</span>}</td>
                          <td className="p-4"><div className="text-xs"><span className="text-zinc-300 font-bold">{userAtt.length}</span> Classes</div></td>
                          <td className="p-4 text-center"><button onClick={() => actions.toggleMute(user.uid, user.isMuted)} className={`p-2 rounded-lg transition-colors ${user.isMuted ? 'bg-red-900/50 text-red-400 hover:bg-red-900' : 'bg-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-700'}`} title={user.isMuted ? "Unmute Student" : "Mute Student"}>{user.isMuted ? <Lock size={14}/> : <Unlock size={14}/>}</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="font-bold mb-4 text-purple-400 flex items-center gap-2"><ImageIcon size={18}/> Monthly Schedule Image</h3>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg min-h-[200px] flex items-center justify-center overflow-hidden relative">
                  {scheduleImage ? <><img src={scheduleImage} alt="Schedule" className="w-full h-full object-contain" /><button onClick={actions.removeScheduleImage} className="absolute top-2 right-2 bg-red-600 p-2 rounded-full text-white shadow-lg hover:bg-red-500"><Trash2 size={16}/></button></> : <div className="text-zinc-600 text-center p-4"><Calendar size={40} className="mx-auto mb-2 opacity-20"/><p className="text-sm">No image uploaded</p></div>}
                </div>
                <div className="w-full md:w-auto flex flex-col gap-2">
                  <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg cursor-pointer flex items-center gap-2 text-sm font-medium transition-colors"><input type="file" accept="image/*" className="hidden" onChange={handleUploadScheduleImage}/><Upload size={16}/> Upload New Image</label>
                  <p className="text-xs text-zinc-500 max-w-[200px]">Upload a screenshot of the monthly calendar. Replaces the current image.</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="font-bold mb-4 text-purple-400">Add Individual Class</h3>
              <form onSubmit={handlePostSchedule} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="date" required className="bg-zinc-950 border border-zinc-800 rounded p-2 text-sm" value={scheduleForm.date} onChange={e => setScheduleForm({...scheduleForm, date: e.target.value})} />
                <input type="time" required className="bg-zinc-950 border border-zinc-800 rounded p-2 text-sm" value={scheduleForm.time} onChange={e => setScheduleForm({...scheduleForm, time: e.target.value})} />
                <input type="text" placeholder="Location (e.g. Male' Dojo)" required className="bg-zinc-950 border border-zinc-800 rounded p-2 text-sm" value={scheduleForm.location} onChange={e => setScheduleForm({...scheduleForm, location: e.target.value})} />
                <select className="bg-zinc-950 border border-zinc-800 rounded p-2 text-sm" value={scheduleForm.classType} onChange={e => setScheduleForm({...scheduleForm, classType: e.target.value})}>
                  <option>Gi Beginners</option>
                  <option>Gi Advanced</option>
                  <option>No-Gi</option>
                  <option>Open Mat</option>
                </select>
                <button type="submit" className="md:col-span-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded transition-colors">Post Class</button>
              </form>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-zinc-400">Upcoming Individual Classes</h3>
              {schedule.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-4">
                    <div className="bg-zinc-950 p-2 rounded text-center min-w-[3.5rem]"><span className="block text-xs text-purple-500 font-bold uppercase">{new Date(s.date).toLocaleDateString('en-US', {weekday: 'short'})}</span><span className="block text-lg font-bold text-white">{new Date(s.date).getDate()}</span></div>
                    <div><h4 className="font-bold text-white">{s.classType}</h4><p className="text-xs text-zinc-400">{s.time} • {s.location}</p></div>
                  </div>
                  <button onClick={() => actions.deleteSchedule(s.id)} className="text-zinc-600 hover:text-red-500"><XCircle size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <h3 className="font-bold mb-4 text-blue-400 flex items-center gap-2"><CheckCircle size={18} /> Approvals Needed</h3>
            {pendingAttendance.length === 0 ? <div className="text-center py-10 text-zinc-600 bg-zinc-900/50 rounded-lg">No pending check-ins.</div> : (
              <div className="grid gap-3">{pendingAttendance.map(att => (
                   <div key={att.id} className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
                     <div><p className="font-bold text-white">{att.userName}</p><p className="text-xs text-zinc-400 flex items-center gap-1"><MapPin size={10}/> {att.dojo || 'Male\' Dojo'} • {formatDate(att.date)}</p></div>
                     <div className="flex gap-2"><button onClick={() => actions.approveAttendance(att.id)} className="p-2 bg-green-600 rounded hover:bg-green-500 text-white"><CheckCircle size={16} /></button><button onClick={() => actions.rejectAttendance(att.id)} className="p-2 bg-red-600 rounded hover:bg-red-500 text-white"><XCircle size={16} /></button></div>
                   </div>
                 ))}</div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
           <div className="flex flex-col h-[calc(100vh-14rem)]">
             <div className="bg-zinc-900 p-4 rounded-t-xl border border-zinc-800">
               <div className="mb-2"><label className="text-xs text-zinc-400 mb-1 block">Recipient</label><select className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white" value={targetUser} onChange={(e) => setTargetUser(e.target.value)}><option value="all">All Students (Blast)</option>{users.filter(u => u.role !== 'admin').map(u => (<option key={u.uid} value={u.uid}>{u.fullName}</option>))}</select></div>
               <div className="flex gap-2 items-end">
                 <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 flex flex-col gap-2">
                    {chatImage && <div className="relative w-20 h-20"><img src={chatImage} className="w-full h-full object-cover rounded" /><button onClick={() => setChatImage(null)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5"><XCircle size={12} className="text-white"/></button></div>}
                    <input type="text" className="bg-transparent text-sm text-white focus:outline-none w-full" placeholder="Type an announcement..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)}/>
                 </div>
                 <label className="p-3 bg-zinc-800 rounded hover:bg-zinc-700 cursor-pointer text-zinc-400 hover:text-white"><input type="file" accept="image/*" className="hidden" onChange={handleChatImageUpload} /><ImageIcon size={20} /></label>
                 <button onClick={handleSendMessage} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded font-bold">Send</button>
               </div>
             </div>
             <div className="flex-1 bg-zinc-950 border-x border-b border-zinc-800 rounded-b-xl overflow-y-auto p-4 space-y-3">
               {messages.map(msg => (
                 <div key={msg.id} className={`p-3 rounded-lg max-w-[80%] ${msg.senderId === 'admin' ? 'ml-auto bg-purple-900/20 border border-purple-500/30' : 'mr-auto bg-zinc-900 border border-zinc-800'}`}>
                    <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-purple-400">{msg.senderId === 'admin' ? 'You' : users.find(u => u.uid === msg.senderId)?.fullName || 'Student'}</span><span className="text-[10px] text-zinc-500">{msg.timestamp?.toDate ? formatDate(msg.timestamp.toDate()) : 'Just now'}</span></div>
                    {msg.imageUrl && <img src={msg.imageUrl} alt="attachment" className="rounded-lg mb-2 max-h-48 object-cover border border-white/10" />}
                    {msg.text && <p className="text-sm text-zinc-200">{msg.text}</p>}
                 </div>
               ))}
             </div>
           </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="font-bold mb-4 text-purple-400 flex items-center gap-2"><Settings size={18}/> Admin Profile</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <form onSubmit={handleUpdateAdminProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Admin Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                    <input type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-purple-500 outline-none" value={adminForm.username} onChange={(e) => setAdminForm({...adminForm, username: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Admin Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                    <input type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-purple-500 outline-none" value={adminForm.password} onChange={(e) => setAdminForm({...adminForm, password: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Recovery Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                    <input type="email" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-purple-500 outline-none" placeholder="admin@example.com" value={adminForm.email} onChange={(e) => setAdminForm({...adminForm, email: e.target.value})} />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">This email will be used to recover your account if you forget your password.</p>
                </div>
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg">Save Changes</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const StudentDashboard = ({ currentUser, schedule, attendance, messages, scheduleImage, actions }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [paymentImage, setPaymentImage] = useState(null);
  const [paymentMonth, setPaymentMonth] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDojo, setSelectedDojo] = useState('Male\' Dojo');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const isPaid = currentUser.paymentPaidUntil && new Date(currentUser.paymentPaidUntil.toDate()) > new Date();
  const myMessages = messages.filter(m => m.recipientId === 'all' || m.recipientId === currentUser.uid || m.senderId === currentUser.uid);

  const handleImageUpload = async (e) => { const f = e.target.files[0]; if (f) { try { const c = await compressImage(f, 800, 0.5); setPaymentImage(c); } catch (e) { console.error(e); } } };
  const submitPayment = () => { if (!paymentImage) return; setIsUploading(true); actions.submitPayment(paymentImage, paymentMonth); setTimeout(() => { setIsUploading(false); setPaymentImage(null); setPaymentMonth(''); }, 1000); };
  const handleChangePassword = () => { if(newPassword.length < 4) return alert("Password too short"); actions.changePassword(newPassword); setShowPasswordInput(false); setNewPassword(''); };
  const handleSendChat = () => { if(!chatMessage.trim()) return; actions.sendMessage(chatMessage, 'admin'); setChatMessage(''); };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
       <div className="bg-zinc-900 p-4 flex justify-between items-center shadow-lg z-10">
         <div><h1 className="font-bold text-lg text-white">AZ Academy</h1><p className="text-xs text-purple-400">Welcome, {currentUser.fullName.split(' ')[0]}</p></div>
         <div className="flex items-center gap-3">
            {isPaid ? <div className="flex items-center gap-1 bg-green-900/30 border border-green-500/30 px-3 py-1 rounded-full"><BjjLogo size={14} className="text-green-500 fill-green-500" /><span className="text-xs font-bold text-green-400">Active</span></div> : <div className="flex items-center gap-1 bg-red-900/30 border border-red-500/30 px-3 py-1 rounded-full"><BjjLogo size={14} className="text-red-500" /><span className="text-xs font-bold text-red-400">Unpaid</span></div>}
            <button onClick={actions.logout} className="text-zinc-500 hover:text-white"><LogOut size={20}/></button>
         </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 pb-24">
         {activeTab === 'home' && (
           <div className="space-y-6">
             <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
               <div className="flex justify-between items-start mb-6">
                 <div><p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Student ID</p><p className="text-xl font-bold text-white tracking-wide">{currentUser.idCard}</p></div>
                 <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg border ${currentUser.belt === 'White' ? 'bg-white text-black border-zinc-200' : currentUser.belt === 'Blue' ? 'bg-blue-600 text-white border-blue-400' : currentUser.belt === 'Purple' ? 'bg-purple-600 text-white border-purple-400' : currentUser.belt === 'Brown' ? 'bg-amber-800 text-white border-amber-600' : 'bg-black text-white border-zinc-700'}`}>{currentUser.belt ? currentUser.belt[0] : 'W'}</div>
               </div>
               <div className="space-y-1">
                 <p className="text-zinc-400 text-sm">Full Name</p><p className="text-lg font-medium text-white">{currentUser.fullName}</p>
                 <div className="mt-4 pt-4 border-t border-zinc-800">
                    <button onClick={() => setShowPasswordInput(!showPasswordInput)} className="text-xs text-purple-400 underline">Change Password</button>
                    {showPasswordInput && (<div className="flex gap-2 mt-2"><input type="text" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-zinc-800 rounded px-2 py-1 text-sm flex-1"/><button onClick={handleChangePassword} className="bg-purple-600 px-3 py-1 rounded text-xs font-bold">Save</button></div>)}
                 </div>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4"><button onClick={() => setActiveTab('attendance')} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"><div className="w-10 h-10 bg-purple-900/30 rounded-full flex items-center justify-center text-purple-400"><CheckCircle size={20} /></div><span className="text-sm font-bold">Check In</span></button><button onClick={() => setActiveTab('payment')} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"><div className="w-10 h-10 bg-green-900/30 rounded-full flex items-center justify-center text-green-400"><CreditCard size={20} /></div><span className="text-sm font-bold">Pay Fees</span></button></div>
           </div>
         )}

         {activeTab === 'attendance' && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in zoom-in">
               <div className="text-center"><h2 className="text-2xl font-bold text-white mb-2">Class Check-In</h2><p className="text-zinc-400 text-sm">Select your location and tap below.</p></div>
               <select value={selectedDojo} onChange={(e) => setSelectedDojo(e.target.value)} className="bg-zinc-900 border border-zinc-700 text-white p-3 rounded-lg w-64 text-center focus:border-purple-500 outline-none"><option>Male' Dojo</option><option>Hulhumale Dojo</option></select>
               <button onClick={() => { actions.checkIn(selectedDojo); setActiveTab('home'); }} className="w-48 h-48 rounded-full bg-purple-600 shadow-[0_0_50px_rgba(147,51,234,0.3)] flex items-center justify-center border-4 border-purple-400 active:scale-90 transition-all cursor-pointer"><div className="flex flex-col items-center"><Users size={40} className="text-white mb-2" /><span className="text-white font-bold text-lg">TAP HERE</span></div></button>
            </div>
         )}

         {activeTab === 'payment' && (
           <div className="space-y-6">
             <h2 className="text-xl font-bold text-white">Monthly Payment</h2>
             <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
               <label className="block text-sm text-zinc-400 mb-2">1. Upload Transfer Screenshot</label>
               <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-purple-500 transition-colors cursor-pointer relative"><input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />{paymentImage ? <img src={paymentImage} alt="Preview" className="h-32 mx-auto object-contain" /> : <div className="flex flex-col items-center text-zinc-500"><ImageIcon size={32} className="mb-2" /><span className="text-xs">Tap to upload image</span></div>}</div>
             </div>
             <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
               <label className="block text-sm text-zinc-400 mb-2">2. Select Month(s)</label>
               <input type="text" placeholder="e.g. October 2023" className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white focus:border-purple-500 outline-none" value={paymentMonth} onChange={(e) => setPaymentMonth(e.target.value)} />
             </div>
             <button onClick={submitPayment} disabled={!paymentImage || !paymentMonth || isUploading} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2">{isUploading ? 'Sending...' : <><CreditCard size={20} /> Confirm Payment</>}</button>
           </div>
         )}
         
         {activeTab === 'schedule' && (
           <div className="space-y-4">
             <h2 className="text-xl font-bold text-white mb-2">Class Schedule</h2>
             {scheduleImage && (<div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-4 shadow-lg"><img src={scheduleImage} alt="Monthly Schedule" className="w-full h-auto object-contain" /></div>)}
             {schedule.length > 0 ? (schedule.map(s => (<div key={s.id} className="flex items-center gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800"><div className="bg-purple-900/20 p-3 rounded-lg text-center min-w-[4rem] border border-purple-500/20"><span className="block text-xs text-purple-400 font-bold uppercase">{new Date(s.date).toLocaleDateString('en-US', {weekday: 'short'})}</span><span className="block text-xl font-bold text-white">{new Date(s.date).getDate()}</span></div><div><h4 className="font-bold text-white text-lg">{s.classType}</h4><p className="text-sm text-zinc-400">{s.time} • {s.location}</p></div></div>))) : (!scheduleImage && <p className="text-zinc-600 text-center py-8 italic">No schedule posted yet.</p>)}
           </div>
         )}

         {activeTab === 'chat' && (
             <div className="flex flex-col h-[calc(100vh-10rem)]">
               <h2 className="text-xl font-bold text-white mb-4">Group Chat</h2>
               <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-y-auto p-4 space-y-3 mb-3">
                  {myMessages.map(msg => (
                     <div key={msg.id} className={`p-3 rounded-lg max-w-[85%] ${msg.senderId === currentUser.uid ? 'ml-auto bg-purple-600 text-white' : 'mr-auto bg-zinc-950 border border-zinc-800 text-zinc-300'}`}>
                        <div className="flex justify-between items-baseline gap-2 mb-1"><span className={`text-xs font-bold ${msg.senderId === currentUser.uid ? 'text-purple-200' : 'text-purple-400'}`}>{msg.senderId === 'admin' ? 'Admin' : 'You'}</span><span className="text-[10px] opacity-70">{msg.timestamp?.toDate ? formatDate(msg.timestamp.toDate()) : 'Now'}</span></div>
                        {msg.imageUrl && <img src={msg.imageUrl} alt="attachment" className="rounded-lg mb-2 max-h-48 object-cover border border-white/10" />}
                        {msg.text && <p className="text-sm">{msg.text}</p>}
                     </div>
                   ))}
               </div>
               {currentUser.isMuted ? (<div className="flex items-center justify-center gap-2 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 animate-in slide-in-from-bottom-2"><Ban size={20} /><span className="text-sm font-bold">You have been muted by the administrator.</span></div>) : (<div className="flex gap-2"><input type="text" placeholder="Message admin..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 text-white focus:border-purple-500 outline-none" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleSendChat(); }}/><button onClick={handleSendChat} className="bg-purple-600 p-3 rounded-lg text-white"><MessageSquare size={20} /></button></div>)}
             </div>
         )}
       </div>

       <div className="fixed bottom-0 w-full bg-zinc-950 border-t border-zinc-800 p-2 flex justify-around items-center safe-area-bottom z-50">
          <button onClick={() => setActiveTab('home')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'home' ? 'text-purple-500' : 'text-zinc-500'}`}><BjjLogo size={24} /><span className="text-[10px] mt-1">Home</span></button>
          <button onClick={() => setActiveTab('schedule')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'schedule' ? 'text-purple-500' : 'text-zinc-500'}`}><Calendar size={24} /><span className="text-[10px] mt-1">Schedule</span></button>
          <div className="relative -top-5"><button onClick={() => setActiveTab('payment')} className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-900/50 border-4 border-zinc-950"><Plus size={28} /></button></div>
          <button onClick={() => setActiveTab('chat')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'chat' ? 'text-purple-500' : 'text-zinc-500'}`}><MessageSquare size={24} /><span className="text-[10px] mt-1">Chat</span></button>
          <button onClick={() => setActiveTab('attendance')} className={`p-2 rounded-lg flex flex-col items-center ${activeTab === 'attendance' ? 'text-purple-500' : 'text-zinc-500'}`}><CheckCircle size={24} /><span className="text-[10px] mt-1">Check-in</span></button>
       </div>
    </div>
  );
};

export default function App() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [scheduleImage, setScheduleImage] = useState(null);
  
  const [allUsers, setAllUsers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [messages, setMessages] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('az_academy_user');
      if (savedUser) setUserData(JSON.parse(savedUser));
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); }
      setLoading(false);
    };
    initAuth();
  }, []);

  // INITIALIZE ADMIN CHECK
  useEffect(() => {
    const checkAdmin = async () => {
      const adminRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', 'admin_master');
      const snap = await getDoc(adminRef);
      if (!snap.exists()) {
        const defaultAdmin = { uid: 'admin_master', role: 'admin', username: 'admin', password: 'admin123', email: '', fullName: 'Administrator' };
        await setDoc(adminRef, defaultAdmin);
      }
    };
    if (auth.currentUser) checkAdmin();
  }, [auth.currentUser]);

  useEffect(() => {
    const usersQ = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubUsers = onSnapshot(usersQ, (snap) => {
      const usersList = snap.docs.map(d => ({uid: d.id, ...d.data()}));
      setAllUsers(usersList);
      if (userData) {
         const myProfile = usersList.find(u => u.uid === userData.uid);
         if (myProfile) { setUserData(myProfile); localStorage.setItem('az_academy_user', JSON.stringify(myProfile)); }
      }
    });
    const schedQ = collection(db, 'artifacts', appId, 'public', 'data', 'schedule');
    const unsubSched = onSnapshot(schedQ, (snap) => { const data = snap.docs.map(d => ({id: d.id, ...d.data()})); data.sort((a, b) => new Date(a.date) - new Date(b.date)); setSchedule(data); });
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'schedule');
    const unsubSettings = onSnapshot(settingsRef, (doc) => { if (doc.exists()) { setScheduleImage(doc.data().imageUrl); } else { setScheduleImage(null); } });
    const attQ = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
    const unsubAtt = onSnapshot(attQ, (snap) => { const data = snap.docs.map(d => ({id: d.id, ...d.data()})); data.sort((a, b) => new Date(b.date) - new Date(a.date)); setAttendance(data); });
    const msgQ = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const unsubMsg = onSnapshot(msgQ, (snap) => { const data = snap.docs.map(d => ({id: d.id, ...d.data()})); data.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)); setMessages(data); });
    const payQ = collection(db, 'artifacts', appId, 'public', 'data', 'payments');
    const unsubPay = onSnapshot(payQ, (snap) => setPayments(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsubUsers(); unsubSched(); unsubAtt(); unsubMsg(); unsubPay(); unsubSettings(); };
  }, [userData?.uid]);

  const notify = (msg, type = 'success') => { setNotification({ message: msg, type }); setTimeout(() => setNotification(null), 3000); };

  const handleLogin = async (username, password) => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const querySnapshot = await getDocs(usersRef);
      const userDocSnapshot = querySnapshot.docs.find(doc => doc.data().username === username);
      if (!userDocSnapshot) throw new Error('User not found');
      const userDoc = userDocSnapshot.data();
      if (userDoc.password !== password) throw new Error('Incorrect password');
      const userObj = { uid: userDocSnapshot.id, ...userDoc };
      setUserData(userObj);
      localStorage.setItem('az_academy_user', JSON.stringify(userObj));
    } catch (e) { notify(e.message, 'error'); } finally { setLoading(false); }
  };

  const handleRegister = async (data) => {
    try {
       const count = allUsers.length;
       const username = generateUsername(data.fullName, count);
       const password = generatePassword();
       const newUserId = crypto.randomUUID();
       const userProfile = { uid: newUserId, role: 'student', username, password, fullName: data.fullName, idCard: data.idCard, age: data.age, gender: data.gender, experience: data.experience, phone: data.phone, belt: 'White', joinedAt: serverTimestamp(), isMuted: false };
       await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', newUserId), userProfile);
       return { username, password };
    } catch (e) { notify('Registration failed: ' + e.message, 'error'); return null; }
  };

  const handleRecover = async (email) => {
    // Simulated recovery
    const adminUser = allUsers.find(u => u.role === 'admin');
    if (adminUser && adminUser.email === email) {
      alert(`SIMULATED EMAIL SENT TO: ${email}\n\nHere are your credentials:\nUsername: ${adminUser.username}\nPassword: ${adminUser.password}`);
    } else {
      notify('If the email exists, a recovery link has been sent.', 'success'); // Security best practice: don't reveal existence
    }
  };

  const handleLogout = () => { setUserData(null); localStorage.removeItem('az_academy_user'); };

  const adminActions = {
    logout: handleLogout,
    approvePayment: async (payId, userId, months) => { const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId); const futureDate = new Date(); futureDate.setMonth(futureDate.getMonth() + months); await updateDoc(userRef, { paymentPaidUntil: futureDate }); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'payments', payId), { status: 'approved' }); notify(`Payment approved for ${months} months`); },
    assignBelt: async (userId, belt) => { const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId); await updateDoc(userRef, { belt }); notify('Belt updated'); },
    addSchedule: async (data) => { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedule'), { ...data, createdAt: serverTimestamp() }); notify('Class added'); },
    deleteSchedule: async (id) => { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedule', id)); notify('Class removed'); },
    uploadScheduleImage: async (base64) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'schedule'), { imageUrl: base64, updatedAt: serverTimestamp() }); notify('Schedule image updated'); },
    removeScheduleImage: async () => { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'schedule')); notify('Schedule image removed'); },
    approveAttendance: async (id) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', id), { status: 'approved' }); },
    rejectAttendance: async (id) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', id), { status: 'rejected' }); },
    sendMessage: async (text, target, image = null) => { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), { text, senderId: 'admin', recipientId: target, imageUrl: image, timestamp: serverTimestamp() }); notify('Message sent'); },
    toggleMute: async (userId, currentStatus) => { const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId); await updateDoc(userRef, { isMuted: !currentStatus }); notify(currentStatus ? 'User unmuted' : 'User muted'); },
    updateAdminProfile: async (data) => {
      const adminRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', 'admin_master');
      await updateDoc(adminRef, { username: data.username, password: data.password, email: data.email });
      notify('Admin Profile Updated');
    }
  };

  const studentActions = {
    logout: handleLogout,
    checkIn: async (dojo) => { const today = new Date().toDateString(); const already = attendance.find(a => a.userId === userData.uid && new Date(a.date).toDateString() === today); if (already) { notify('Already checked in today', 'error'); return; } await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), { userId: userData.uid, userName: userData?.fullName || 'Student', dojo, date: new Date().toISOString(), status: 'pending' }); notify('Check-in sent for approval'); },
    submitPayment: async (imgBase64, month) => { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'payments'), { userId: userData.uid, imageUrl: imgBase64, monthInfo: month, status: 'pending', timestamp: serverTimestamp() }); notify('Payment proof uploaded'); },
    sendMessage: async (text, target) => { if (userData.isMuted) { notify('You are muted', 'error'); return; } await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), { text, senderId: userData.uid, recipientId: target, timestamp: serverTimestamp() }); },
    changePassword: async (newPass) => { const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userData.uid); await updateDoc(userRef, { password: newPass }); setUserData(prev => ({...prev, password: newPass})); notify('Password updated'); }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-purple-500">Loading AZ Academy...</div>;

  return (
    <>
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {!userData ? ( <AuthScreen onLogin={handleLogin} onRegister={handleRegister} onRecover={handleRecover} /> ) : userData.role === 'admin' ? ( <AdminDashboard currentUser={userData} users={allUsers} schedule={schedule} attendance={attendance} messages={messages} payments={payments} scheduleImage={scheduleImage} actions={adminActions} /> ) : ( <StudentDashboard currentUser={userData} schedule={schedule} attendance={attendance} messages={messages} scheduleImage={scheduleImage} actions={studentActions} /> )}
    </>
  );
}
