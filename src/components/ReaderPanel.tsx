/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Post, UserProfile } from "../types";
import { BookMarked, ShoppingBag, Users, Coins, Wallet, BookOpen, Trash2, ArrowRight } from "lucide-react";

interface ReaderPanelProps {
  profile: UserProfile;
  posts: Post[];
  authors: { uid: string; displayName: string; bio?: string }[];
  onAction: (actionType: string, postId?: string, authorId?: string) => Promise<void>;
  onOpenCoinsModal: () => void;
  onOpenPost: (post: Post) => void;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

type TabType = "bookmarks" | "basket" | "following";

export default function ReaderPanel({
  profile,
  posts,
  authors,
  onAction,
  onOpenCoinsModal,
  onOpenPost,
  activeTab: controlledActiveTab,
  onTabChange
}: ReaderPanelProps) {
  const [localActiveTab, setLocalActiveTab] = useState<TabType>("bookmarks");

  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : localActiveTab;
  const setActiveTab = (tab: TabType) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setLocalActiveTab(tab);
    }
  };

  // Filter bookmarked posts
  const bookmarkedPosts = posts.filter(p => profile.bookmarkedPostIds.includes(p.id));

  // Filter print basket posts
  const basketPosts = posts.filter(p => profile.printBasketPostIds.includes(p.id));

  // Filter followed authors
  const followedAuthors = authors.filter(a => profile.followingAuthors.includes(a.uid));

  return (
    <div className="space-y-6">
      {/* Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Coins Button (Triggers CoinsModal) */}
        <button
          id="reader-coins-stat-btn"
          onClick={onOpenCoinsModal}
          className="text-left bg-white hover:bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 group cursor-pointer w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 text-orange-600 p-3 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">বর্তমান কয়েন (Coins)</p>
              <p className="text-2xl font-bold font-mono text-slate-800 mt-1">{profile.coins} CC</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-md group-hover:bg-orange-500 group-hover:text-white transition-all font-sans">
            বিশদ দেখুন ➜
          </span>
        </button>

        {/* Current Wallet Balance (Synced) */}
        <button
          id="reader-balance-stat-btn"
          onClick={onOpenCoinsModal}
          className="text-left bg-white hover:bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 group cursor-pointer w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="bg-violet-100 text-violet-600 p-3 rounded-xl group-hover:bg-violet-500 group-hover:text-white transition-all duration-300">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">ওয়ালেটের কারেন্ট ব্যালেন্স</p>
              <p className="text-2xl font-bold font-mono text-slate-800 mt-1">৳ {profile.currentBalance}</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-md group-hover:bg-violet-600 group-hover:text-white transition-all font-sans">
            বিশদ দেখুন ➜
          </span>
        </button>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg font-serif shrink-0">
          {profile.displayName.substring(0, 1)}
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 leading-tight">{profile.displayName}</h4>
          <p className="text-xs text-slate-400 mt-1">{profile.email}</p>
          {profile.bio && <p className="text-xs text-slate-500 mt-1.5 italic">"{profile.bio}"</p>}
        </div>
      </div>

      {/* Reader Panel Toggle Navigation using Soft Minimalist Green, Orange and Purple Box Button Combinations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Bookmark Button: Purple (বেগুনি) */}
        <button
          id="reader-tab-bookmarks"
          onClick={() => setActiveTab("bookmarks")}
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer border ${
            activeTab === "bookmarks"
              ? "bg-violet-50 text-violet-800 border-2 border-violet-300 shadow-xs shadow-violet-100"
              : "bg-violet-50/20 text-violet-600 border-violet-100/40 hover:bg-violet-50/55 hover:border-violet-200"
          }`}
        >
          <BookMarked className="w-5 h-5 text-violet-500" />
          <span>বুকমার্ক করা লেখা ({bookmarkedPosts.length})</span>
        </button>

        {/* Basket Button: Green (সবুজ) */}
        <button
          id="reader-tab-basket"
          onClick={() => setActiveTab("basket")}
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer border ${
            activeTab === "basket"
              ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-300 shadow-xs shadow-emerald-100"
              : "bg-emerald-50/20 text-emerald-600 border-emerald-100/40 hover:bg-emerald-50/55 hover:border-emerald-200"
          }`}
        >
          <ShoppingBag className="w-5 h-5 text-emerald-600" />
          <span>প্রিন্ট বাস্কেট ({basketPosts.length})</span>
        </button>

        {/* Following List Button: Orange (কমলা) */}
        <button
          id="reader-tab-following"
          onClick={() => setActiveTab("following")}
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer border ${
            activeTab === "following"
              ? "bg-orange-50 text-orange-800 border-2 border-orange-300 shadow-xs shadow-orange-100"
              : "bg-orange-50/20 text-orange-600 border-orange-100/40 hover:bg-orange-50/55 hover:border-orange-200"
          }`}
        >
          <Users className="w-5 h-5 text-orange-500" />
          <span>ফলোয়িং লেখক তালিকা ({followedAuthors.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 min-h-[250px] shadow-xs">
        {activeTab === "bookmarks" && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-1.5">
              <BookMarked className="w-4 h-4 text-brand-purple-500" />
              আপনার বুকমার্ক করা লেখার তালিকা
            </h3>

            {bookmarkedPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs font-medium">কোনো লেখা বুকমার্ক করা নেই।</p>
                <p className="text-[10px] text-slate-400 mt-1">হোমপেজ থেকে আপনার পছন্দের লেখার পাশে থাকা বুকমার্ক বাটনে ক্লিক করুন।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarkedPosts.map((post) => (
                  <div 
                    key={post.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-700 truncate">{post.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">লেখক: {post.authorName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id={`read-bookmark-${post.id}`}
                        onClick={() => onOpenPost(post)}
                        className="py-1.5 px-3 bg-brand-purple-50 hover:bg-brand-purple-100 text-brand-purple-700 rounded-lg text-xs font-medium transition-all"
                      >
                        পড়ুন
                      </button>
                      <button
                        id={`remove-bookmark-${post.id}`}
                        onClick={() => onAction("bookmark", post.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="রিমুভ করুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "basket" && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-brand-orange-500" />
              আপনার প্রিন্ট বাস্কেটে থাকা লেখা
            </h3>

            {basketPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs font-medium">প্রিন্ট বাস্কেটে কোনো লেখা নেই।</p>
                <p className="text-[10px] text-slate-400 mt-1">হোমপেজের যেকোনো লেখায় "অ্যাড টু প্রিন্ট বাস্কেট" ক্লিক করে এখানে যুক্ত করতে পারেন।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {basketPosts.map((post) => (
                  <div 
                    key={post.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-700 truncate">{post.title}</h4>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400 font-mono">
                        <span>কয়েন খরচ: {post.priceCoins} CC</span>
                        <span>মূল্য: ৳{post.priceMoney}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id={`read-basket-${post.id}`}
                        onClick={() => onOpenPost(post)}
                        className="py-1.5 px-3 bg-brand-orange-50 hover:bg-brand-orange-100 text-brand-orange-700 rounded-lg text-xs font-medium transition-all"
                      >
                        পড়ুন ও প্রিন্ট করুন
                      </button>
                      <button
                        id={`remove-basket-${post.id}`}
                        onClick={() => onAction("basket", post.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="রিমুভ করুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "following" && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-brand-green-600" />
              আপনার অনুসৃত (Followed) লেখকবৃন্দ
            </h3>

            {followedAuthors.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs font-medium">আপনি এখনও কোনো লেখককে ফলো করেননি।</p>
                <p className="text-[10px] text-slate-400 mt-1">লেখকের লেখার ভেতর থেকে সরাসরি ওনাকে ফলো করতে পারেন।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followedAuthors.map((author) => (
                  <div 
                    key={author.uid}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">{author.displayName}</h4>
                      {author.bio && <p className="text-xs text-slate-400 mt-1">{author.bio}</p>}
                    </div>
                    <button
                      id={`unfollow-author-${author.uid}`}
                      onClick={() => onAction("follow", undefined, author.uid)}
                      className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-all"
                    >
                      আনফলো করুন
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
