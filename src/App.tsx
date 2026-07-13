/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, Post, CoinTransaction, UserRole } from "./types";
import AuthModal from "./components/AuthModal";
import { firebaseAuth, isFirebaseConfigured } from "./lib/firebase";
import CoinsModal from "./components/CoinsModal";
import ReaderPanel from "./components/ReaderPanel";
import WriterPanel from "./components/WriterPanel";
import AdminPanel from "./components/AdminPanel";
import PostReaderModal from "./components/PostReaderModal";
import { 
  BookOpen, 
  Coins, 
  Wallet, 
  Sparkles, 
  Printer, 
  LogIn, 
  LogOut, 
  User, 
  TrendingUp, 
  History, 
  PenTool, 
  ShieldAlert,
  Search,
  BookMarked,
  Heart,
  ExternalLink
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  
  // Admin Data states
  const [adminData, setAdminData] = useState<{ users: any[]; withdrawRequests: any[]; globalHistory: any[] }>({
    users: [],
    withdrawRequests: [],
    globalHistory: []
  });

  // Modal controls
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCoinsOpen, setIsCoinsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Active view tabs for profile
  const [profileView, setProfileView] = useState<"reader" | "writer" | "admin">("reader");
  const [activeNavView, setActiveNavView] = useState<"home" | "profile" | "admin">("home");
  const [profileSection, setProfileSection] = useState<"reader" | "writer">("reader");
  const [readerTab, setReaderTab] = useState<"bookmarks" | "basket" | "following">("bookmarks");
  const [searchQuery, setSearchQuery] = useState("");

  // Loading states
  const [loadingPosts, setLoadingPosts] = useState(true);

  // 1. Initial mounting and loading
  useEffect(() => {
    if (isFirebaseConfigured && firebaseAuth) {
      const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
        if (user) {
          loadUserSession(user.uid);
        } else {
          setCurrentUser(null);
        }
      });
      fetchPosts();
      fetchAdminData();
      return () => unsubscribe();
    } else {
      // Sandbox mode: seed "reader-1" as default logged in user so the preview is highly interactive immediately!
      const defaultUid = "reader-1";
      loadUserSession(defaultUid);
      fetchPosts();
      fetchAdminData();
    }
  }, []);

  const loadUserSession = async (uid: string) => {
    try {
      const response = await fetch(`/api/users/${uid}`);
      if (response.ok) {
        const profile = await response.json();
        setCurrentUser(profile);
        setProfileView(profile.role);
        setProfileSection(profile.role === "writer" ? "writer" : "reader");
        fetchTransactions(profile.uid);
      }
    } catch (e) {
      console.error("Failed to load user session", e);
    }
  };

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const response = await fetch("/api/posts");
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (e) {
      console.error("Failed to fetch posts", e);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchTransactions = async (uid: string) => {
    try {
      const response = await fetch(`/api/transactions/${uid}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (e) {
      console.error("Failed to fetch transactions", e);
    }
  };

  const fetchAdminData = async () => {
    try {
      const response = await fetch("/api/admin/data");
      if (response.ok) {
        const data = await response.json();
        setAdminData(data);
      }
    } catch (e) {
      console.error("Failed to fetch admin data", e);
    }
  };

  // 2. Interactive Handlers
  const handleAuthSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    setProfileView(profile.role);
    setProfileSection(profile.role === "writer" ? "writer" : "reader");
    fetchTransactions(profile.uid);
    fetchAdminData();
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        await firebaseAuth.signOut();
      } catch (e) {
        console.error("Firebase sign out error", e);
      }
    }
    setCurrentUser(null);
  };

  // Unified interaction handler (bookmarks, print basket, follows, reads)
  const handleAction = async (actionType: string, postId?: string, authorId?: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const response = await fetch(`/api/users/${currentUser.uid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, postId, authorId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        
        // Refresh local listings and metrics
        fetchPosts();
        fetchTransactions(currentUser.uid);
        fetchAdminData();

        // If currently viewing the selected post, update its views/counters locally
        if (selectedPost && postId === selectedPost.id) {
          const updatedPost = data.posts?.find((p: Post) => p.id === postId) || selectedPost;
          setSelectedPost(updatedPost);
        }
      } else {
        const err = await response.json();
        alert(err.error || "অ্যাকশন সম্পন্ন করা যায়নি।");
      }
    } catch (e) {
      console.error(e);
      alert("সার্ভার সংযোগ ব্যাহত হয়েছে। পুনরায় চেষ্টা করুন।");
    }
  };

  // Author publishing a new post
  const handlePublishPost = async (
    title: string,
    excerpt: string,
    content: string,
    priceCoins: number,
    priceMoney: number
  ) => {
    if (!currentUser) return;
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          priceCoins,
          priceMoney,
          authorId: currentUser.uid,
          authorName: currentUser.displayName
        })
      });

      if (response.ok) {
        alert("আপনার লেখাটি সফলভাবে প্রকাশিত হয়েছে!");
        fetchPosts();
        fetchAdminData();
      } else {
        const err = await response.json();
        alert(err.error || "লেখা প্রকাশ করতে ব্যর্থ হয়েছে।");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Writer editing an existing post
  const handleEditPost = async (
    postId: string,
    title: string,
    excerpt: string,
    content: string,
    priceCoins: number,
    priceMoney: number
  ) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, excerpt, content, priceCoins, priceMoney })
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedPost(updated);
        fetchPosts();
        fetchAdminData();
        alert("লেখাটি সফলভাবে আপডেট করা হয়েছে।");
      } else {
        const err = await response.json();
        alert(err.error || "আপডেট ব্যর্থ হয়েছে।");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Writer submitting a withdraw request
  const handleWithdrawRequest = async (
    amount: number,
    paymentMethod: string,
    accountNumber: string
  ) => {
    if (!currentUser) return;
    const response = await fetch("/api/admin/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        amount,
        paymentMethod,
        accountNumber
      })
    });

    if (response.ok) {
      const data = await response.json();
      setCurrentUser(data.user);
      fetchAdminData();
    } else {
      const err = await response.json();
      throw new Error(err.error || "উইথড্র সম্পন্ন করা যায়নি।");
    }
  };

  // Admin approving/rejecting a payout
  const handleApproveWithdraw = async (requestId: string, status: "approved" | "rejected") => {
    const response = await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status })
    });

    if (response.ok) {
      fetchAdminData();
      // If admin was logged in, reload current wallet balance if they are connected
      if (currentUser) {
        loadUserSession(currentUser.uid);
      }
    } else {
      const err = await response.json();
      throw new Error(err.error || "অ্যাকশন সম্পন্ন করা যায়নি।");
    }
  };

  const handleOpenPostReader = async (post: Post) => {
    setSelectedPost(post);
    // Real view log
    try {
      await fetch(`/api/users/${currentUser?.uid || "anonymous"}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "read", postId: post.id })
      });
      fetchPosts();
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  // Top Authors lists
  const authorMap = posts.reduce((acc: any, post) => {
    if (!acc[post.authorId]) {
      acc[post.authorId] = {
        id: post.authorId,
        name: post.authorName,
        postCount: 0,
        totalViews: 0,
        totalPrints: 0
      };
    }
    acc[post.authorId].postCount += 1;
    acc[post.authorId].totalViews += post.viewCount;
    acc[post.authorId].totalPrints += post.addToPrintCount;
    return acc;
  }, {});

  const topAuthors = Object.values(authorMap).sort((a: any, b: any) => b.totalPrints - a.totalPrints);

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-orange-100 selection:text-orange-800 text-slate-800">
      {/* 1. TOP UTILITY HEADER FOR PREVIEW SWITCHING */}
      <div className="bg-linear-to-r from-emerald-700 via-orange-600 to-violet-700 py-2 px-4 text-white text-xs font-semibold flex flex-wrap justify-between items-center gap-3 shadow-inner shrink-0 z-50">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-orange-200" />
          রিয়েল-টাইম রোল প্রিভিউ প্যানেল (Role Toggles)
        </span>
        <div className="flex gap-2">
          <button
            id="switch-to-sakib-reader"
            onClick={() => loadUserSession("reader-1")}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              currentUser?.uid === "reader-1" 
                ? "bg-white text-emerald-700 shadow-md" 
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            সাকিব আল হাসান (Reader)
          </button>
          <button
            id="switch-to-rabindranath-writer"
            onClick={() => loadUserSession("writer-1")}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              currentUser?.uid === "writer-1" 
                ? "bg-white text-orange-700 shadow-md" 
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            রবীন্দ্রনাথ ঠাকুর (Writer)
          </button>
          <button
            id="switch-to-admin-test"
            onClick={() => loadUserSession("admin-1")}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              currentUser?.uid === "admin-1" 
                ? "bg-white text-violet-700 shadow-md" 
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            অ্যাডমিন প্যানেল (Admin)
          </button>
        </div>
      </div>

      {/* Main Flex Layout with Left Sidebar */}
      <div className="flex-1 flex flex-row min-h-0 relative">
        {/* Left Sidebar navigation */}
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 sticky top-0 h-[calc(100vh-36px)] shrink-0 hidden md:flex z-30 shadow-xs">
          <div className="bg-violet-600 text-white p-3 rounded-2xl shadow-sm">
            <Printer className="w-6 h-6 animate-pulse" />
          </div>

          <div className="w-8 h-px bg-slate-200 my-2" />

          {/* Nav Items */}
          <button
            onClick={() => setActiveNavView("home")}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group ${
              activeNavView === "home"
                ? "bg-violet-50 text-violet-600 border border-violet-100"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
            title="হোমপেজ (Home)"
          >
            <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold">Home</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                setIsAuthOpen(true);
              } else {
                setActiveNavView("profile");
              }
            }}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group ${
              activeNavView === "profile"
                ? "bg-emerald-50 text-emerald-600 border border-emerald-105"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
            title="আমার প্রোফাইল (Profile)"
          >
            <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold">Profile</span>
          </button>

          {currentUser?.role === "admin" && (
            <button
              onClick={() => setActiveNavView("admin")}
              className={`p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group ${
                activeNavView === "admin"
                  ? "bg-orange-50 text-orange-600 border border-orange-105"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
              title="অ্যাডমিন প্যানেল"
            >
              <ShieldAlert className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-bold">Admin</span>
            </button>
          )}
        </aside>

        {/* Main Content viewport */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* 2. PRIMARY NAVBAR */}
          <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 h-16 shrink-0 shadow-2xs">
            <div className="max-w-[1550px] mx-auto px-4 md:px-8 h-full flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="md:hidden bg-violet-600 p-2 rounded-xl text-white shadow-xs">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg md:text-xl font-serif font-bold text-slate-800 leading-none">Read-to-Print</h1>
                    <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">Where Literature Meets physical Print Layouts</p>
                  </div>
                </div>

                {/* Central Horizontal Menu/Navigation */}
                <nav className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shadow-xs text-xs">
                  <button
                    id="nav-home-btn"
                    onClick={() => setActiveNavView("home")}
                    className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeNavView === "home"
                        ? "bg-white text-violet-700 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                    হোমপেজ (Home)
                  </button>
                  <button
                    id="nav-profile-btn"
                    onClick={() => {
                      if (!currentUser) {
                        setIsAuthOpen(true);
                      } else {
                        setActiveNavView("profile");
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeNavView === "profile"
                        ? "bg-white text-emerald-700 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    আমার প্রোফাইল (Profile)
                  </button>
                  {currentUser?.role === "admin" && (
                    <button
                      id="nav-admin-btn"
                      onClick={() => setActiveNavView("admin")}
                      className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        activeNavView === "admin"
                          ? "bg-white text-orange-700 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
                      অ্যাডমিন
                    </button>
                  )}
                </nav>
              </div>

              <div className="flex items-center gap-3">
                {currentUser ? (
                  <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 p-1.5 rounded-full">
                    <button
                      id="header-wallet-btn"
                      onClick={() => setIsCoinsOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 rounded-full shadow-2xs transition-all text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <Coins className="w-4 h-4 text-orange-500" />
                      <span className="font-mono">{currentUser.coins} CC</span>
                    </button>

                    <div className="w-px h-4 bg-slate-300"></div>

                    <div className="flex items-center gap-2 pr-3 pl-1 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-slate-700 max-w-[120px] truncate">{currentUser.displayName}</span>
                      <span className="text-[10px] text-slate-400">({currentUser.role})</span>
                    </div>

                    <button
                      id="app-logout-btn"
                      onClick={handleLogout}
                      className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-full transition-colors cursor-pointer"
                      title="লগআউট"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    id="header-login-trigger-btn"
                    onClick={() => setIsAuthOpen(true)}
                    className="py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    লগইন / নিবন্ধন
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* 3. HERO BANNER */}
          <section className="bg-white border-b border-slate-200 py-6 shrink-0">
            <div className="max-w-[1550px] mx-auto px-4 md:px-8 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 tracking-tight leading-tight">
                  মুদ্রণযোগ্য জ্ঞান ও সাহিত্যের আধুনিক মিলনমেলা
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
                  রিড-টু-প্রিন্ট একটি সমন্বিত ডিজিটাল হাব। এখানে পাঠকেরা তাদের পছন্দের লেখাগুলো বাস্কেটে যুক্ত করতে পারেন ফিজিক্যাল প্রিন্ট নেওয়ার উদ্দেশ্যে, এবং লেখকেরা পান তাদের লেখার ভিউ, বাস্কেট ও আয়ের সঠিক পরিসংখ্যান।
                </p>
              </div>
              <div className="flex md:self-center self-stretch shrink-0 justify-center">
                <span className="bg-violet-50 text-violet-700 text-xs px-4 py-2 border border-violet-100 rounded-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  Premium Edition Active
                </span>
              </div>
            </div>
          </section>

          {/* 4. MAIN LAYOUT GRID (HIGH DENSITY VIEW) */}
          <main className="max-w-[1550px] w-full mx-auto px-4 md:px-8 py-6 flex-1">
            {activeNavView === "home" ? (
              /* --- HOMEPAGE VIEW: Shows Post feed & Side Rails only --- */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Center Column: All writings feed */}
                <section className="lg:col-span-8 flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-serif font-bold text-slate-800">সকল প্রকাশিত লেখা (All Articles)</h3>
                        <p className="text-xs text-slate-400 mt-1">পড়ুন, বুকমার্ক করুন অথবা আপনার প্রিন্ট বাস্কেটে যুক্ত করুন</p>
                      </div>
                      
                      {/* Search bar */}
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="search-writings-input"
                          type="text"
                          placeholder="লেখা বা লেখক অনুসন্ধান..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-slate-700"
                        />
                      </div>
                    </div>

                    {loadingPosts ? (
                      <div className="text-center py-16">
                        <div className="w-8 h-8 border-3 border-slate-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs text-slate-400">লেখাগুলো লোড করা হচ্ছে...</p>
                      </div>
                    ) : filteredPosts.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BookOpen className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-xs font-medium">কোনো লেখা খুঁজে পাওয়া যায়নি।</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredPosts.map((post) => {
                          const isBookmarked = currentUser?.bookmarkedPostIds.includes(post.id) || false;
                          const isAdded = currentUser?.printBasketPostIds.includes(post.id) || false;

                          return (
                            <div 
                              key={post.id}
                              className="bg-white p-5 rounded-2xl border border-slate-150 hover:border-violet-300 shadow-3xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <span className="text-[10px] bg-slate-100 font-sans font-bold text-slate-500 px-2 py-0.5 rounded-full">
                                    ✍️ {post.authorName}
                                  </span>
                                  {currentUser && (
                                    <button
                                      id={`toggle-bookmark-feed-${post.id}`}
                                      onClick={() => handleAction("bookmark", post.id)}
                                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                        isBookmarked 
                                          ? "bg-violet-50 border-violet-200 text-violet-600 border-violet-300" 
                                          : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600"
                                      }`}
                                    >
                                      <BookMarked className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                  )}
                                </div>

                                <h4 
                                  id={`feed-post-title-click-${post.id}`}
                                  onClick={() => handleOpenPostReader(post)}
                                  className="text-base md:text-lg font-bold font-serif text-slate-800 hover:text-violet-700 transition-colors cursor-pointer leading-snug mb-1.5"
                                >
                                  {post.title}
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-sans mb-3 line-clamp-2">
                                  {post.excerpt}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-slate-150 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex gap-4 text-[10px] text-slate-400 font-mono font-medium">
                                  <span className="flex items-center gap-1">👁️ {post.viewCount} ভিউ</span>
                                  <span className="flex items-center gap-1 text-orange-500 font-bold">🖨️ {post.addToPrintCount} প্রিন্টস</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    id={`read-post-feed-${post.id}`}
                                    onClick={() => handleOpenPostReader(post)}
                                    className="py-1.5 px-3 hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    পড়ুন
                                  </button>

                                  {currentUser?.uid !== post.authorId && (
                                    <button
                                      id={`basket-post-feed-${post.id}`}
                                      onClick={() => handleAction("basket", post.id)}
                                      className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1 ${
                                        isAdded 
                                          ? "bg-slate-800 text-white" 
                                          : "bg-orange-500 hover:bg-orange-600 text-white"
                                      }`}
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                      {isAdded ? "প্রিন্টেড" : "অ্যাড টু প্রিন্ট"}
                                      <span className="font-mono text-[10px] opacity-85">({post.priceCoins} CC)</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                {/* Right Rail: Stats, charts and global history */}
                <section className="lg:col-span-4 flex flex-col gap-6">
                  {/* Top Authors chart */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      সেরা লেখক চার্ট (Top Authors Chart)
                    </h3>
                    {topAuthors.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4">কোনো ডাটা এখনও পাওয়া যায়নি।</p>
                    ) : (
                      <div className="space-y-2.5">
                        {topAuthors.slice(0, 5).map((author: any, idx) => (
                          <div key={author.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 rounded-lg px-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 flex items-center justify-center rounded-full font-mono font-bold text-[10px] ${
                                idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-slate-100 text-slate-600" : "bg-orange-50 text-orange-750"
                              }`}>
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-bold text-slate-700 font-serif">{author.name}</p>
                                <p className="text-[9px] text-slate-400">{author.postCount}টি লেখা</p>
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-slate-400 font-mono">
                              <span className="text-emerald-600 font-bold">{author.totalViews} ভিউ</span>
                              <span className="mx-1">•</span>
                              <span className="text-orange-500 font-bold">{author.totalPrints} প্রিন্টস</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Global print history */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
                      <History className="w-4 h-4 text-orange-500 animate-pulse" />
                      গ্লোবাল প্রিন্ট ইতিহাস (Global Print History)
                    </h3>
                    {adminData.globalHistory.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4">এখনও কোনো প্রিন্ট ইতিহাস নেই।</p>
                    ) : (
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {adminData.globalHistory.slice(0, 10).map((h: any, idx: number) => {
                          const borderColors = [
                            "border-l-4 border-emerald-500 bg-emerald-50/40",
                            "border-l-4 border-orange-500 bg-orange-50/40",
                            "border-l-4 border-violet-500 bg-violet-50/40",
                            "border-l-4 border-slate-300 bg-slate-50/40"
                          ];
                          return (
                            <div key={h.id} className={`text-[10px] p-2.5 border border-slate-100 rounded-lg flex justify-between items-center gap-2 leading-tight ${borderColors[idx % borderColors.length]}`}>
                              <div className="truncate flex-1">
                                <span className="font-bold text-slate-600">{h.userDisplayName}</span>
                                <span className="text-slate-400 mx-1">যোগ করেছেন</span>
                                <span className="font-semibold text-violet-700 truncate inline-block max-w-[120px]" title={h.postTitle}>{h.postTitle}</span>
                              </div>
                              <span className="text-slate-400 font-mono shrink-0">
                                {new Date(h.timestamp).toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

              </div>
            ) : activeNavView === "profile" ? (
              /* --- MY PROFILE VIEW: Includes Reader Toggle & Writer Toggle --- */
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                  {/* Outer Section Toggle Header */}
                  <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-violet-600" />
                      <div>
                        <h2 className="text-base font-serif font-bold text-slate-800">আমার প্রোফাইল ড্যাশবোর্ড (My Profile)</h2>
                        <p className="text-xs text-slate-400">সহজেই পাঠক এবং লেখক অংশ টগল করুন</p>
                      </div>
                    </div>

                    <div className="flex bg-slate-200 p-1.5 rounded-2xl text-xs font-bold gap-1 shadow-inner">
                      <button
                        id="profile-toggle-reader"
                        onClick={() => setProfileSection("reader")}
                        className={`px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                          profileSection === "reader"
                            ? "bg-white text-emerald-750 shadow-2xs font-extrabold"
                            : "text-slate-500 hover:text-slate-850"
                        }`}
                      >
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        পাঠক অংশ (Reader)
                      </button>
                      <button
                        id="profile-toggle-writer"
                        onClick={() => setProfileSection("writer")}
                        className={`px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                          profileSection === "writer"
                            ? "bg-white text-orange-650 shadow-2xs font-extrabold"
                            : "text-slate-500 hover:text-slate-850"
                        }`}
                      >
                        <PenTool className="w-4 h-4 text-orange-500" />
                        লেখক অংশ (Writer)
                      </button>
                    </div>
                  </div>

                  {/* Profile section body content */}
                  <div className="p-6">
                    {profileSection === "reader" ? (
                      <ReaderPanel
                        profile={currentUser!}
                        posts={posts}
                        authors={adminData.users.filter((u) => u.role === "writer")}
                        onAction={handleAction}
                        onOpenCoinsModal={() => setIsCoinsOpen(true)}
                        onOpenPost={handleOpenPostReader}
                        activeTab={readerTab}
                        onTabChange={setReaderTab}
                      />
                    ) : (
                      <WriterPanel
                        profile={currentUser!}
                        posts={posts}
                        onOpenPost={handleOpenPostReader}
                        onPublishPost={handlePublishPost}
                        onWithdrawRequest={handleWithdrawRequest}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* --- ADMIN PANEL VIEW --- */
              <div className="max-w-6xl mx-auto">
                <AdminPanel
                  profile={currentUser!}
                  adminData={adminData}
                  onApproveWithdraw={handleApproveWithdraw}
                  onRefreshAdminData={fetchAdminData}
                />
              </div>
            )}
          </main>

          {/* FOOTER */}
          <footer className="mt-16 bg-white border-t border-slate-100 py-8 shrink-0 text-slate-400 text-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="font-bold text-slate-600 font-serif">Read-to-Print Engine v1.0</p>
                <p className="text-[10px] text-slate-400 mt-1">© 2026 Read-to-Print. সর্বস্বত্ব সংরক্ষিত।</p>
              </div>
              <div className="flex gap-4 font-medium text-[10px]">
                <a href="#" className="hover:text-brand-purple-600 transition-colors">ব্যবহারের শর্তাবলী</a>
                <a href="#" className="hover:text-brand-purple-600 transition-colors">গোপনীয়তা নীতি</a>
                <a href="#" className="hover:text-brand-purple-600 transition-colors">যোগাযোগ</a>
              </div>
            </div>
          </footer>

        </div>
      </div>

      {/* MODALS */}
      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {isCoinsOpen && currentUser && (
        <CoinsModal
          isOpen={isCoinsOpen}
          onClose={() => setIsCoinsOpen(false)}
          profile={currentUser}
          transactions={transactions}
          onUpdateProfile={setCurrentUser}
          onRefreshTransactions={() => fetchTransactions(currentUser.uid)}
        />
      )}

      {selectedPost && (
        <PostReaderModal
          post={selectedPost}
          profile={currentUser}
          onClose={() => setSelectedPost(null)}
          onAction={handleAction}
          onEditPost={handleEditPost}
        />
      )}

    </div>
  );
}
