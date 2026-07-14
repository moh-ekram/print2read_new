/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserProfile } from "../types";
import { PenTool, Image, Smile, Settings, X, Globe, DollarSign, Coins, BookOpen, Layers } from "lucide-react";

interface FacebookPostBoxProps {
  currentUser: UserProfile;
  onPublishPost: (
    title: string,
    excerpt: string,
    content: string,
    priceCoins: number,
    priceMoney: number
  ) => Promise<void>;
}

export default function FacebookPostBox({
  currentUser,
  onPublishPost
}: FacebookPostBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("প্রবন্ধ ও কলাম");
  const [priceCoins, setPriceCoins] = useState(10);
  const [priceMoney, setPriceMoney] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userInitials = currentUser?.displayName
    ? currentUser.displayName.slice(0, 2).toUpperCase()
    : currentUser?.email
    ? currentUser.email.slice(0, 2).toUpperCase()
    : "U";

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("দয়া করে আপনার লেখার একটি আকর্ষণীয় শিরোনাম দিন।");
      return;
    }
    if (!content.trim()) {
      alert("দয়া করে লেখার মূল অংশটি এখানে লিখুন।");
      return;
    }

    setIsSubmitting(true);
    try {
      // If excerpt is empty, automatically generate from content
      const finalExcerpt = excerpt.trim() 
        ? excerpt.trim() 
        : content.trim().substring(0, 100) + "...";

      await onPublishPost(
        title.trim(),
        finalExcerpt,
        content.trim(),
        priceCoins,
        priceMoney
      );

      // Clear form and close modal
      setTitle("");
      setContent("");
      setExcerpt("");
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert("লেখাটি পোস্ট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs mb-6">
      {/* Facebook style top composer bar */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center font-bold text-violet-700 text-sm shrink-0">
          {userInitials}
        </div>
        <button
          id="fb-composer-trigger-btn"
          onClick={() => setIsOpen(true)}
          className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full text-xs text-slate-500 font-medium transition-all duration-250 flex items-center justify-between cursor-pointer"
        >
          <span>আজ আপনার মনে কি চলছে, {currentUser?.displayName || "লেখক"}? একটি নতুন লেখা প্রকাশ করুন...</span>
          <PenTool className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Visual buttons representing Facebook post options */}
      <div className="flex items-center justify-around pt-3">
        <button
          onClick={() => setIsOpen(true)}
          className="flex-1 py-1.5 px-2 hover:bg-slate-50 rounded-xl text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          কবিতা বা গল্প
        </button>
        <div className="w-px h-4 bg-slate-200" />
        <button
          onClick={() => setIsOpen(true)}
          className="flex-1 py-1.5 px-2 hover:bg-slate-50 rounded-xl text-[11px] font-bold text-orange-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Coins className="w-3.5 h-3.5" />
          কয়েন মূল্য নির্ধারণ
        </button>
        <div className="w-px h-4 bg-slate-200" />
        <button
          onClick={() => setIsOpen(true)}
          className="flex-1 py-1.5 px-2 hover:bg-slate-50 rounded-xl text-[11px] font-bold text-violet-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          সরাসরি প্রকাশ
        </button>
      </div>

      {/* Facebook-style Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-150 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-violet-600" />
                নতুন পোস্ট তৈরি করুন
              </h3>
              <button
                id="close-fb-composer-modal"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePostSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Profile Card */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center font-bold text-violet-700 text-sm">
                  {userInitials}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 leading-none">
                    {currentUser?.displayName || "লেখক"}
                  </h4>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                    <Globe className="w-3 h-3" />
                    পাবলিক (Public Feed)
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">শিরোনাম (Title) *</label>
                <input
                  id="fb-post-title"
                  type="text"
                  placeholder="একটি আকর্ষনীয় ও সুন্দর শিরোনাম দিন..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all font-serif font-bold text-slate-800"
                  required
                />
              </div>

              {/* Content Textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">লেখার মূল অংশ (Content) *</label>
                <textarea
                  id="fb-post-content"
                  rows={6}
                  placeholder="আজ আপনার মনে কি চলছে লিখুন... (ফেসবুক পোস্টের মতো আপনার সম্পূর্ণ লেখা বা প্রবন্ধটি গুছিয়ে লিখুন)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all font-serif leading-relaxed text-slate-700 min-h-[140px]"
                  required
                />
              </div>

              {/* Excerpt (Optional) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">সংক্ষিপ্ত পরিচিতি (Excerpt - Optional)</label>
                  <span className="text-[9px] text-slate-400 font-medium">ফাঁকা রাখলে প্রথম অংশ ব্যবহৃত হবে</span>
                </div>
                <input
                  id="fb-post-excerpt"
                  type="text"
                  placeholder="পাঠকদের আকৃষ্ট করতে এক বা দুই লাইনের পরিচিতি দিন"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all text-slate-600"
                />
              </div>

              {/* Category, Coin Price, Money Price Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ক্যাটাগরি</label>
                  <select
                    id="fb-post-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-violet-500/20"
                  >
                    <option value="গল্প ও উপন্যাস">গল্প ও উপন্যাস</option>
                    <option value="কবিতা ও আবৃত্তি">কবিতা ও আবৃত্তি</option>
                    <option value="প্রবন্ধ ও কলাম">প্রবন্ধ ও কলাম</option>
                    <option value="ইতিহাস ও দর্শন">ইতিহাস ও দর্শন</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">কয়েন মূল্য (CC Price)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-orange-500 font-bold text-[10px]">
                      CC
                    </span>
                    <input
                      id="fb-post-price-coins"
                      type="number"
                      value={priceCoins}
                      onChange={(e) => setPriceCoins(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-7 pr-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">টাকা মূল্য (BDT Price)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-violet-600 font-bold text-xs">
                      ৳
                    </span>
                    <input
                      id="fb-post-price-money"
                      type="number"
                      value={priceMoney}
                      onChange={(e) => setPriceMoney(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-6 pr-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  id="cancel-fb-post-btn"
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer"
                >
                  বাতিল করুন
                </button>
                <button
                  id="submit-fb-post-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  {isSubmitting ? "পোস্ট হচ্ছে..." : "পোস্ট করুন"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
