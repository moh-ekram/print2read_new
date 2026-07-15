/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Post, UserProfile } from "../types";
import { 
  FileSpreadsheet, 
  PlusCircle, 
  Edit, 
  Coins, 
  DollarSign, 
  PenTool, 
  Globe, 
  ThumbsUp, 
  Share2, 
  Heart, 
  Calendar, 
  Eye, 
  Wallet, 
  ChevronRight, 
  ShieldCheck, 
  MapPin,
  Clock,
  BookOpen
} from "lucide-react";
import FacebookPostBox from "./FacebookPostBox";

interface WriterPanelProps {
  profile: UserProfile;
  posts: Post[];
  onOpenPost: (post: Post) => void;
  onPublishPost: (title: string, excerpt: string, content: string, priceCoins: number, priceMoney: number) => Promise<void>;
  onWithdrawRequest: (amount: number, paymentMethod: string, accountNumber: string) => Promise<void>;
}

export default function WriterPanel({
  profile,
  posts,
  onOpenPost,
  onPublishPost,
  onWithdrawRequest
}: WriterPanelProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "performance" | "withdraw">("timeline");

  // Withdraw fields
  const [withdrawAmount, setWithdrawAmount] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [accountNumber, setAccountNumber] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const authorPosts = posts.filter(p => p.authorId === profile.uid);

  // Sorting posts chronologically (newest first)
  const sortedPosts = [...authorPosts].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calculations for Earnings Summary
  const totalViews = authorPosts.reduce((sum, p) => sum + p.viewCount, 0);
  const totalPrints = authorPosts.reduce((sum, p) => sum + p.addToPrintCount, 0);
  const totalCoinsEarned = authorPosts.reduce((sum, p) => sum + (p.addToPrintCount * p.priceCoins), 0);
  const totalMoneyEarned = authorPosts.reduce((sum, p) => sum + (p.addToPrintCount * p.priceMoney), 0);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");

    if (!accountNumber) {
      setWithdrawError("দয়া করে পেমেন্ট অ্যাকাউন্ট নম্বরটি প্রদান করুন।");
      return;
    }

    if (withdrawAmount > profile.currentBalance) {
      setWithdrawError("দুঃখিত, আপনার ওয়ালেটে পর্যাপ্ত কারেন্ট ব্যালেন্স নেই।");
      return;
    }

    try {
      await onWithdrawRequest(withdrawAmount, paymentMethod, accountNumber);
      setWithdrawSuccess("আপনার উইথড্র রিকোয়েস্টটি সফলভাবে সাবমিট হয়েছে এবং অনুমোদনের জন্য অপেক্ষমাণ রয়েছে।");
      setAccountNumber("");
    } catch (err: any) {
      setWithdrawError(err.message || "উইথড্র রিকোয়েস্ট ব্যর্থ হয়েছে।");
    }
  };

  const getAuthorAvatar = (authorName: string, authorId: string) => {
    if (authorName === "রবীন্দ্রনাথ দত্ত" || authorName?.includes("রবীন্দ্রনাথ")) {
      return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120";
    }
    const avatars = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120&h=120",
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120&h=120",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120&h=120",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120&h=120"
    ];
    const idx = authorName ? authorName.length % avatars.length : 0;
    return avatars[idx];
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" });
    } catch (e) {
      return dateStr;
    }
  };

  const getPostPreviewText = (p: Post) => {
    if (!p.content) return p.excerpt || "";
    let cleanText = p.content
      .replace(/#+\s+.*/g, "") // remove markdown headers
      .replace(/[\*\_~`]/g, "") // remove styles
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // link replacement
      .replace(/-\s+/g, "") // list bullets
      .replace(/\s+/g, " ") // collapse spacing
      .trim();

    if (cleanText.length < 5) {
      return p.excerpt || "";
    }
    return cleanText;
  };

  const handleShareClick = (post: Post) => {
    const shareText = `"${post.title}" - ${profile.displayName} এর অসাধারণ একটি রচনা। রিড-টু-প্রিন্টে সম্পূর্ণ লেখাটি পড়ুন!`;
    navigator.clipboard.writeText(shareText);
    setCopiedPostId(post.id);
    setTimeout(() => setCopiedPostId(null), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Facebook Profile Header */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden">
        {/* Cover Photo */}
        <div className="h-36 sm:h-48 md:h-56 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-950 relative">
          <img 
            src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200&h=400"
            alt="Cover"
            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Profile Info Details Row */}
        <div className="px-4 sm:px-6 pb-4 pt-1 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between -mt-12 sm:-mt-16 md:-mt-20 gap-3 mb-3">
            {/* Avatar & Name */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-3.5 text-center md:text-left">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white bg-slate-100 shadow-sm overflow-hidden shrink-0 relative z-10">
                <img 
                  src={getAuthorAvatar(profile.displayName, profile.uid)} 
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:mb-2.5">
                <div className="flex items-center justify-center md:justify-start gap-1.5">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-serif font-bold text-slate-800 leading-tight">
                    {profile.displayName}
                  </h2>
                  <span className="bg-[#1877F2]/10 text-[#1877F2] p-0.5 rounded-full" title="ভেরিফাইড লেখক">
                    <ShieldCheck className="w-4 h-4 fill-current text-[#1877F2] bg-white rounded-full" />
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-1 leading-normal max-w-lg">
                  {profile.bio || "সাহিত্যের আঙিনায় একজন পথিক। রিড-টু-প্রিন্টের অফিসিয়াল রাইটার।"}
                </p>
                <div className="mt-1.5 flex items-center justify-center md:justify-start gap-2.5 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1">👥 {totalViews * 2 + 15} জন ফলোয়ার্স</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">✍️ {authorPosts.length} টি গল্প/কবিতা</span>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex gap-2 w-full md:w-auto shrink-0 z-10 md:mb-2">
              <button
                id="fb-header-publish-btn"
                onClick={() => {
                  setActiveTab("timeline");
                  setTimeout(() => {
                    const trigger = document.getElementById("fb-composer-trigger-btn");
                    if (trigger) trigger.click();
                  }, 100);
                }}
                className="flex-1 md:flex-initial py-2 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                নতুন লেখা পোস্ট
              </button>
              <button
                id="fb-header-withdraw-btn"
                onClick={() => setActiveTab("withdraw")}
                className="flex-1 md:flex-initial py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                উইথড্র রিকোয়েস্ট
              </button>
            </div>
          </div>

          {/* Facebook Tab Navigation */}
          <div className="flex border-t border-slate-150 pt-2.5 mt-3 overflow-x-auto gap-1 scrollbar-none">
            <button
              id="fb-tab-button-timeline"
              onClick={() => setActiveTab("timeline")}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "timeline"
                  ? "bg-[#1877F2]/10 text-[#1877F2]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              📖 টাইমলাইন (Timeline Posts)
            </button>
            <button
              id="fb-tab-button-performance"
              onClick={() => setActiveTab("performance")}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "performance"
                  ? "bg-brand-soft-teal/15 text-brand-deep-teal"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              📊 পারফরম্যান্স গ্রিড (Spreadsheet)
            </button>
            <button
              id="fb-tab-button-withdraw"
              onClick={() => setActiveTab("withdraw")}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "withdraw"
                  ? "bg-brand-amber/15 text-orange-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              💳 ওয়ালেট ও উইথড্র (Cashout Form)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area based on selected Tab */}
      {activeTab === "timeline" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Intro and Statistics */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Intro Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-brand-amber" />
                পরিচিতি (Intro)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans mb-3 text-center italic">
                "{profile.bio || "সাহিত্যের আঙিনায় একজন আজন্ম পথিক। জীবন এবং দর্শনের মিশ্রণে শব্দ বুনন করতে ভালোবাসি।"}"
              </p>
              
              <div className="space-y-2.5 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>ক্যাটাগরি: <strong className="text-slate-700">প্রবন্ধ, গল্প ও কবিতা</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1877F2] shrink-0" />
                  <span>স্ট্যাটাস: <strong className="text-[#1877F2]">ভেরিফাইড প্রফেশনাল লেখক</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>সদস্যপদ: <strong className="text-slate-700">জুলাই ২০২৬ থেকে সক্রিয়</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Performance Summary Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-brand-soft-teal" />
                পরিসংখ্যান (Statistics)
              </h3>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">মোট ভিউ</p>
                  <p className="text-base font-bold text-brand-soft-teal mt-0.5">{totalViews} বার</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">অ্যাড টু প্রিন্ট</p>
                  <p className="text-base font-bold text-brand-amber mt-0.5">{totalPrints} বার</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">মোট রয়্যালটি আর্নিং</p>
                  <div className="flex items-center justify-center gap-2 mt-1 font-mono text-xs font-bold">
                    <span className="text-brand-amber">{totalCoinsEarned} CC</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-brand-deep-teal">৳ {totalMoneyEarned} BDT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Info Card */}
            <div className="bg-gradient-to-br from-slate-50 to-brand-soft-teal/5 p-4 rounded-xl border border-slate-200/80 shadow-3xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">কারেন্ট ব্যালেন্স BDT</span>
                <Wallet className="w-4 h-4 text-brand-deep-teal" />
              </div>
              <p className="text-xl font-bold text-brand-deep-teal font-mono">৳ {profile.currentBalance} BDT</p>
              <button
                onClick={() => setActiveTab("withdraw")}
                className="w-full mt-3 py-1.5 bg-brand-deep-teal hover:bg-brand-deep-teal/90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                উইথড্র করতে ক্লিক করুন <ChevronRight className="w-3 h-3" />
              </button>
            </div>

          </div>

          {/* Right Column: Facebook Composer & Post Timeline */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Post Publisher box */}
            <FacebookPostBox currentUser={profile} onPublishPost={onPublishPost} />

            {/* Posts Feed Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">প্রকাশিত পোস্টসমূহ ({sortedPosts.length})</h4>
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                <Globe className="w-3 h-3" /> পাবলিক ফিড
              </span>
            </div>

            {/* Chronological Posts Feed */}
            {sortedPosts.length === 0 ? (
              <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
                <p className="text-xs text-slate-400 font-medium">আপনার প্রকাশিত কোনো লেখা এখনও পাওয়া যায়নি।</p>
                <p className="text-[10px] text-slate-400 mt-1">উপরে "আজ আপনার মনে কি চলছে..." বক্সে ক্লিক করে প্রথম লেখাটি পোস্ট করুন!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedPosts.map((post) => {
                  const previewText = getPostPreviewText(post);

                  return (
                    <div 
                      key={post.id} 
                      className="bg-white rounded-xl border border-slate-200/80 shadow-3xs overflow-hidden hover:border-slate-300 transition-all duration-200"
                    >
                      {/* Post Header */}
                      <div className="p-3.5 flex items-center justify-between gap-3 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={getAuthorAvatar(profile.displayName, profile.uid)} 
                            alt={profile.displayName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-150 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-800 leading-none">{profile.displayName}</h4>
                              <span className="bg-[#1877F2]/10 text-[#1877F2] p-0.5 rounded-full">
                                <ShieldCheck className="w-3 h-3 fill-current" />
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium">
                              <span>{formatDate(post.createdAt)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-brand-deep-teal font-semibold">
                                <Globe className="w-3 h-3" /> পাবলিক
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Category Tag */}
                        <span className="text-[9px] font-bold text-brand-soft-teal bg-brand-soft-teal/10 px-2 py-0.5 rounded-full">
                          {post.excerpt && post.excerpt.includes("গল্প") ? "গল্প ও উপন্যাস" : "প্রবন্ধ ও কলাম"}
                        </span>
                      </div>

                      {/* Post Content */}
                      <div className="px-3.5 pb-3">
                        {/* Title */}
                        <h3 
                          onClick={() => onOpenPost(post)}
                          className="text-base font-serif font-bold text-[#3B4FE4] hover:text-[#1D4ED8] transition-colors cursor-pointer leading-tight mb-2"
                        >
                          {post.title}
                        </h3>

                        {/* First few lines of main text */}
                        <p className="text-xs text-slate-600 leading-relaxed font-sans line-clamp-3">
                          {previewText}
                        </p>
                      </div>

                      {/* Reaction & Statistics Bar */}
                      <div className="px-3.5 py-2.5 bg-slate-50 border-y border-slate-150 flex items-center justify-between gap-4 text-[10px] font-medium text-slate-400">
                        {/* Left Reactions (Views & Prints styled like FB) */}
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center gap-1 text-brand-soft-teal font-bold bg-white px-2 py-1 rounded-full shadow-3xs">
                            <ThumbsUp className="w-3 h-3 fill-current" /> {post.viewCount} ভিউ
                          </span>
                          <span className="flex items-center gap-1 text-brand-amber font-bold bg-white px-2 py-1 rounded-full shadow-3xs">
                            <Heart className="w-3 h-3 fill-current" /> {post.addToPrintCount} প্রিন্ট
                          </span>
                        </div>

                        {/* Right pricing stats */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] font-bold text-slate-500">মূল্য:</span>
                          <span className="font-mono text-xs font-bold text-brand-amber">{post.priceCoins} CC</span>
                          <span className="text-slate-300">|</span>
                          <span className="font-mono text-xs font-bold text-brand-deep-teal">৳{post.priceMoney}</span>
                        </div>
                      </div>

                      {/* Bottom action Buttons */}
                      <div className="p-1 flex items-center justify-around gap-1">
                        <button
                          onClick={() => onOpenPost(post)}
                          className="flex-1 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold text-brand-deep-teal flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          সম্পূর্ণ পড়ুন
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <button
                          onClick={() => onOpenPost(post)}
                          className="flex-1 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold text-brand-amber flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          রিভিউ ও এডিট
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <button
                          onClick={() => handleShareClick(post)}
                          className="flex-1 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          {copiedPostId === post.id ? "কপি হয়েছে!" : "শেয়ার"}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

      {activeTab === "performance" && (
        <div className="space-y-4">
          {/* Excel Sheet Style Grid */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <FileSpreadsheet className="w-5 h-5 text-brand-soft-teal" />
              <div>
                <h3 className="text-sm font-bold text-slate-700 leading-none">রিয়েল-টাইম পারফরম্যান্স গ্রিড</h3>
                <p className="text-[11px] text-slate-400 mt-1">এক্সেল শীট স্টাইলে আপনার প্রতিটি পোস্টের পারফরম্যান্স হিসেব রাখুন</p>
              </div>
            </div>

            {authorPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs font-medium">আপনার প্রকাশিত কোনো লেখা পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs">
                <table className="excel-table w-full min-w-[800px] border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                      <th className="px-4 py-3 text-left font-sans font-bold text-slate-700 text-xs border-r border-slate-200">A. প্রকাশিত লেখার শিরোনাম (Title)</th>
                      <th className="px-4 py-3 text-center font-sans font-bold text-slate-700 text-xs border-r border-slate-200">B. অ্যাড টু প্রিন্ট কাউন্ট</th>
                      <th className="px-4 py-3 text-center font-sans font-bold text-slate-700 text-xs border-r border-slate-200">C. মোট ভিউ সংখ্যা</th>
                      <th className="px-4 py-3 text-center font-sans font-bold text-slate-700 text-xs border-r border-slate-200">D. কয়েন আর্নিং (CC)</th>
                      <th className="px-4 py-3 text-center font-sans font-bold text-slate-700 text-xs border-r border-slate-200">E. টাকা আর্নিং (BDT ৳)</th>
                      <th className="px-4 py-3 text-center font-sans font-bold text-slate-700 text-xs">F. অ্যাকশন (Action)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authorPosts.map((post, idx) => {
                      const postCoins = post.addToPrintCount * post.priceCoins;
                      const postMoney = post.addToPrintCount * post.priceMoney;

                      return (
                        <tr 
                          key={post.id} 
                          onClick={() => onOpenPost(post)}
                          className="hover:bg-slate-50 border-b border-slate-200 transition-colors group cursor-pointer"
                        >
                          {/* Title */}
                          <td className="px-4 py-3 text-left border-r border-slate-200 min-w-[250px]">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono font-medium w-5 shrink-0">{idx + 1}</span>
                              <span className="font-serif font-bold text-slate-700 group-hover:text-brand-deep-teal transition-colors text-sm">
                                {post.title}
                              </span>
                            </div>
                          </td>

                          {/* Print Count */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 font-bold font-mono text-xs text-brand-amber">
                            {post.addToPrintCount} বার
                          </td>

                          {/* View Count */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 font-mono text-xs text-slate-600">
                            {post.viewCount} বার
                          </td>

                          {/* Coin Earnings */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 font-bold font-mono text-xs text-brand-amber">
                            {postCoins} CC
                          </td>

                          {/* Money/BDT Earnings */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 font-bold font-mono text-xs text-brand-deep-teal">
                            ৳ {postMoney}
                          </td>

                          {/* Edit / View Button */}
                          <td className="px-4 py-3 text-center">
                            <button
                              id={`writer-post-edit-${post.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPost(post);
                              }}
                              className="py-1 px-3 bg-brand-soft-teal/15 hover:bg-brand-soft-teal/30 text-brand-deep-teal rounded-lg text-xs font-bold flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              রিভিউ ও এডিট
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "withdraw" && (
        <div className="space-y-4">
          {/* Earnings Withdrawal request */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <DollarSign className="w-5 h-5 text-brand-deep-teal" />
              <div>
                <h3 className="text-sm font-bold text-slate-700 leading-none">উইথড্রয়াল ও পেমেন্ট রিকোয়েস্ট</h3>
                <p className="text-[11px] text-slate-400 mt-1">আপনার রয়্যালটি আর্নিং সহজেই bKash, Nagad বা সরাসরি ব্যাংক অ্যাকাউন্টে ট্রান্সফার করুন</p>
              </div>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">ওয়ালেটের কারেন্ট ব্যালেন্স</label>
                <div className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl font-bold font-mono text-brand-deep-teal text-sm">
                  ৳ {profile.currentBalance} BDT
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">উইথড্র পরিমাণ (BDT)</label>
                <input
                  id="withdraw-amount-input"
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Math.max(100, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-deep-teal/20 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">পেমেন্ট মেথড ও অ্যাকাউন্ট নম্বর</label>
                <div className="flex gap-2">
                  <select
                    id="withdraw-method-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-700"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                  <input
                    id="withdraw-account-input"
                    type="text"
                    placeholder="যেমন: ০১৭********"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-deep-teal/20"
                  />
                </div>
              </div>

              <button
                id="submit-withdraw-btn"
                type="submit"
                className="py-2.5 px-4 bg-brand-deep-teal hover:bg-brand-deep-teal/90 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer h-[42px] flex items-center justify-center"
              >
                উইথড্র রিকোয়েস্ট পাঠান
              </button>
            </form>

            {withdrawSuccess && (
              <p className="text-xs text-emerald-600 font-semibold mt-3 bg-emerald-50 p-2.5 border border-emerald-100 rounded-xl">
                ✓ {withdrawSuccess}
              </p>
            )}
            {withdrawError && (
              <p className="text-xs text-red-600 font-semibold mt-3 bg-red-50 p-2.5 border border-red-100 rounded-xl">
                ⚠️ {withdrawError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
