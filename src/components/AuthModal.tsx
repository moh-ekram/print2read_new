/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus, 
  Chrome, 
  AlertCircle,
  CheckCircle,
  BookOpen,
  PenTool,
  ShieldAlert
} from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { getUserProfileFromFirestore, saveUserProfileToFirestore } from "../lib/firestoreService";
import { UserProfile, UserRole } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("reader");
  const [bio, setBio] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick sandbox login presets
  const handleQuickLogin = async (role: "reader" | "writer" | "admin") => {
    setLoading(true);
    setError(null);
    try {
      let uid = "reader-1";
      if (role === "writer") uid = "writer-1";
      if (role === "admin") uid = "admin-1";

      const response = await fetch(`/api/users/${uid}`);
      if (response.ok) {
        const profile = await response.json();
        setSuccessMsg("সফলভাবে ডেমো অ্যাকাউন্টে প্রবেশ করা হয়েছে!");
        setTimeout(() => {
          onSuccess(profile);
          onClose();
        }, 1000);
      } else {
        throw new Error("ডেমো অ্যাকাউন্ট লোড করা যায়নি।");
      }
    } catch (err: any) {
      setError(err.message || "লগইন করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError("দয়া করে ইমেইল এবং পাসওয়ার্ড প্রদান করুন।");
      return;
    }

    if (activeTab === "register" && !displayName) {
      setError("দয়া করে আপনার সম্পূর্ণ নাম প্রদান করুন।");
      return;
    }

    setLoading(true);

    try {
      if (isFirebaseConfigured && firebaseAuth) {
        // --- REAL FIREBASE MODE ---
        if (activeTab === "login") {
          const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
          const profile = await getUserProfileFromFirestore(userCredential.user.uid);
          if (profile) {
            setSuccessMsg("সফলভাবে লগইন করা হয়েছে!");
            setTimeout(() => {
              onSuccess(profile as UserProfile);
              onClose();
            }, 1000);
          } else {
            throw new Error("ইউজার প্রোফাইল ডাটাবেজে খুঁজে পাওয়া যায়নি।");
          }
        } else {
          // Register
          const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          const profile = await saveUserProfileToFirestore(userCredential.user.uid, {
            displayName,
            role: selectedRole,
            bio: bio || (selectedRole === "writer" ? "লেখক হিসেবে নতুন প্রবন্ধ প্রকাশ করতে ভালোবাসেন।" : "বই পড়তে ও সংগ্রহ করতে ভালোবাসেন।")
          });
          if (profile) {
            setSuccessMsg("নিবন্ধন সফল হয়েছে! স্বাগতম।");
            setTimeout(() => {
              onSuccess(profile as UserProfile);
              onClose();
            }, 1000);
          } else {
            throw new Error("প্রোফাইল তৈরি করা সম্ভব হয়নি।");
          }
        }
      } else {
        // --- SANDBOX MODE ---
        // Simulate email/password login or signup using local REST mock
        const simulatedUid = email.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
        
        if (activeTab === "login") {
          // Look up if user already exists, or lazy load/create
          const response = await fetch(`/api/users/${simulatedUid}`);
          if (response.ok) {
            const profile = await response.json();
            setSuccessMsg("স্যান্ডবক্স মোডে সফলভাবে লগইন করা হয়েছে!");
            setTimeout(() => {
              onSuccess(profile);
              onClose();
            }, 1000);
          } else {
            throw new Error("লগইন করতে ব্যর্থ হয়েছে।");
          }
        } else {
          // Register via PUT
          const response = await fetch(`/api/users/${simulatedUid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              displayName,
              role: selectedRole,
              bio: bio || (selectedRole === "writer" ? "লেখক হিসেবে নতুন প্রবন্ধ প্রকাশ করতে ভালোবাসেন।" : "বই পড়তে ও সংগ্রহ করতে ভালোবাসেন।")
            })
          });

          if (response.ok) {
            const profile = await response.json();
            setSuccessMsg("স্যান্ডবক্স মোডে নিবন্ধন সফল হয়েছে!");
            setTimeout(() => {
              onSuccess(profile);
              onClose();
            }, 1000);
          } else {
            const errData = await response.json();
            throw new Error(errData.error || "নিবন্ধন করতে ব্যর্থ হয়েছে।");
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message;
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        friendlyMessage = "ভুল ইমেইল অথবা পাসওয়ার্ড প্রদান করেছেন।";
      } else if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "এই ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে।";
      } else if (err.code === "auth/weak-password") {
        friendlyMessage = "পাসওয়ার্ডটি অত্যন্ত দুর্বল (কমপক্ষে ৬ ডিজিট দিন)।";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "দয়া করে একটি সঠিক ইমেইল আইডি প্রদান করুন।";
      }
      setError(friendlyMessage || "সার্ভারে যোগাযোগ করতে সমস্যা হচ্ছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      // Sandbox warning or auto Google mock
      setError("গুগল লগইন করতে ফায়ারবেস কনফিগার করা আবশ্যক। নিচের ডেমো বা ইমেইল লগইন ব্যবহার করুন।");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      // Fetch or lazy create user profile
      const profile = await getUserProfileFromFirestore(result.user.uid, {
        displayName: result.user.displayName || "গুগল ইউজার",
        role: "reader",
        bio: "গুগল অ্যাকাউন্টের মাধ্যমে লগইনকৃত পাঠক।"
      });

      if (profile) {
        setSuccessMsg("গুগল অ্যাকাউন্টের মাধ্যমে সফলভাবে লগইন করা হয়েছে!");
        setTimeout(() => {
          onSuccess(profile as UserProfile);
          onClose();
        }, 1000);
      } else {
        throw new Error("প্রোফাইল লোড করতে ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "গুগল সাইন-ইন করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all">
      <div 
        id="auth-modal"
        className="relative w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 md:p-8">
          {/* Header Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black font-sans text-slate-800 tracking-tight flex items-center justify-center gap-2">
              <span className="p-1.5 bg-violet-100 text-violet-700 rounded-xl">Read</span>
              <span>to Print</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">পড়ুন, জমিয়ে রাখুন এবং ফিজিক্যাল প্রিন্ট নিন সহজেই</p>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-100 mb-6 bg-slate-50 p-1 rounded-2xl">
            <button
              onClick={() => { setActiveTab("login"); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "login"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              লগইন
            </button>
            <button
              onClick={() => { setActiveTab("register"); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "register"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              রেজিস্ট্রেশন
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2 text-[11px] text-red-600 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2 text-[11px] text-emerald-600 font-medium animate-bounce">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Main Auth Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {activeTab === "register" && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">সম্পূর্ণ নাম</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="যেমন: সায়মন ইসলাম"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:border-violet-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">ইউজার রোল নির্বাচন করুন</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("reader")}
                      className={`py-3 px-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        selectedRole === "reader"
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-150 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <div className="text-[10px] leading-tight">
                        <p className="font-bold">📖 পাঠক</p>
                        <p className="text-[8px] opacity-80">লেখা পড়বেন ও প্রিন্ট নেবেন</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("writer")}
                      className={`py-3 px-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        selectedRole === "writer"
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-150 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <PenTool className="w-4 h-4" />
                      <div className="text-[10px] leading-tight">
                        <p className="font-bold">✍️ লেখক</p>
                        <p className="text-[8px] opacity-80">নিবন্ধ প্রকাশ করে আয় করবেন</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bio (Optional) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">সংক্ষিপ্ত বায়ো (ঐচ্ছিক)</label>
                  <textarea
                    placeholder="নিজের সম্পর্কে সংক্ষেপে কিছু বলুন..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:border-violet-500 focus:outline-none transition-all resize-none"
                  />
                </div>
              </>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">ইমেইল ঠিকানা</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:border-violet-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">পাসওয়ার্ড</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:border-violet-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Form Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : activeTab === "login" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  প্রবেশ করুন
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  নতুন অ্যাকাউন্ট তৈরি করুন
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2.5 text-slate-400 font-bold">অন্যান্য বিকল্প</span>
            </div>
          </div>

          {/* Google Sign-in */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 border border-slate-150 hover:bg-slate-50 text-slate-600 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 mb-4"
          >
            <Chrome className="w-4 h-4 text-red-500" />
            গুগল দিয়ে সাইন-ইন করুন
          </button>

          {/* Sandboxed Presets (Shown when real Firebase is NOT active to make testing seamless) */}
          {!isFirebaseConfigured && (
            <div className="mt-6 bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-amber-800 flex items-center gap-1.5 mb-2.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                স্যান্ডবক্স ডেমো মোড (এক-ক্লিকে লগইন)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickLogin("reader")}
                  className="py-1.5 px-1 bg-white hover:bg-slate-50 border border-slate-150 rounded-xl text-[9px] font-bold text-slate-700 transition-all cursor-pointer text-center"
                >
                  📖 পাঠক (Demo)
                </button>
                <button
                  onClick={() => handleQuickLogin("writer")}
                  className="py-1.5 px-1 bg-white hover:bg-slate-50 border border-slate-150 rounded-xl text-[9px] font-bold text-slate-700 transition-all cursor-pointer text-center"
                >
                  ✍️ লেখক (Demo)
                </button>
                <button
                  onClick={() => handleQuickLogin("admin")}
                  className="py-1.5 px-1 bg-white hover:bg-slate-50 border border-slate-150 rounded-xl text-[9px] font-bold text-slate-700 transition-all cursor-pointer text-center"
                >
                  🛡️ অ্যাডমিন (Demo)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
