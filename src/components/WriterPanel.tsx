/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Post, UserProfile } from "../types";
import { FileSpreadsheet, PlusCircle, Edit, ShoppingBag, Coins, DollarSign, PenTool } from "lucide-react";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [priceCoins, setPriceCoins] = useState(10);
  const [priceMoney, setPriceMoney] = useState(20);

  // Withdraw fields
  const [withdrawAmount, setWithdrawAmount] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [accountNumber, setAccountNumber] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [withdrawError, setWithdrawError] = useState("");

  const authorPosts = posts.filter(p => p.authorId === profile.uid);

  // Calculations for Earnings Summary
  const totalViews = authorPosts.reduce((sum, p) => sum + p.viewCount, 0);
  const totalPrints = authorPosts.reduce((sum, p) => sum + p.addToPrintCount, 0);
  const totalCoinsEarned = authorPosts.reduce((sum, p) => sum + (p.addToPrintCount * p.priceCoins), 0);
  const totalMoneyEarned = authorPosts.reduce((sum, p) => sum + (p.addToPrintCount * p.priceMoney), 0);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      alert("দয়া করে শিরোনাম এবং মূল বিষয়বস্তু প্রদান করুন।");
      return;
    }
    await onPublishPost(title, excerpt, content, priceCoins, priceMoney);
    setTitle("");
    setExcerpt("");
    setContent("");
    setShowAddForm(false);
  };

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

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">মোট প্রকাশিত লেখা</p>
          <p className="text-2xl font-bold font-mono text-slate-800 mt-1">{authorPosts.length} টি</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">মোট ভিউ (ভিউ কাউন্ট)</p>
          <p className="text-2xl font-bold font-mono text-brand-soft-teal mt-1">{totalViews} বার</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">মোট অ্যাড-টু-প্রিন্ট</p>
          <p className="text-2xl font-bold font-mono text-brand-amber mt-1">{totalPrints} বার</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">মোট অর্জিত কয়েন ও টাকা</p>
          <div className="mt-1 font-mono leading-tight">
            <span className="text-base font-bold text-brand-amber">{totalCoinsEarned} CC</span>
            <span className="text-xs text-slate-300 mx-1.5">|</span>
            <span className="text-base font-bold text-brand-deep-teal">৳ {totalMoneyEarned}</span>
          </div>
        </div>
      </div>

      {/* Facebook style post creator */}
      <FacebookPostBox currentUser={profile} onPublishPost={onPublishPost} />

      {/* Writer Info & Action Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PenTool className="w-5 h-5 text-brand-amber shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-700 leading-none">লেখক কন্ট্রোল ড্যাশবোর্ড</h3>
            <p className="text-[11px] text-slate-400 mt-1">আপনার লেখার পারফরম্যান্স রিয়েল-টাইমে ট্র্যাক করুন</p>
          </div>
        </div>
        <button
          id="toggle-add-post-form"
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto py-2 px-4 bg-brand-deep-teal hover:bg-brand-deep-teal/90 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          {showAddForm ? "ড্যাশবোর্ডে ফিরুন" : "নতুন লেখা প্রকাশ করুন"}
        </button>
      </div>

      {/* Add New Post Form */}
      {showAddForm ? (
        <form onSubmit={handlePublish} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
          <h3 className="text-base font-bold text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <PenTool className="w-5 h-5 text-brand-soft-teal" />
            নতুন লেখা তৈরির ফরম
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">লেখার শিরোনাম (Title) *</label>
            <input
              id="new-post-title"
              type="text"
              placeholder="আকর্ষণীয় ও তথ্যবহুল শিরোনাম দিন"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-soft-teal/20 focus:border-brand-soft-teal transition-all font-serif font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">সংক্ষিপ্ত পরিচিতি (Short Excerpt)</label>
            <input
              id="new-post-excerpt"
              type="text"
              placeholder="পাঠকদের আকৃষ্ট করতে এক বা দুই লাইনের পরিচিতি দিন"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-soft-teal/20 focus:border-brand-soft-teal transition-all text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">লেখার মূল অংশ (Content) *</label>
            <textarea
              id="new-post-content"
              rows={8}
              placeholder="এখানে আপনার সম্পূর্ণ লেখা বা প্রবন্ধটি গুছিয়ে লিখুন..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-soft-teal/20 focus:border-brand-soft-teal transition-all font-serif leading-relaxed text-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">কয়েন মূল্য (CC Price)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-amber font-semibold text-xs">
                  CC
                </span>
                <input
                  id="new-post-coins"
                  type="number"
                  value={priceCoins}
                  onChange={(e) => setPriceCoins(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-soft-teal/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">টাকা মূল্য (BDT Price)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-deep-teal font-semibold text-xs">
                  ৳
                </span>
                <input
                  id="new-post-money"
                  type="number"
                  value={priceMoney}
                  onChange={(e) => setPriceMoney(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-soft-teal/20"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="submit-publish-post"
              type="submit"
              className="w-full py-3 bg-brand-deep-teal hover:bg-brand-deep-teal/95 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PenTool className="w-4 h-4" />
              লেখাটি প্রকাশ করুন (Publish Now)
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Excel Sheet Style Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-brand-soft-teal" />
              <h3 className="text-sm font-bold text-slate-700">রিয়েল-টাইম পারফরম্যান্স গ্রিড (Excel Sheet Table)</h3>
            </div>

            {authorPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs font-medium">আপনার প্রকাশিত কোনো লেখা পাওয়া যায়নি।</p>
                <p className="text-[10px] text-slate-400 mt-1">ডানদিকের "নতুন লেখা প্রকাশ করুন" বাটনে ক্লিক করে প্রথম লেখাটি যুক্ত করুন।</p>
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
                                e.stopPropagation(); // Prevent duplicate trigger from row click
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

          {/* Earnings Withdrawal request */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-brand-deep-teal" />
              ব্যালেন্স উইথড্র রিকোয়েস্ট (Earning Withdrawal)
            </h3>

            <form onSubmit={handleWithdrawSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">ওয়ালেটের কারেন্ট ব্যালেন্স</label>
                <div className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold font-mono text-brand-deep-teal text-sm">
                  ৳ {profile.currentBalance} BDT
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">উইথড্র পরিমাণ (BDT)</label>
                <input
                  id="withdraw-amount-input"
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Math.max(100, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">পেমেন্ট মেথড ও অ্যাকাউন্ট নম্বর</label>
                <div className="flex gap-2">
                  <select
                     id="withdraw-method-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-semibold"
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
                    className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                id="submit-withdraw-btn"
                type="submit"
                className="py-2.5 px-4 bg-brand-deep-teal hover:bg-brand-deep-teal/90 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
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
