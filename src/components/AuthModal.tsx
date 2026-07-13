/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { firebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      if (isFirebaseConfigured && firebaseAuth) {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(firebaseAuth, provider);
        const { uid, displayName: googleName } = userCredential.user;

        // Try to fetch existing user profile
        const response = await fetch(`/api/users/${uid}`);
        let profile = null;
        if (response.ok) {
          try {
            profile = await response.json();
          } catch (e) {
            console.error("No JSON profile back, will create new", e);
          }
        }

        // Create or update user on backend
        const finalRole = role || "reader";
        const finalName = displayName || googleName || "Google User";
        const createResponse = await fetch(`/api/users/${uid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: finalName,
            role: profile?.role || finalRole,
            bio: profile?.bio || "স্বাগতম গুগল অ্যাকাউন্টের মাধ্যমে রিড-টু-প্রিন্ট অ্যাপ্লিকেশনে।"
          })
        });
        profile = await createResponse.json();

        onSuccess(profile);
      } else {
        // Fallback for Sandbox mode (simulate Google Sign-In)
        const mockUid = `google-sandbox-${role}`;
        const response = await fetch(`/api/users/${mockUid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName || "গুগল স্যান্ডবক্স ইউজার",
            role: role,
            bio: "স্বাগতম স্যান্ডবক্স গুগল অ্যাকাউন্টে।"
          })
        });
        const profile = await response.json();
        onSuccess(profile);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "গুগল লগইন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।");
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

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-400 font-sans">অথবা</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              গুগল দিয়ে প্রবেশ করুন
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
