/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserProfile, WithdrawRequest, WriterApplication, Post } from "../types";
import { 
  ShieldAlert, 
  Users, 
  Coins, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  ShieldCheck, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  BookOpen, 
  ArrowRight, 
  Lock, 
  Unlock, 
  Trash2, 
  Settings, 
  Calendar, 
  Award,
  BookMarked,
  ShoppingBag,
  Wallet,
  RefreshCw
} from "lucide-react";

interface AdminPanelProps {
  profile: UserProfile;
  adminData: {
    users: any[];
    withdrawRequests: WithdrawRequest[];
    writerApplications?: WriterApplication[];
    orders?: any[];
    settlements?: any[];
    globalHistory?: any[];
  };
  posts: Post[];
  onApproveWithdraw: (requestId: string, status: "approved" | "rejected") => Promise<void>;
  onApproveApplication: (applicationId: string, status: "approved" | "rejected") => Promise<void>;
  onRefreshAdminData: () => void;
  onRefreshPosts: () => void;
}

type AdminTabType = "revenue" | "orders" | "content" | "users" | "applications";

export default function AdminPanel({
  profile,
  adminData,
  posts,
  onApproveWithdraw,
  onApproveApplication,
  onRefreshAdminData,
  onRefreshPosts
}: AdminPanelProps) {
  // Tab control
  const [activeTab, setActiveTab] = useState<AdminTabType>("revenue");
  
  // Search fields
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [postSearchTerm, setPostSearchTerm] = useState("");
  
  // Section control inside "users" tab (writers vs readers)
  const [userSubTab, setUserSubTab] = useState<"writers" | "readers">("writers");

  // Interactive expanded views
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  
  // Selected detail modals
  const [selectedUserForCard, setSelectedUserForCard] = useState<any | null>(null);
  const [selectedOrderForPreview, setSelectedOrderForPreview] = useState<any | null>(null);
  const [selectedSettlementForDetail, setSelectedSettlementForDetail] = useState<any | null>(null);

  // Budget settlement state
  const [budgetPool, setBudgetPool] = useState<number>(10000);
  const [isSettling, setIsSettling] = useState(false);

  // PDF Compilation builder state
  const [compilationProgress, setCompilationProgress] = useState<number>(-1); // -1 means idle
  const [compilationLog, setCompilationLog] = useState<string[]>([]);

  // -------------------------------------------------------------
  // DATA PARSING & REAL-TIME CALCULATIONS
  // -------------------------------------------------------------

  // 1. Platform Fund Commission (25% from Article unlocks & gifts/prints)
  // Each post has priceCoins and addToPrintCount.
  // We calculate commission: sum(post.priceCoins * post.addToPrintCount * 0.25)
  const platformFundCoins = posts.reduce((sum, post) => {
    const cost = post.priceCoins || 0;
    const count = post.addToPrintCount || 0;
    return sum + (cost * count * 0.25);
  }, 0);
  
  // Standard conversion 1 Coin = 2 BDT Taka
  const platformFundBDT = platformFundCoins * 2;

  // 2. Orders list
  const orders = adminData.orders || [];

  // 3. KPI values
  const totalCustomOrders = orders.length;
  
  // Total Revenue: sum of BDT prices of successful print orders (status is Paid)
  const totalRevenueBDT = orders
    .filter(o => o.paymentStatus === "Paid")
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    
  // Total Printed A4 Pages: sum of pages of all orders
  const totalPrintedPages = orders.reduce((sum, o) => sum + (o.totalPages || 0), 0);
  
  // Total Published Articles: count of posts in system
  const totalArticlesCount = posts.length;

  // 4. Filters & lists
  const filteredUsers = adminData.users.filter(u => 
    u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const writersList = filteredUsers.filter(u => u.role === "writer");
  const readersList = filteredUsers.filter(u => u.role !== "writer" && u.role !== "admin");

  const filteredPosts = posts.filter(p => 
    p.title?.toLowerCase().includes(postSearchTerm.toLowerCase()) ||
    p.authorName?.toLowerCase().includes(postSearchTerm.toLowerCase())
  );

  const pendingRequests = adminData.withdrawRequests.filter(r => r.status === "pending");
  const processedRequests = adminData.withdrawRequests.filter(r => r.status !== "pending");

  const pendingApplications = (adminData.writerApplications || []).filter(a => a.status === "pending");
  const processedApplications = (adminData.writerApplications || []).filter(a => a.status !== "pending");

  // Writer overall statistics for Monthly Closing snapshot
  const totalWritersUnpaidCoins = writersList.reduce((sum, w) => sum + (w.coins || 0), 0);

  // -------------------------------------------------------------
  // API INTERACTION FUNCTIONS
  // -------------------------------------------------------------

  // Update order print/delivery status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printingStatus: newStatus })
      });
      if (response.ok) {
        onRefreshAdminData();
      } else {
        const err = await response.json();
        alert(err.error || "স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।");
      }
    } catch (e) {
      console.error(e);
      alert("সার্ভার ত্রুটি ঘটেছে।");
    }
  };

  // Toggle article visibility (hide/unhide)
  const handleToggleVisibility = async (post: Post) => {
    const newHiddenState = !post.hidden;
    try {
      const response = await fetch(`/api/admin/posts/${post.id}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: newHiddenState })
      });
      if (response.ok) {
        onRefreshPosts();
        onRefreshAdminData();
        alert(`লেখাটি সফলভাবে ${newHiddenState ? "আড়াল (Hidden)" : "উন্মুক্ত (Live)"} করা হয়েছে।`);
      } else {
        alert("ভিজিবিলিটি আপডেট করতে সমস্যা হয়েছে।");
      }
    } catch (e) {
      console.error(e);
      alert("সার্ভার ত্রুটি ঘটেছে।");
    }
  };

  // Permanent Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই লেখাটি চিরতরে মুছে ফেলতে চান? এটি আর উদ্ধার করা যাবে না।")) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        onRefreshPosts();
        onRefreshAdminData();
        alert("লেখাটি সফলভাবে চিরতরে ডিলিট করা হয়েছে।");
      } else {
        alert("ডিলিট করা সম্ভব হয়নি।");
      }
    } catch (e) {
      console.error(e);
      alert("সার্ভার ত্রুটি ঘটেছে।");
    }
  };

  // Monthly Closing Action
  const handleMonthlyClosing = async () => {
    if (totalWritersUnpaidCoins === 0) {
      alert("এই মাসে লেখকদের কোনো রয়্যালটি কয়েন জমা নেই। সেটেলমেন্ট করার প্রয়োজন নেই।");
      return;
    }
    if (!confirm(`আপনি কি এই মাসের ক্লোজিং সম্পন্ন করতে চান? \nবন্টনযোগ্য বাজেট পুল: ৳ ${budgetPool} BDT\nমোট কয়েন স্ন্যাপশট: ${totalWritersUnpaidCoins} CC\nএটি করলে সকল লেখকের জমানো রয়্যালটি কয়েন রিসেট হয়ে তাদের টাকা ব্যালেন্সে যুক্ত হবে।`)) {
      return;
    }
    setIsSettling(true);
    try {
      const response = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetPool: Number(budgetPool) })
      });
      if (response.ok) {
        onRefreshAdminData();
        onRefreshPosts();
        alert("অভিনন্দন! চলতি মাসের রয়্যালটি সেটেলমেন্ট এবং ক্লোজিং সফলভাবে সম্পন্ন হয়েছে ও সেটেলমেন্ট আর্কাইভে সেভ করা হয়েছে।");
      } else {
        const err = await response.json();
        alert(err.error || "সেটেলমেন্ট সম্পন্ন করতে সমস্যা হয়েছে।");
      }
    } catch (e) {
      console.error(e);
      alert("সার্ভার সংযোগ ত্রুটি।");
    } finally {
      setIsSettling(false);
    }
  };

  // Process payout/withdraw request
  const handleApprovePayout = async (requestId: string, status: "approved" | "rejected") => {
    try {
      if (status === "approved") {
        const response = await fetch(`/api/admin/withdraw/${requestId}/pay`, {
          method: "POST"
        });
        if (response.ok) {
          onRefreshAdminData();
          alert("ক্যাশআউট রিকোয়েস্টটি ম্যানুয়ালি পেইড হিসেবে সফলভাবে অনুমোদন করা হয়েছে।");
        } else {
          alert("অ্যাকশন সম্পন্ন করা সম্ভব হয়নি।");
        }
      } else {
        await onApproveWithdraw(requestId, "rejected");
        onRefreshAdminData();
        alert("রিকোয়েস্টটি বাতিল করা হয়েছে এবং টাকা ফেরত দেওয়া হয়েছে।");
      }
    } catch (e) {
      console.error(e);
      alert("সার্ভার ত্রুটি।");
    }
  };

  const handleWriterAppAction = async (appId: string, status: "approved" | "rejected") => {
    try {
      await onApproveApplication(appId, status);
      onRefreshAdminData();
      onRefreshPosts();
      alert(`লেখক আবেদনটি সফলভাবে ${status === "approved" ? "অনুমোদন করা হয়েছে এবং নমুনা লেখাসমূহ লাইভ করা হয়েছে" : "বাতিল করা হয়েছে"}।`);
    } catch (e) {
      console.error(e);
      alert("আবেদন মডারেশন সম্পন্ন করতে ব্যর্থ হয়েছে।");
    }
  };

  // Print-ready Layout Compiler simulator
  const startPdfSimulation = () => {
    setCompilationProgress(0);
    setCompilationLog(["[সিস্টেম] পিডিএফ কম্পাইলেশন ইঞ্জিন সচল করা হচ্ছে...", "[প্রোটোকল] A4 পেজ মার্জিন ও হাই-রেজোলিউশন ফন্ট সেট করা হচ্ছে..."]);
    
    const steps = [
      { progress: 25, log: "[প্রসেস] অধ্যায় ১: কভার পেজ রেন্ডার সম্পন্ন।" },
      { progress: 50, log: "[প্রসেস] অধ্যায় ২: সূচিপত্র (ডটেড লিডারসহ) ডাইনামিকালি ম্যাপড।" },
      { progress: 75, log: "[প্রসেস] অধ্যায় ৩+: সকল প্রবন্ধের ডাবল কলাম গ্রিড লেআউট জেনারেটেড।" },
      { progress: 90, log: "[বাইন্ডিং] রিড-টু-প্রিন্ট প্রেসের সরকারি সিল ও সিগনেচার এম্বেড হচ্ছে..." },
      { progress: 100, log: "[সাকসেস] হাই-রেজোলিউশন প্রিন্ট রেডি ডিস্ট্রিবিউশন ফাইল কম্পাইল্ড! ডাউনলোড রেডি।" }
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setCompilationProgress(step.progress);
        setCompilationLog(prev => [...prev, step.log]);
      }, (index + 1) * 800);
    });
  };

  // Writer levels helper
  const getWriterBadge = (writer: any) => {
    const earned = writer.currentBalance || 0;
    const coins = writer.coins || 0;
    if (earned >= 10000 || coins >= 1000) {
      return { text: "🥇 গোল্ড কলামিস্ট", style: "bg-amber-50 text-amber-700 border-amber-200" };
    } else if (earned >= 3000 || coins >= 400) {
      return { text: "🥈 সিলভার কলামিস্ট", style: "bg-slate-100 text-slate-700 border-slate-300" };
    } else {
      return { text: "🥉 ব্রোঞ্জ কলামিস্ট", style: "bg-orange-50 text-orange-700 border-orange-200" };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* -------------------------------------------------------------
          TOP BAR & SUB-TABS NAVIGATION
          ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-rose-600 shrink-0" />
            প্যানেল কন্ট্রোল ও মডারেশন হাব (Super Admin)
          </h2>
          <p className="text-xs text-slate-400 mt-1">প্ল্যাটফর্মের আর্থিক হিসাব, কাস্টম অর্ডার, কন্টেন্ট ফিল্টার ও লেখক মডারেশন নিয়ন্ত্রণ করুন</p>
        </div>
        <div className="flex gap-2">
          <button 
            id="admin-refresh-data-btn"
            onClick={() => {
              onRefreshAdminData();
              onRefreshPosts();
            }}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="bg-rose-50 text-rose-700 text-xs px-3.5 py-2 font-bold rounded-xl border border-rose-100 flex items-center gap-1.5 font-mono">
            🛡️ ROLE: SYSTEM_ADMIN
          </span>
        </div>
      </div>

      {/* Elegant 5 Sub-Tabs Navigation Row */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl grid grid-cols-2 md:grid-cols-5 gap-1 shadow-inner">
        <button
          id="admin-subtab-revenue"
          onClick={() => setActiveTab("revenue")}
          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 cursor-pointer ${
            activeTab === "revenue" 
              ? "bg-white text-rose-700 shadow-sm border border-slate-200/50" 
              : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-rose-500" />
          <span>রাজস্ব ও ড্যাশবোর্ড</span>
        </button>
        <button
          id="admin-subtab-orders"
          onClick={() => setActiveTab("orders")}
          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 cursor-pointer ${
            activeTab === "orders" 
              ? "bg-white text-orange-700 shadow-sm border border-slate-200/50" 
              : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
          }`}
        >
          <Printer className="w-4 h-4 text-orange-500" />
          <span>অর্ডার ও প্রেস ম্যাপ ({totalCustomOrders})</span>
        </button>
        <button
          id="admin-subtab-content"
          onClick={() => setActiveTab("content")}
          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 cursor-pointer ${
            activeTab === "content" 
              ? "bg-white text-violet-700 shadow-sm border border-slate-200/50" 
              : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
          }`}
        >
          <BookOpen className="w-4 h-4 text-violet-500" />
          <span>প্রবন্ধ মডারেশন ({totalArticlesCount})</span>
        </button>
        <button
          id="admin-subtab-users"
          onClick={() => setActiveTab("users")}
          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 cursor-pointer ${
            activeTab === "users" 
              ? "bg-white text-emerald-700 shadow-sm border border-slate-200/50" 
              : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span>ইউজার ও ক্লোজিং</span>
        </button>
        <button
          id="admin-subtab-applications"
          onClick={() => setActiveTab("applications")}
          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 cursor-pointer ${
            activeTab === "applications" 
              ? "bg-white text-amber-700 shadow-sm border border-slate-200/50" 
              : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
          }`}
        >
          <FileText className="w-4 h-4 text-amber-500" />
          <span>লেখক আবেদন ({pendingApplications.length})</span>
        </button>
      </div>

      {/* -------------------------------------------------------------
          TAB PANEL CONTENT
          ------------------------------------------------------------- */}
      <div className="transition-all duration-350">
        
        {/* ==================== SUB-TAB 1: REVENUE MODERATION ==================== */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            
            {/* Platform Fund Balance Glowing Card */}
            <div className="bg-gradient-to-tr from-rose-950 via-slate-900 to-rose-900 p-6 sm:p-8 rounded-3xl text-white border border-rose-800/30 relative overflow-hidden shadow-lg">
              <div className="absolute right-0 bottom-0 opacity-10 translate-y-12 translate-x-12 scale-150">
                <Coins className="w-64 h-64 text-rose-500" />
              </div>
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs uppercase tracking-widest font-mono text-rose-200/70 font-bold">REVENUE RESERVE COMMISSION (25%)</span>
                  </div>
                  <h3 className="text-lg font-serif text-rose-100">প্ল্যাটফর্ম রিজার্ভ ফান্ড ব্যালেন্স</h3>
                  <p className="text-xs text-rose-300/80 max-w-xl">
                    নীতিমালা অনুযায়ী প্রতিটি কলাম আনলক বা সংকলন থেকে অর্জিত কয়েনের ২৫% কমিশন প্ল্যাটফর্ম ফান্ডে রিয়েল-টাইমে জমা হয়।
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shrink-0 text-center sm:text-right min-w-[200px] backdrop-blur-xs">
                  <p className="text-[10px] text-rose-300 uppercase tracking-widest font-bold">সংগৃহীত কমিশন ফান্ড</p>
                  <p className="text-3xl font-black font-mono text-rose-400 mt-1">{platformFundCoins.toFixed(1)} CC</p>
                  <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-rose-300/70">BDT সমপরিমাণ:</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">৳ {platformFundBDT.toFixed(0)} Taka</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 KPI Counters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Custom Orders */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between group hover:border-orange-300 transition-all">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">কাস্টম অর্ডার (Custom Orders)</p>
                  <p className="text-2xl font-black font-mono text-slate-800 mt-1.5">{totalCustomOrders} টি</p>
                  <p className="text-[10px] text-slate-400 mt-1">সিস্টেমে সর্বমোট সংকলন</p>
                </div>
                <div className="bg-orange-50 text-orange-500 p-3 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <Printer className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Total Revenue BDT */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between group hover:border-emerald-300 transition-all">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">মোট রেভিনিউ (Total Revenue)</p>
                  <p className="text-2xl font-black font-mono text-slate-800 mt-1.5">৳ {totalRevenueBDT}</p>
                  <p className="text-[10px] text-slate-400 mt-1">পরিশোধিত সফল সংকলন থেকে</p>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Printed Pages */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between group hover:border-blue-300 transition-all">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">মুদ্রিত পৃষ্ঠা (Printed Pages)</p>
                  <p className="text-2xl font-black font-mono text-slate-800 mt-1.5">{totalPrintedPages} পাতা</p>
                  <p className="text-[10px] text-slate-400 mt-1">A4 পেপার প্রিন্টিং ভলিউম</p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Published Articles */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between group hover:border-purple-300 transition-all">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">প্রকাশিত প্রবন্ধ (Live Articles)</p>
                  <p className="text-2xl font-black font-mono text-slate-800 mt-1.5">{totalArticlesCount} টি</p>
                  <p className="text-[10px] text-slate-400 mt-1">বর্তমানে প্ল্যাটফর্মে লাইভ</p>
                </div>
                <div className="bg-purple-50 text-purple-600 p-3 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-all">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Global Activity Mini Rail */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4 font-serif">
                <Clock className="w-4.5 h-4.5 text-rose-500" />
                সিস্টেম অ্যাক্টিভিটি ফিড (System Real-time Events)
              </h3>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {(adminData.globalHistory || []).map((history: any, index: number) => (
                  <div key={history.id || index} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <p className="text-slate-600 truncate">
                        <strong className="text-slate-800">{history.userDisplayName}</strong> {history.actionText || "প্রিন্ট বাস্কেটে যুক্ত করেছেন"} <strong className="text-violet-700 font-serif">"{history.postTitle}"</strong>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(history.timestamp).toLocaleString("bn-BD", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                ))}
                {(!adminData.globalHistory || adminData.globalHistory.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-4">কোনো সিস্টেম অ্যাক্টিভিটি রেকর্ড পাওয়া যায়নি।</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ==================== SUB-TAB 2: ORDERS MANAGEMENT ==================== */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-serif">কাস্টম সংকলন অর্ডার রেজিস্ট্রি (Orders Board)</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">গ্রাহকদের কাস্টম বই প্রিন্ট রিকোয়েস্টের তথ্য এবং বাইন্ডিং স্ট্যাটাস আপডেট</p>
              </div>
              <span className="bg-orange-100 text-orange-700 text-xs px-3 py-1 font-bold rounded-lg font-mono">
                TOTAL: {orders.length} ACTIVE ORDERS
              </span>
            </div>

            {/* Spreadsheet style layout table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="excel-table w-full min-w-[950px]">
                  <thead>
                    <tr>
                      <th className="w-20">অর্ডার আইডি</th>
                      <th>গ্রাহক পরিচিতি</th>
                      <th>বই ও কন্টেন্ট বিবরণ</th>
                      <th className="text-center w-28">মোট পৃষ্ঠা</th>
                      <th className="text-center w-28">মূল্য (৳)</th>
                      <th className="text-center w-28">পেমেন্ট</th>
                      <th className="text-center w-40">মুদ্রণাবস্থা (Status)</th>
                      <th className="text-center w-28">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="font-mono font-bold text-slate-700 text-xs">{order.id}</td>
                        <td className="text-left py-3.5">
                          <p className="font-bold text-slate-800 text-xs">{order.customerName}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{order.customerPhone}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{order.customerAddress}, {order.customerCity}</p>
                        </td>
                        <td className="text-left max-w-xs">
                          <p className="font-bold text-slate-700 text-xs font-serif truncate" title={order.bookName}>
                            📖 {order.bookName || "কাস্টম সংকলন"}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(order.articleTitles || []).map((title: string, idx: number) => (
                              <span key={idx} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm truncate max-w-[140px]" title={title}>
                                {title}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-center font-mono font-bold text-slate-700 text-xs">{order.totalPages || 0} পৃষ্ঠা</td>
                        <td className="text-center font-mono font-bold text-purple-700 text-xs">৳ {order.totalPrice}</td>
                        <td className="text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            order.paymentStatus === "Paid" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                          }`}>
                            {order.paymentStatus === "Paid" ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                        <td className="text-center">
                          <select
                            value={order.printingStatus}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className={`p-1.5 rounded-lg text-[11px] font-bold outline-hidden border cursor-pointer focus:ring-1 focus:ring-orange-500/20 text-center w-36 ${
                              order.printingStatus === "Delivered"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : order.printingStatus === "Shipped"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : order.printingStatus === "Printing"
                                ? "bg-orange-50 text-orange-700 border-orange-200 animate-pulse"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <option value="Received">📥 Received</option>
                            <option value="Printing">🖨️ Printing</option>
                            <option value="Shipped">🚚 Shipped</option>
                            <option value="Delivered">✅ Delivered</option>
                          </select>
                        </td>
                        <td className="text-center">
                          <button
                            id={`preview-order-btn-${order.id}`}
                            onClick={() => {
                              setSelectedOrderForPreview(order);
                              setCompilationProgress(-1); // Reset compiler
                              setCompilationLog([]);
                            }}
                            className="py-1 px-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <BookOpen className="w-3 h-3" />
                            বই প্রিভিউ
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">কোনো প্রিন্ট অর্ডার পাওয়া যায়নি।</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== SUB-TAB 3: CONTENT MODERATION ==================== */}
        {activeTab === "content" && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-search-posts"
                  type="text"
                  placeholder="টাইটেল অথবা লেখকের নাম দিয়ে কলাম ফিল্টার..."
                  value={postSearchTerm}
                  onChange={(e) => setPostSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <span className="bg-violet-50 text-violet-700 text-xs px-3.5 py-1.5 font-bold rounded-xl border border-violet-100 font-sans">
                মোট প্রবন্ধ তালিকা: {filteredPosts.length} টি
              </span>
            </div>

            {/* Article Directory Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="excel-table w-full min-w-[850px]">
                  <thead>
                    <tr>
                      <th className="text-left pl-6">প্রবন্ধের শিরোনাম ও ক্যাটগরি</th>
                      <th>লেখক</th>
                      <th className="text-center w-28">ভিউ কাউন্ট</th>
                      <th className="text-center w-28">প্রিন্ট কাউন্ট</th>
                      <th className="text-center w-28">কয়েন প্রাইস</th>
                      <th className="text-center w-32">অবস্থা (Visibility)</th>
                      <th className="text-center w-52">অ্যাকশনস (Actions)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map((post) => {
                      const wordCount = Math.round((post.content || "").length / 4.5); // Proportional wordcount
                      return (
                        <tr key={post.id} className="hover:bg-slate-50/50">
                          <td className="text-left pl-6 py-3.5 max-w-sm">
                            <p className="font-bold text-slate-800 font-serif text-sm leading-tight hover:text-violet-600 cursor-pointer">{post.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm font-sans font-semibold">প্রবন্ধ</span>
                              <span className="text-[9px] text-slate-400 font-mono">~{wordCount} শব্দ</span>
                              <span className="text-[9px] text-slate-400 font-mono">ID: {post.id}</span>
                            </div>
                          </td>
                          <td className="text-center">
                            <p className="font-bold text-slate-700 text-xs font-serif">{post.authorName}</p>
                            <span className="text-[9px] text-slate-400 font-mono">UID: {post.authorId.substring(0, 8)}</span>
                          </td>
                          <td className="text-center font-mono text-xs font-bold text-slate-600">👁️ {post.viewCount || 0}</td>
                          <td className="text-center font-mono text-xs font-bold text-slate-600">🖨️ {post.addToPrintCount || 0}</td>
                          <td className="text-center font-mono text-xs font-bold text-orange-600">{post.priceCoins || 0} CC</td>
                          <td className="text-center">
                            {post.hidden ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 inline-flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Hidden
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <Unlock className="w-2.5 h-2.5" /> Live
                              </span>
                            )}
                          </td>
                          <td className="text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                id={`toggle-visibility-btn-${post.id}`}
                                onClick={() => handleToggleVisibility(post)}
                                className={`py-1.5 px-3 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 border ${
                                  post.hidden
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                                    : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300"
                                }`}
                              >
                                {post.hidden ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {post.hidden ? "আনহাইড করুন" : "হাইড করুন"}
                              </button>
                              <button
                                id={`delete-post-btn-${post.id}`}
                                onClick={() => handleDeletePost(post.id)}
                                className="py-1.5 px-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 border border-red-200"
                              >
                                <Trash2 className="w-3 h-3" />
                                চিরতরে ডিলিট
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPosts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">কোনো প্রবন্ধ বা কলাম পাওয়া যায়নি।</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== SUB-TAB 4: WRITERS & USERS MANAGEMENT ==================== */}
        {activeTab === "users" && (
          <div className="space-y-6">
            
            {/* Top Row: User sub-navigation Toggle & Monthly settlement triggers */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: List Switcher & search */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">ইউজার ডাটাবেজ ফিল্টার</h4>
                  
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      id="users-subtab-writers"
                      onClick={() => setUserSubTab("writers")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        userSubTab === "writers" 
                          ? "bg-white text-emerald-700 shadow-2xs" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      ✍️ কলামিস্ট লেখকবৃন্দ ({writersList.length})
                    </button>
                    <button
                      id="users-subtab-readers"
                      onClick={() => setUserSubTab("readers")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        userSubTab === "readers" 
                          ? "bg-white text-emerald-700 shadow-2xs" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      📖 রেজিস্টার্ড পাঠক ({readersList.length})
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="admin-search-users-sub"
                      type="text"
                      placeholder="ইউজার অনুসন্ধান..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Cashout Requests Processing Mini Board */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1 font-serif">
                    <Wallet className="w-4 h-4 text-orange-500" />
                    ক্যাশআউট রিকোয়েস্ট প্রসেসিং ({pendingRequests.length})
                  </h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800 text-xs truncate max-w-[150px]">{req.userEmail}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">বিকাশ: {req.accountNumber}</p>
                          </div>
                          <span className="font-mono font-bold text-orange-600 text-xs">৳ {req.amount}</span>
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <button
                            id={`pay-withdraw-btn-${req.id}`}
                            onClick={() => handleApprovePayout(req.id, "approved")}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md transition-all cursor-pointer"
                          >
                            ✓ Pay
                          </button>
                          <button
                            id={`cancel-withdraw-btn-${req.id}`}
                            onClick={() => handleApprovePayout(req.id, "rejected")}
                            className="py-1 px-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[10px] rounded-md transition-all cursor-pointer"
                          >
                            ✗ Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                    {pendingRequests.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-4">কোনো অপেক্ষমাণ ক্যাশআউট আবেদন নেই।</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Monthly Closing and budget pool */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Monthly Closing Panel */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 font-serif">রয়্যালটি মাসিক সেটেলমেন্ট ও ক্লোজিং (Monthly Closing)</h3>
                        <p className="text-[11px] text-slate-400">লেখকদের জমানো কয়েন স্ন্যাপশট রিসেট এবং BDT বাজেট বিতরণ</p>
                      </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      LIVE SNAPSHOT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">মোট বন্টনযোগ্য লেখক কয়েন</p>
                      <p className="text-2xl font-black font-mono text-orange-600 mt-1">{totalWritersUnpaidCoins} CC</p>
                      <p className="text-[9px] text-slate-400 mt-1">সব লেখকের অমিমাংসিত কয়েন</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block text-center mb-1">বন্টনযোগ্য বাজেট পুল (৳ BDT)</label>
                      <input
                        id="closing-budget-pool-input"
                        type="number"
                        value={budgetPool}
                        onChange={(e) => setBudgetPool(Math.max(0, Number(e.target.value)))}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-sm focus:outline-hidden focus:border-emerald-500"
                        placeholder="বাজেট পুল পরিমাণ"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        id="run-closing-action-btn"
                        onClick={handleMonthlyClosing}
                        disabled={isSettling}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isSettling ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            হিসাব কষা হচ্ছে...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            মাসিক ক্লোজিং সম্পন্ন করুন
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic leading-relaxed pt-1">
                    * ক্লোজিং বাটনে ক্লিক করলে সমস্ত লেখকের অমিমাংসিত রয়্যালটি কয়েন অনুপাতে বাজেট পুলের টাকা বিতরণ করা হবে এবং কয়েন রিসেট হয়ে যাবে। পূর্বে করা সকল ক্লোজিং হিস্ট্রি নিচে আর্কাইভে সংরক্ষিত হবে।
                  </p>
                </div>

                {/* Settlement Archives Panel */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1 font-serif">
                    <Award className="w-4.5 h-4.5 text-violet-500" />
                    সেটেলমেন্ট হিস্ট্রি আর্কাইভ (Settlement History Archives)
                  </h3>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {(adminData.settlements || []).map(set => (
                      <div key={set.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-xs hover:bg-slate-100/50 transition-colors">
                        <div>
                          <p className="font-bold text-slate-800 font-serif">মাসিক সেটেলমেন্ট: {set.monthLabel}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            তারিখ: {new Date(set.timestamp).toLocaleDateString("bn-BD")} • মোট কয়েন: {set.totalCoins} CC
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-medium">মোট বন্টনকৃত বাজেট</span>
                            <span className="font-mono font-bold text-violet-700 text-xs">৳ {set.budgetPool}</span>
                          </div>
                          <button
                            id={`view-settlement-btn-${set.id}`}
                            onClick={() => setSelectedSettlementForDetail(set)}
                            className="py-1 px-2.5 bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold text-[10px] rounded-md transition-all cursor-pointer"
                          >
                            বিস্তারিত বন্টন
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!adminData.settlements || adminData.settlements.length === 0) && (
                      <p className="text-xs text-slate-400 py-4 text-center">কোনো সেটেলমেন্ট আর্কাইভ হিস্ট্রি পাওয়া যায়নি।</p>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* List Table Board depending on sub-tab */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-150 bg-slate-50 font-serif font-bold text-slate-800 text-xs">
                {userSubTab === "writers" ? "✍️ নিবন্ধিত কলামিস্ট লেখকবৃন্দ তালিকা" : "📖 নিবন্ধিত সাধারণ পাঠক তালিকা"}
              </div>
              <div className="overflow-x-auto">
                <table className="excel-table w-full min-w-[750px]">
                  <thead>
                    <tr>
                      <th className="text-left pl-6">ব্যবহারকারীর নাম ও ইমেইল (User)</th>
                      <th className="text-center w-36">ভূমিকা (Role)</th>
                      <th className="text-center w-40">কমিউনিটি মেম্বারশিপ লেভেল</th>
                      <th className="text-center w-32">চলতি মাসের কয়েন</th>
                      <th className="text-center w-36">ওয়ালেট ব্যালেন্স (৳ BDT)</th>
                      <th className="text-center w-28">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(userSubTab === "writers" ? writersList : readersList).map((u) => {
                      const level = getWriterBadge(u);
                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/50">
                          <td className="text-left pl-6 py-3 font-sans">
                            <p className="font-bold text-slate-800 text-xs leading-none mb-1">{u.displayName}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{u.email}</span>
                          </td>
                          <td className="text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              u.role === "writer" 
                                ? "bg-orange-50 text-orange-700 border border-orange-200" 
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                              {u.role === "writer" ? "Writers Group" : "Reader Account"}
                            </span>
                          </td>
                          <td className="text-center">
                            {u.role === "writer" ? (
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${level.style}`}>
                                {level.text}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">🥉 সাধারণ পাঠক</span>
                            )}
                          </td>
                          <td className="text-center font-mono text-xs font-bold text-orange-600">
                            {u.coins || 0} CC
                          </td>
                          <td className="text-center font-mono text-xs font-bold text-purple-700">
                            ৳ {u.currentBalance || 0}
                          </td>
                          <td className="text-center">
                            <button
                              id={`view-user-card-btn-${u.uid}`}
                              onClick={() => setSelectedUserForCard(u)}
                              className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-md transition-colors cursor-pointer inline-block"
                            >
                              বায়ো-কার্ড
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {(userSubTab === "writers" ? writersList : readersList).length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">কোনো ব্যবহারকারী পাওয়া যায়নি।</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== SUB-TAB 5: WRITER APPLICATIONS REVIEW ==================== */}
        {activeTab === "applications" && (
          <div className="space-y-6">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between font-serif">
              <div>
                <h3 className="text-sm font-bold text-slate-800">অপেক্ষমাণ লেখক আবেদনপত্র মডারেশন (Writer Review Room)</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">সাধারণ পাঠকদের পাঠানো কলামিস্ট হওয়ার আবেদন ও নমুনা প্রবন্ধ মূল্যায়ন</p>
              </div>
              <span className="bg-amber-100 text-amber-700 text-xs px-3 py-1 font-bold rounded-lg font-mono">
                {pendingApplications.length} PENDING APPLICATIONS
              </span>
            </div>

            {pendingApplications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 max-w-xl mx-auto space-y-2">
                <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">কোনো নতুন লেখক আবেদন পেন্ডিং নেই।</p>
                <p className="text-xs text-slate-400">নতুন পাঠক আবেদন জমা দিলে তা এখানে মূল্যায়নের জন্য আসবে।</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApplications.map((app) => {
                  const isExpanded = expandedAppId === app.id;
                  return (
                    <div 
                      key={app.id}
                      className="p-5 bg-white rounded-3xl border border-slate-200 shadow-3xs flex flex-col gap-4 hover:border-amber-300 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md uppercase">
                              ক্যাটাগরি: {app.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {app.id}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-800">আবেদনকারীর নাম: {app.userDisplayName}</p>
                          <p className="text-xs text-slate-500 mt-1">ইমেইল: <span className="font-mono text-slate-600">{app.userEmail}</span></p>
                          <p className="text-xs text-slate-400 mt-0.5">আবেদনের তারিখ: {new Date(app.timestamp).toLocaleString("bn-BD")}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            id={`toggle-app-essay-btn-${app.id}`}
                            onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer border border-slate-200"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            {isExpanded ? "নমুনা বন্ধ করুন" : "নমুনা প্রবন্ধ যাচাই করুন"}
                          </button>
                          <button
                            id={`approve-writer-btn-${app.id}`}
                            onClick={() => handleWriterAppAction(app.id, "approved")}
                            className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            অনুমোদন করুন
                          </button>
                          <button
                            id={`reject-writer-btn-${app.id}`}
                            onClick={() => handleWriterAppAction(app.id, "rejected")}
                            className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-red-200"
                          >
                            <XCircle className="w-4 h-4" />
                            নাকচ করুন
                          </button>
                        </div>
                      </div>

                      {app.motivation && (
                        <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-150">
                          <strong className="text-slate-700 block mb-1">লেখক প্রোগ্রামে যোগদানের মোটিভেশন:</strong>
                          "{app.motivation}"
                        </div>
                      )}

                      {isExpanded && (
                        <div className="mt-2 space-y-4 pt-4 border-t border-slate-200/80 font-serif">
                          <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-sm font-sans uppercase tracking-wider mb-2 inline-block">নমুনা প্রবন্ধ ১</span>
                            <h4 className="text-base font-bold text-slate-800 mb-2">{app.sample1Title}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-serif">{app.sample1Content}</p>
                          </div>

                          <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-sm font-sans uppercase tracking-wider mb-2 inline-block">নমুনা প্রবন্ধ ২</span>
                            <h4 className="text-base font-bold text-slate-800 mb-2">{app.sample2Title}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-serif">{app.sample2Content}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Processed Applications History list */}
            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-4 font-serif">
                <ShieldAlert className="w-4.5 h-4.5 text-slate-500" />
                পূর্ববর্তী মডারেশন হিস্ট্রি খতিয়ান
              </h3>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="excel-table w-full min-w-[700px]">
                    <thead>
                      <tr>
                        <th className="text-left pl-6">আবেদনকারীর বিবরণ</th>
                        <th>ক্যাটাগরি</th>
                        <th className="text-center">আবেদনের তারিখ</th>
                        <th className="text-center w-40">মডারেশন স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedApplications.map((app) => (
                        <tr key={app.id}>
                          <td className="text-left pl-6 py-2.5">
                            <p className="font-bold text-slate-700 text-xs">{app.userDisplayName}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{app.userEmail}</span>
                          </td>
                          <td className="text-center font-sans font-medium text-xs text-slate-600">{app.category}</td>
                          <td className="text-center font-mono text-xs text-slate-500">{new Date(app.timestamp).toLocaleDateString("bn-BD")}</td>
                          <td className="text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              app.status === "approved" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}>
                              {app.status === "approved" ? "অনুমোদিত (Approved)" : "বাতিলকৃত (Rejected)"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {processedApplications.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-slate-400">কোনো পূর্ববর্তী রেকর্ড পাওয়া যায়নি।</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* -------------------------------------------------------------
          MODALS DECK
          ------------------------------------------------------------- */}

      {/* MODAL 1: HIGH-FIDELITY PRINT-READY BOOK LAYOUT PREVIEW MODAL */}
      {selectedOrderForPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-bold text-slate-800 font-serif">প্রিন্ট-রেডি কভার ও বুক লেআউট বিল্ডার</h3>
                  <p className="text-[11px] text-slate-400">অর্ডার আইডি: <span className="font-mono font-bold">{selectedOrderForPreview.id}</span> • প্রেস ম্যাকিং প্রুফ শিট</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrderForPreview(null)} 
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer text-xs font-bold transition-all"
              >
                ✗ বন্ধ করুন
              </button>
            </div>

            {/* Modal Scrollable Workspace */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-100/50 space-y-6">
              
              {/* Virtual Proof Layout Book container */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                
                {/* Book specifications & Compilation logs */}
                <div className="md:col-span-4 space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-sans pb-2 border-b border-slate-100">বই স্পেসিফিকেশন</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">সংকলনের নাম:</span><span className="font-serif font-bold text-slate-800">{selectedOrderForPreview.bookName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">মোট পাতা সংখ্যা:</span><span className="font-mono font-bold text-slate-800">{selectedOrderForPreview.totalPages} পৃষ্ঠা (A4)</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">অন্তর্ভুক্ত প্রবন্ধ:</span><span className="font-mono font-bold text-slate-800">{selectedOrderForPreview.articleTitles?.length}টি</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">গ্রাহক:</span><span className="font-bold text-slate-800">{selectedOrderForPreview.customerName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">শিপিং সিটি:</span><span className="font-bold text-slate-700">{selectedOrderForPreview.customerCity}</span></div>
                    </div>
                  </div>

                  {/* Compilation simulation buttons */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-sans">হাই-রেজোলিউশন কম্পাইলার</h4>
                    {compilationProgress === -1 ? (
                      <button
                        onClick={startPdfSimulation}
                        className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <Settings className="w-4 h-4 animate-spin-slow" />
                        লেআউট কম্পাইল করুন
                      </button>
                    ) : (
                      <div className="space-y-3 font-mono">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-orange-600">কম্পাইলিং প্রোগ্রেস:</span>
                          <span>{compilationProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${compilationProgress}%` }} />
                        </div>
                        {compilationProgress === 100 && (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              alert("প্রিন্ট-রেডি পিডিএফ ডাউনলোড সফল হয়েছে! কাস্টম বই কভার এবং প্রবন্ধের সঠিক হাই-ফিডেলিটি ফরম্যাটেড পিডিএফ কম্পাইল করে আপনার ডিভাইসে সংরক্ষণ করা হয়েছে।");
                            }}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 text-center block"
                          >
                            <Printer className="w-4 h-4" />
                            পিডিএফ ডাউনলোড করুন
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Log Console Output */}
                  {compilationLog.length > 0 && (
                    <div className="bg-slate-900 text-[10px] text-slate-200 p-4 rounded-xl font-mono space-y-1.5 max-h-[140px] overflow-y-auto shadow-inner">
                      {compilationLog.map((log, index) => (
                        <p key={index} className={log.startsWith("[সাকসেস]") ? "text-emerald-400 font-bold" : "text-slate-300"}>
                          {log}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Simulated Book Pages (High fidelity book-style rendering) */}
                <div className="md:col-span-8 flex flex-col gap-6">
                  
                  {/* Proof Page 1: COVER PAGE representation */}
                  <div className="bg-white p-8 md:p-12 border-2 border-slate-300 rounded-2xl shadow-md font-serif relative overflow-hidden min-h-[360px] flex flex-col justify-between">
                    {/* Watermark/Pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#f1f1f1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
                    
                    <div className="text-center space-y-2 relative z-10">
                      <p className="text-[10px] uppercase font-sans tracking-widest text-slate-400 font-bold">কাস্টম বুক কভার লেআউট (Page 1)</p>
                      <div className="w-12 h-1 bg-slate-300 mx-auto mt-2" />
                    </div>

                    <div className="text-center my-6 space-y-3 relative z-10">
                      <h1 className="text-2xl md:text-3xl font-serif font-black text-slate-800 tracking-tight leading-tight px-4">
                        {selectedOrderForPreview.bookName}
                      </h1>
                      <p className="text-xs text-slate-500 italic font-serif">রিড-টু-প্রিন্ট প্রেসের নিজস্ব কাস্টম সংকলন সিরিজ</p>
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-200 pt-6 relative z-10">
                      <div className="text-left">
                        <p className="text-[9px] uppercase font-sans text-slate-400 font-bold">গ্রাহক পরিচিতি</p>
                        <p className="text-xs font-bold text-slate-700 mt-1">{selectedOrderForPreview.customerName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedOrderForPreview.customerPhone}</p>
                      </div>

                      {/* Official Press Seal Stamp */}
                      <div className="border-4 border-dashed border-rose-500/80 text-rose-500/80 rounded-full w-20 h-20 flex flex-col items-center justify-center font-sans uppercase font-black text-[9px] tracking-tight rotate-12 shrink-0 select-none bg-rose-50/20">
                        <span className="text-[7px]">READ-TO-PRINT</span>
                        <span className="text-[8px] border-y border-rose-400/60 my-0.5">PRESS SEAL</span>
                        <span className="text-[7px]">AUTHENTIC</span>
                      </div>
                    </div>
                  </div>

                  {/* Proof Page 2: TABLE OF CONTENTS (INDEX) */}
                  <div className="bg-white p-8 border-2 border-slate-300 rounded-2xl shadow-md font-serif min-h-[300px] flex flex-col justify-between">
                    <div>
                      <div className="text-center pb-4 border-b border-slate-100">
                        <p className="text-[10px] uppercase font-sans tracking-widest text-slate-400 font-bold">সূচিপত্র লেআউট (Page 2)</p>
                        <h2 className="text-lg font-serif font-bold text-slate-800 mt-2">বইয়ের নির্ঘণ্ট ও সূচি</h2>
                      </div>

                      {/* Dot dash list */}
                      <div className="space-y-4 mt-6">
                        {(selectedOrderForPreview.articleTitles || []).map((title: string, index: number) => {
                          const pageNo = 5 + (index * 12); // Dynamic mock page index
                          return (
                            <div key={index} className="flex items-end justify-between text-xs font-serif text-slate-700">
                              <span className="font-bold shrink-0">অধ্যায় {index + 1}: {title}</span>
                              <div className="flex-1 mx-2 border-b border-dotted border-slate-300 h-1 mb-1" />
                              <span className="font-mono font-bold shrink-0">পৃষ্ঠা {pageNo}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-center pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                      Page 2 • Read-to-Print Indexer Engine
                    </div>
                  </div>

                  {/* Proof Page 3: CHAPTER GRID COLUMN PREVIEW */}
                  <div className="bg-white p-8 border-2 border-slate-300 rounded-2xl shadow-md font-serif min-h-[320px] flex flex-col justify-between">
                    <div>
                      <div className="text-center pb-4 border-b border-slate-100">
                        <p className="text-[10px] uppercase font-sans tracking-widest text-slate-400 font-bold">অধ্যায় ফরম্যাটিং লেআউট (Page 3+)</p>
                      </div>

                      <div className="mt-6 space-y-3">
                        <h3 className="text-sm font-bold text-slate-800 font-serif border-l-2 border-orange-500 pl-2">
                          অধ্যায় ১: {(selectedOrderForPreview.articleTitles || [])[0] || "সোনার তরী"}
                        </h3>
                        
                        {/* Two columns layout representation */}
                        <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-500 leading-relaxed text-justify pt-2 font-serif">
                          <div>
                            <span className="text-xl font-bold font-serif text-slate-800 mr-1 float-left leading-none mt-1">ম</span>
                            হাবিশ্বের সৃষ্টি ও লয়ের মাঝে মানুষের জীবন এক ক্ষণস্থায়ী তরণী। রবীন্দ্রনাথ ঠাকুরের ‘সোনার তরী’ কবিতায় আমরা দেখি মানুষ তার সারা জীবনের সাধনা ও সোনালী ফসল পরম যত্নে মহাকালের নৌকায় তুলে দেয়। কিন্তু সেই নৌকায় মানুষের নিজের স্থান হয় না।
                          </div>
                          <div>
                            এই গভীর জীবনদর্শন আমাদের স্মরণ করিয়ে দেয় যে, মানুষের কাজ বেঁচে থাকে, মানুষ নয়। আধুনিক যুগে আমরা যখনই কিছু প্রিন্ট করি বা লিখে প্রকাশ করি, আমরা মূলত এই সোনার তরীতেই আমাদের সোনালী শস্য তুলে দিচ্ছি।
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                      Page 3 • Read-to-Print Formatter Grid v1.0
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedOrderForPreview(null)} 
                className="py-2 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: USER PROFILE DETAILS CARD POP-UP */}
      {selectedUserForCard && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            
            {/* Bio Card Banner */}
            <div className="h-24 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 p-5 relative flex items-end justify-between">
              <span className="absolute top-4 right-4 text-white/50 hover:text-white text-xs font-bold cursor-pointer font-sans" onClick={() => setSelectedUserForCard(null)}>
                ✗ CLOSE
              </span>
              <span className="px-2.5 py-1 bg-white/15 border border-white/10 text-white text-[9px] font-extrabold uppercase rounded-md tracking-wider">
                Member Bio-Card
              </span>
            </div>

            {/* Bio Card Contents */}
            <div className="px-6 pb-6 pt-12 relative space-y-6">
              
              {/* Profile Avatar absolute overlap */}
              <div className="absolute -top-10 left-6">
                <div className="w-16 h-16 rounded-2xl bg-white p-1 border shadow-md flex items-center justify-center">
                  <div className="w-full h-full rounded-xl bg-violet-100 text-violet-700 font-serif font-extrabold text-2xl flex items-center justify-center uppercase">
                    {selectedUserForCard.displayName?.substring(0,1)}
                  </div>
                </div>
              </div>

              {/* User Identity */}
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 font-serif pt-1">
                  {selectedUserForCard.displayName}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">{selectedUserForCard.email}</p>
                
                <div className="pt-2 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-0.5 bg-violet-50 text-violet-700 text-[9px] font-bold rounded-full uppercase">
                    ROLE: {selectedUserForCard.role}
                  </span>
                  {selectedUserForCard.role === "writer" ? (
                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded-full border border-amber-200">
                      {getWriterBadge(selectedUserForCard).text}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-slate-50 text-slate-500 text-[9px] font-bold rounded-full border border-slate-200">
                      🥉 সাধারণ পাঠক
                    </span>
                  )}
                </div>
              </div>

              {/* Bio block */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs text-slate-600 italic">
                "{selectedUserForCard.bio || "কোনো বায়োগ্রাফি সেট করা নেই।"}"
              </div>

              {/* Wallet Ledger snap */}
              <div className="border border-slate-150 rounded-xl overflow-hidden text-xs">
                <div className="p-2.5 bg-slate-100/80 font-bold text-slate-700 border-b border-slate-150">
                  ওয়ালেট ও কেনাকাটার সংক্ষিপ্ত খতিয়ান
                </div>
                <div className="p-3 bg-white space-y-2 font-sans font-medium text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>চলতি কয়েন (Current Coins):</span>
                    <span className="font-bold text-orange-600 font-mono">{selectedUserForCard.coins || 0} CC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>ওয়ালেট ব্যালেন্স (Wallet Balance):</span>
                    <span className="font-bold text-purple-700 font-mono">৳ {selectedUserForCard.currentBalance || 0} BDT</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>মেম্বার আইডি:</span>
                    <span className="font-mono">{selectedUserForCard.uid}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-150 text-center">
              <button 
                onClick={() => setSelectedUserForCard(null)}
                className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: MONTHLY SETTLEMENT ALLOCATION ARCHIVE DETAILS */}
      {selectedSettlementForDetail && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Award className="w-5 h-5 text-violet-600" />
                <div>
                  <h3 className="font-bold text-slate-800 font-serif">মাসিক ক্লোজিং ব্রেকডাউন</h3>
                  <p className="text-[10px] text-slate-400 font-mono">আইডি: {selectedSettlementForDetail.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSettlementForDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✗ CLOSE
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs space-y-1.5 text-slate-600">
                <p><strong>সেটেলমেন্ট মাস:</strong> {selectedSettlementForDetail.monthLabel}</p>
                <p><strong>মোট বন্টনকৃত বাজেট পুল:</strong> ৳ {selectedSettlementForDetail.budgetPool} BDT</p>
                <p><strong>মোট রিডিম করা কয়েন স্ন্যাপশট:</strong> {selectedSettlementForDetail.totalCoins} CC</p>
                <p><strong>নিষ্পত্তির তারিখ:</strong> {new Date(selectedSettlementForDetail.timestamp).toLocaleString("bn-BD")}</p>
              </div>

              <h4 className="text-xs font-bold text-slate-700 font-serif border-b pb-1">লেখক ভিত্তিক রয়্যালটি বন্টন তালিকা:</h4>
              
              <div className="space-y-2">
                {(selectedSettlementForDetail.allocations || []).map((alloc: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 font-serif">👤 {alloc.writerName}</p>
                      <span className="text-[9px] text-slate-400 font-mono">কয়েন ব্যালেন্স রিসেট: {alloc.coins} CC</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">BDT রয়্যালটি প্রাপ্তি</span>
                      <span className="font-mono font-bold text-emerald-600 text-xs">+৳ {alloc.amountBDT} BDT</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedSettlementForDetail(null)}
                className="py-1.5 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
