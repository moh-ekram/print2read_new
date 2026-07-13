/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, Post, CoinTransaction, UserRole } from "./types";
import AuthModal from "./components/AuthModal";
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
  const [readerTab, setReaderTab] = useState<"bookmarks" | "basket" | "following">("bookmarks");
  const [searchQuery, setSearchQuery] = useState("");

  // Loading states
  const [loadingPosts, setLoadingPosts] = useState(true);

  // 1. Initial mounting and loading
  useEffect(() => {
    // Let's seed "reader-1" as default logged in user so the preview is highly interactive immediately!
    const defaultUid = "reader-1";
    loadUserSession(defaultUid);
    fetchPosts();
    fetchAdminData();
  }, []);

  const loadUserSession = async (uid: string) => {
    try {
      const response = await fetch(`/api/users/${uid}`);
      if (response.ok) {
        const profile = await response.json();
        setCurrentUser(profile);
        setProfileView(profile.role);
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
    fetchTransactions(profile.uid);
    fetchAdminData();
  };

  const handleLogout = () => {
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
            onClick={() => {
              setProfileView("reader");
            }}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group ${
              profileView === "reader"
                ? "bg-violet-50 text-violet-600"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
            title="রিডার ড্যাশবোর্ড"
          >
            <BookOpen className="w-5 h-5 group-hover:scale-115 transition-transform" />
            <span className="text-[9px] font-bold">Reader</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                setIsAuthOpen(true);
              } else {
                setProfileView("writer");
              }
            }}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group ${
              profileView === "writer"
                ? "bg-emerald-50 text-emerald-600"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
            title="লেখক ড্যাশবোর্ড"
          >
            <PenTool className="w-5 h-5 group-hover:scale-115 transition-transform" />
            <span className="text-[9px] font-bold">Writer</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                setIsAuthOpen(true);
              } else {
                setProfileView("admin");
              }
            }}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group ${
              profileView === "admin"
                ? "bg-orange-50 text-orange-600"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
            title="অ্যাডমিন প্যানেল"
          >
            <ShieldAlert className="w-5 h-5 group-hover:scale-115 transition-transform" />
            <span className="text-[9px] font-bold">Admin</span>
          </button>
        </aside>

        {/* Main Content viewport */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* 2. PRIMARY NAVBAR */}
          <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 h-16 shrink-0 shadow-2xs">
            <div className="max-w-[1550px] mx-auto px-4 md:px-8 h-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="md:hidden bg-violet-600 p-2 rounded-xl text-white shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-serif font-bold text-slate-800 leading-none">Read-to-Print</h1>
                  <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">Where Literature Meets physical Print Layouts</p>
                </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT / CENTER SECTION (col-span-8) */}
              <section className="lg:col-span-8 flex flex-col gap-6">
                
                {/* 3 Interactive Mini Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: প্রিন্ট বাস্কেট */}
                  <div 
                    onClick={() => {
                      if (!currentUser) {
                        setIsAuthOpen(true);
                      } else {
                        setProfileView("reader");
                        setReaderTab("basket");
                      }
                    }}
                    className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:shadow-sm transition-all group"
                  >
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">বাস্কেটে যুক্ত</p>
                      <p className="text-xl font-bold font-mono text-slate-800 mt-1">
                        {currentUser ? currentUser.printBasketPostIds.length : 0} টি লেখা
                      </p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                      <Printer className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Card 2: বুকমার্ক তালিকা */}
                  <div 
                    onClick={() => {
                      if (!currentUser) {
                        setIsAuthOpen(true);
                      } else {
                        setProfileView("reader");
                        setReaderTab("bookmarks");
                      }
                    }}
                    className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer hover:border-violet-500 hover:shadow-sm transition-all group"
                  >
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">বুকমার্ক প্রবন্ধ</p>
                      <p className="text-xl font-bold font-mono text-slate-800 mt-1">
                        {currentUser ? currentUser.bookmarkedPostIds.length : 0} টি সংরক্ষিত
                      </p>
                    </div>
                    <div className="bg-violet-50 text-violet-600 p-2.5 rounded-xl group-hover:bg-violet-500 group-hover:text-white transition-all duration-300">
                      <BookMarked className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Card 3: অনুসরণকারী লেখক */}
                  <div 
                    onClick={() => {
                      if (!currentUser) {
                        setIsAuthOpen(true);
                      } else {
                        setProfileView("reader");
                        setReaderTab("following");
                      }
                    }}
                    className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer hover:border-orange-500 hover:shadow-sm transition-all group"
                  >
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ফলোয়িং লেখক</p>
                      <p className="text-xl font-bold font-mono text-slate-800 mt-1">
                        {currentUser ? currentUser.followingAuthors.length : 0} জন লেখক
                      </p>
                    </div>
                    <div className="bg-orange-50 text-orange-500 p-2.5 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                      <User className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Dashboard Control Panel Wrapper */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Profile Card Header */}
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <User className="w-4.5 h-4.5 text-violet-600" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">আপনার প্রোফাইল ড্যাশবোর্ড</h2>
                    </div>
                    
                    {currentUser && (
                      <div className="flex bg-slate-200 p-1 rounded-xl text-[10px] font-bold">
                        <button
                          id="profile-toggle-reader"
                          onClick={() => setProfileView("reader")}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${profileView === "reader" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500 hover:text-slate-850"}`}
                        >
                          Reader
                        </button>
                        <button
                          id="profile-toggle-writer"
                          onClick={() => setProfileView("writer")}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${profileView === "writer" ? "bg-white text-orange-600 shadow-2xs" : "text-slate-500 hover:text-slate-850"}`}
                        >
                          Writer
                        </button>
                        <button
                          id="profile-toggle-admin"
                          onClick={() => setProfileView("admin")}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${profileView === "admin" ? "bg-white text-violet-600 shadow-2xs" : "text-slate-500 hover:text-slate-850"}`}
                        >
                          Admin
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Panel body */}
                  <div className="p-5">
                    {currentUser ? (
                      <>
                        {profileView === "reader" && (
                          <ReaderPanel
                            profile={currentUser}
                            posts={posts}
                            authors={adminData.users.filter(u => u.role === "writer")}
                            onAction={handleAction}
                            onOpenCoinsModal={() => setIsCoinsOpen(true)}
                            onOpenPost={handleOpenPostReader}
                            activeTab={readerTab}
                            onTabChange={setReaderTab}
                          />
                        )}

                        {profileView === "writer" && (
                          <WriterPanel
                            profile={currentUser}
                            posts={posts}
                            onOpenPost={handleOpenPostReader}
                            onPublishPost={handlePublishPost}
                            onWithdrawRequest={handleWithdrawRequest}
                          />
                        )}

                        {profileView === "admin" && (
                          <AdminPanel
                            profile={currentUser}
                            adminData={adminData}
                            onApproveWithdraw={handleApproveWithdraw}
                            onRefreshAdminData={fetchAdminData}
                          />
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 px-4">
                        <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <LogIn className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">লগইন বা নিবন্ধন করুন</h3>
                        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                          বুকমার্ক লিস্ট, কয়েন কেনা, প্রিন্ট বাস্কেটে অ্যাড করা এবং লেখক ড্যাশবোর্ড এক্সেস করতে দয়া করে আপনার অ্যাকাউন্ট খুলুন।
                        </p>
                        <button
                          id="login-cta-body"
                          onClick={() => setIsAuthOpen(true)}
                          className="mt-4 py-2 px-5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                        >
                          এখনি সাইন-ইন করুন
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Browse writings feed */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-4.5 h-4.5 text-violet-500" />
                      প্রকাশিত প্রবন্ধ ও সাহিত্য সংকলন
                    </h3>

                    {/* Search bar */}
                    <div className="relative w-full sm:w-64">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        id="posts-feed-search"
                        type="text"
                        placeholder="লেখা, শিরোনাম বা লেখক খুঁজুন..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/10 focus:border-violet-400 transition-all"
                      />
                    </div>
                  </div>

                  {loadingPosts ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                      <div className="w-8 h-8 border-3 border-slate-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs text-slate-400">লেখাগুলো লোড করা হচ্ছে...</p>
                    </div>
                  ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                      <p className="text-xs text-slate-400">কোনো লেখা পাওয়া যায়নি।</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredPosts.map((post) => {
                        const isAdded = currentUser?.printBasketPostIds.includes(post.id) || false;
                        const isFav = currentUser?.bookmarkedPostIds.includes(post.id) || false;

                        return (
                          <div 
                            key={post.id}
                            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between"
                          >
                            <div>
                              {/* Top Row: Author & bookmark */}
                              <div className="flex justify-between items-start gap-4 mb-2.5">
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-[10px]">
                                    {post.authorName.substring(0, 1)}
                                  </div>
                                  <span className="font-semibold text-slate-600">{post.authorName}</span>
                                  <span className="text-slate-300 font-mono">•</span>
                                  <span className="text-slate-400 font-mono">{new Date(post.createdAt).toLocaleDateString("bn-BD")}</span>
                                </div>

                                {currentUser && (
                                  <button
                                    id={`bookmark-feed-btn-${post.id}`}
                                    onClick={() => handleAction("bookmark", post.id)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isFav 
                                        ? "bg-violet-50 border-violet-200 text-violet-600" 
                                        : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600"
                                    }`}
                                  >
                                    <BookMarked className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}
                              </div>

                              {/* Post Title & Excerpt */}
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

                            {/* Bottom Row: Info and Quick print */}
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
                                    <span className="font-mono text-[10px] opacity-80">({post.priceCoins} CC)</span>
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

              {/* RIGHT SIDE RAIL SECTION (col-span-4) */}
              <section className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Top Authors Chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    সেরা লেখক চার্ট (Top Authors Chart)
                  </h3>
                  {topAuthors.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">কোনো ডাটা এখনও পাওয়া যায়নি।</p>
                  ) : (
                    <div className="space-y-2.5">
                      {topAuthors.slice(0, 3).map((auth: any, index: number) => (
                        <div key={auth.name} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full font-mono font-bold text-[10px] ${
                              index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-100 text-slate-600" : "bg-orange-50 text-orange-750"
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-bold text-slate-700">{auth.name}</span>
                          </div>
                          <div className="text-right text-[10px] text-slate-400 font-mono">
                            <span>{auth.postCount}টি লেখা</span>
                            <span className="mx-1">•</span>
                            <span className="text-orange-500 font-bold">{auth.totalPrints} প্রিন্টস</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Global Add to Print History */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
                    <History className="w-4 h-4 text-orange-500 animate-pulse" />
                    গ্লোবাল প্রিন্ট ইতিহাস (Global Add to Print History)
                  </h3>
                  {adminData.globalHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">এখনও কোনো প্রিন্ট ইতিহাস নেই।</p>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {adminData.globalHistory.slice(0, 5).map((h: any, idx: number) => {
                        const borderColors = [
                          "border-l-4 border-emerald-500 bg-emerald-50/40",
                          "border-l-4 border-orange-500 bg-orange-50/40",
                          "border-l-4 border-violet-500 bg-violet-50/40",
                          "border-l-4 border-slate-300 bg-slate-50/40"
                        ];
                        return (
                          <div key={h.id} className={`text-[10px] p-2 border border-slate-100 rounded-lg flex justify-between items-center gap-2 leading-tight ${borderColors[idx % borderColors.length]}`}>
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
