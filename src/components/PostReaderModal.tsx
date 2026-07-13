/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Post, UserProfile } from "../types";
import { BookOpen, BookMarked, Printer, Edit3, Save, ArrowLeft, Coins, Wallet, Check, Sparkles } from "lucide-react";

interface PostReaderModalProps {
  post: Post;
  profile: UserProfile | null;
  onClose: () => void;
  onAction: (actionType: string, postId?: string, authorId?: string) => Promise<void>;
  onEditPost: (postId: string, title: string, excerpt: string, content: string, priceCoins: number, priceMoney: number) => Promise<void>;
}

export default function PostReaderModal({
  post,
  profile,
  onClose,
  onAction,
  onEditPost
}: PostReaderModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [content, setContent] = useState(post.content);
  const [priceCoins, setPriceCoins] = useState(post.priceCoins);
  const [priceMoney, setPriceMoney] = useState(post.priceMoney);

  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  const isAuthor = profile?.uid === post.authorId;
  const isBookmarked = profile?.bookmarkedPostIds.includes(post.id) || false;
  const isAddedToBasket = profile?.printBasketPostIds.includes(post.id) || false;

  const handleSave = async () => {
    if (!title || !content) {
      alert("শিরোনাম এবং মূল বিষয়বস্তু ফাঁকা রাখা যাবে না।");
      return;
    }
    setSaving(true);
    try {
      await onEditPost(post.id, title, excerpt, content, priceCoins, priceMoney);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("সংরক্ষণ করা সম্ভব হয়নি।");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    setPrintSuccess(false);
    try {
      // Direct integration with Basket / Print system:
      // If not already in basket, add it, which deducts coins and increments print count.
      if (!isAddedToBasket) {
        if (profile && profile.coins < post.priceCoins) {
          alert("দুঃখিত, এই লেখাটি প্রিন্ট করতে প্রয়োজনীয় কয়েন আপনার ওয়ালেটে নেই। দয়া করে কয়েন রিচার্জ করুন।");
          setPrinting(false);
          return;
        }
        await onAction("basket", post.id);
      }
      
      // Simulate real-world printing process
      setTimeout(() => {
        setPrinting(false);
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 4000);
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("প্রিন্ট রিকোয়েস্ট ব্যর্থ হয়েছে।");
      setPrinting(false);
    }
  };

  const handleBookmarkToggle = async () => {
    await onAction("bookmark", post.id);
  };

  const handleFollowToggle = async () => {
    await onAction("follow", undefined, post.authorId);
  };

  const isFollowingAuthor = profile?.followingAuthors.includes(post.authorId) || false;

  return (
    <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        id="post-reader-modal-container"
        className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-purple-100 flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <button
            id="close-post-reader-btn"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            ফিরে যান
          </button>

          <div className="flex items-center gap-2">
            {isAuthor && (
              <button
                id="toggle-post-edit-btn"
                onClick={() => setIsEditing(!isEditing)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                  isEditing 
                    ? "bg-slate-200 border-slate-300 text-slate-700" 
                    : "bg-brand-purple-50 hover:bg-brand-purple-100 border-brand-purple-200 text-brand-purple-700"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditing ? "রিডিং মোড" : "এডিট করুন"}
              </button>
            )}

            {!isEditing && profile && (
              <>
                {/* Bookmark Button */}
                <button
                  id={`toggle-bookmark-modal-${post.id}`}
                  onClick={handleBookmarkToggle}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isBookmarked
                      ? "bg-brand-purple-100 border-brand-purple-300 text-brand-purple-700"
                      : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                  }`}
                  title={isBookmarked ? "বুকমার্ক রিমুভ করুন" : "বুকমার্ক করুন"}
                >
                  <BookMarked className="w-4 h-4 fill-current" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {isEditing ? (
            /* --- WRITER'S INLINE EDIT MODE --- */
            <div className="space-y-4">
              <span className="text-xs bg-brand-purple-100 text-brand-purple-700 px-2.5 py-1 rounded-full font-semibold">
                ✏️ রাইটার এডিট প্যানেল
              </span>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">লেখার শিরোনাম</label>
                <input
                  id="edit-post-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-lg font-bold font-serif px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-purple-500/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">সংক্ষিপ্ত পরিচিতি</label>
                <input
                  id="edit-post-excerpt"
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full text-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-purple-500/20 focus:outline-hidden text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">লেখার মূল বিষয়বস্তু</label>
                <textarea
                  id="edit-post-content"
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-sm font-serif leading-relaxed px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-purple-500/20 focus:outline-hidden text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">প্রয়োজনীয় কয়েন মূল্য (CC)</label>
                  <input
                    id="edit-post-coins"
                    type="number"
                    value={priceCoins}
                    onChange={(e) => setPriceCoins(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">টাকা মূল্য (BDT ৳)</label>
                  <input
                    id="edit-post-money"
                    type="number"
                    value={priceMoney}
                    onChange={(e) => setPriceMoney(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  id="cancel-post-edit-btn"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  বাতিল করুন
                </button>
                <button
                  id="save-post-edit-btn"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
              </div>
            </div>
          ) : (
            /* --- READER MODE VIEW --- */
            <article className="space-y-6">
              {/* Metadata row */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-orange-500/10 text-brand-orange-600 font-serif font-bold rounded-full flex items-center justify-center">
                    {post.authorName.substring(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-slate-700 text-sm">{post.authorName}</span>
                      {profile && !isAuthor && (
                        <button
                          id={`toggle-follow-btn-${post.id}`}
                          onClick={handleFollowToggle}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                            isFollowingAuthor
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : "bg-brand-green-50 text-brand-green-700 border-brand-green-200 hover:bg-brand-green-100"
                          }`}
                        >
                          {isFollowingAuthor ? "অনুসরণ করছেন" : "ফলো করুন"}
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">প্রকাশিত: {new Date(post.createdAt).toLocaleDateString("bn-BD")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-mono font-medium">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    👁️ ভিউ: {post.viewCount} বার
                  </span>
                  <span className="bg-brand-orange-50 text-brand-orange-700 px-2 py-1 rounded-md">
                    🖨️ প্রিন্ট: {post.addToPrintCount} বার
                  </span>
                </div>
              </div>

              {/* Title & Body */}
              <div className="space-y-4">
                <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-slate-800 leading-tight">
                  {post.title}
                </h1>
                
                {post.excerpt && (
                  <p className="text-xs md:text-sm font-medium text-slate-400 italic bg-slate-50 border-l-2 border-brand-orange-500 pl-4 py-1 leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                <div className="text-slate-700 text-sm md:text-base font-serif leading-relaxed space-y-4 pt-2 whitespace-pre-wrap">
                  {post.content}
                </div>
              </div>

              {/* Print Action / Call to Action Box */}
              {!isAuthor && profile && (
                <div className="mt-8 p-6 bg-linear-to-r from-brand-orange-50 to-brand-purple-50 rounded-2xl border border-brand-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center justify-center sm:justify-start gap-1">
                      <Sparkles className="w-4 h-4 text-brand-orange-500 animate-pulse" />
                      লেখাটি ফিজিক্যাল প্রিন্ট করতে চান?
                    </h3>
                    <p className="text-xs text-slate-400">
                      এই আর্টিকেলটি আপনার প্রিন্ট বাস্কেটে যুক্ত করতে <span className="font-bold text-brand-orange-600">{post.priceCoins} CC</span> খরচ হবে।
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <button
                      id="action-print-post-btn"
                      onClick={handlePrint}
                      disabled={printing || printSuccess}
                      className={`py-2.5 px-6 font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        printSuccess
                          ? "bg-brand-green-600 text-white"
                          : isAddedToBasket
                          ? "bg-slate-700 hover:bg-slate-800 text-white"
                          : "bg-brand-orange-500 hover:bg-brand-orange-600 text-white"
                      }`}
                    >
                      {printing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          প্রিন্ট প্রসেসিং...
                        </>
                      ) : printSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          প্রিন্ট বাস্কেটে সংরক্ষিত!
                        </>
                      ) : isAddedToBasket ? (
                        <>
                          <Printer className="w-4 h-4" />
                          পুনরায় প্রিন্ট করুন
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          অ্যাড টু প্রিন্ট বাস্কেট
                        </>
                      )}
                    </button>
                    
                    <p className="text-[10px] text-center text-slate-400">
                      (মূল্য: {post.priceCoins} CC / ৳{post.priceMoney})
                    </p>
                  </div>
                </div>
              )}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
