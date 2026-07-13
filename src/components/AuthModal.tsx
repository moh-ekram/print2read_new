/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { firebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { LogIn, UserPlus, Shield, Sparkles, User, BookOpen } from "lucide-react";
import { UserProfile, UserRole } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("reader");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("দয়া করে ইমেইল এবং পাসওয়ার্ড প্রদান করুন।");
      setLoading(false);
      return;
    }

    if (isSignUp && !displayName) {
      setError("দয়া করে আপনার নাম প্রদান করুন।");
      setLoading(false);
      return;
    }

    try {
      if (isFirebaseConfigured && firebaseAuth) {
        // --- REAL FIREBASE AUTHENTICATION ---
        let userCredential;
        if (isSignUp) {
          userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          // Register with local backend to sync profile with custom role
          const response = await fetch(`/api/users/${userCredential.user.uid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName, role }),
          });
          const profile = await response.json();
          onSuccess(profile);
        } else {
          userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
          // Fetch synced profile from backend
          const response = await fetch(`/api/users/${userCredential.user.uid}`);
          const profile = await response.json();
          onSuccess(profile);
        }
      } else {
        // --- HIGH FIDELITY SANDBOX AUTHENTICATION ---
        // Generates user ID based on email prefix or custom string
        const uid = `sandbox-${email.split("@")[0]}-${role}`;
        
        if (isSignUp) {
          // Put new user into db via backend
          const response = await fetch(`/api/users/${uid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName, role, bio: "স্বাগতম রিড-টু-প্রিন্ট স্যান্ডবক্স অ্যাকাউন্টে।" }),
          });
          const profile = await response.json();
          onSuccess(profile);
        } else {
          // Fetch existing/new profile from backend
          const response = await fetch(`/api/users/${uid}`);
          const profile = await response.json();
          // Update details if profile was created but we want to log in
          onSuccess(profile);
        }
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("এই ইমেইলটি ইতিপূর্বে ব্যবহার করা হয়েছে।");
      } else if (err.code === "auth/invalid-credential") {
        setError("ভুল ইমেইল বা পাসওয়ার্ড। পুনরায় চেষ্টা করুন।");
      } else {
        setError(err.message || "অথেনটিকেশন ব্যর্থ হয়েছে। দয়া করে সঠিক তথ্য দিন।");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div 
        id="auth-modal-container"
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-purple-100 transform scale-100 transition-all duration-300"
      >
        {/* Modal Header */}
        <div className="bg-linear-to-r from-brand-green-500 via-brand-orange-500 to-brand-purple-600 p-6 text-white text-center relative">
          <button 
            id="close-auth-modal"
            onClick={onClose}
            className="absolute right-4 top-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          >
            ✕
          </button>
          <div className="mx-auto bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-md">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-serif font-bold tracking-wide">Read-to-Print</h2>
          <p className="text-white/80 text-xs mt-1 font-sans">
            {!isFirebaseConfigured ? "✨ Sandbox Test Environment" : "🔐 Secure Cloud Gateway"}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="flex justify-center mb-6 bg-slate-100 p-1.5 rounded-full">
            <button
              id="login-tab-btn"
              type="button"
              onClick={() => { setIsSignUp(false); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-300 ${!isSignUp ? "bg-white text-brand-purple-700 shadow-xs" : "text-slate-600 hover:text-brand-purple-600"}`}
            >
              <LogIn className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              লগইন করুন
            </button>
            <button
              id="signup-tab-btn"
              type="button"
              onClick={() => { setIsSignUp(true); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-300 ${isSignUp ? "bg-white text-brand-purple-700 shadow-xs" : "text-slate-600 hover:text-brand-purple-600"}`}
            >
              <UserPlus className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              নিবন্ধন করুন
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">আপনার নাম</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="auth-display-name"
                    type="text"
                    placeholder="যেমন: সাকিব আল হাসান"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-purple-500/20 focus:border-brand-purple-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ইমেইল ঠিকানা</label>
              <input
                id="auth-email"
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-purple-500/20 focus:border-brand-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">পাসওয়ার্ড</label>
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-purple-500/20 focus:border-brand-purple-500 transition-all"
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">আপনার ভূমিকা (Role)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    id="role-reader-btn"
                    type="button"
                    onClick={() => setRole("reader")}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${role === "reader" ? "bg-brand-green-50 border-brand-green-500 text-brand-green-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    <BookOpen className="w-4 h-4" />
                    পাঠক (Reader)
                  </button>
                  <button
                    id="role-writer-btn"
                    type="button"
                    onClick={() => setRole("writer")}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${role === "writer" ? "bg-brand-orange-50 border-brand-orange-500 text-brand-orange-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Sparkles className="w-4 h-4" />
                    লেখক (Writer)
                  </button>
                  <button
                    id="role-admin-btn"
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${role === "admin" ? "bg-brand-purple-50 border-brand-purple-500 text-brand-purple-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Shield className="w-4 h-4" />
                    প্রশাসক (Admin)
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-100 leading-relaxed font-medium">
                ⚠️ {error}
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-medium text-white shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 duration-200 cursor-pointer ${isSignUp ? "bg-brand-purple-600 hover:bg-brand-purple-700" : "bg-brand-green-600 hover:bg-brand-green-700"} flex items-center justify-center gap-2`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isSignUp ? "অ্যাকাউন্ট তৈরি করুন" : "লগইন করুন"}
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-center text-slate-400 mt-6 leading-relaxed">
            {!isFirebaseConfigured 
              ? "স্যান্ডবক্স মোডে আপনার ইচ্ছামত যেকোনো ইমেইল ও পাসওয়ার্ড ব্যবহার করে তাৎক্ষণিকভাবে লগইন বা নিবন্ধন করতে পারবেন।" 
              : "আপনার ডেটা নিরাপদে ফায়ারবেস ক্লাউডে এনক্রিপ্ট হয়ে সংরক্ষিত থাকবে।"}
          </p>
        </div>
      </div>
    </div>
  );
}
