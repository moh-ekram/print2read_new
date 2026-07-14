/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CoinTransaction, UserProfile } from "../types";
import { Coins, Wallet, Landmark, TrendingUp, Sparkles, Check, ChevronRight, X } from "lucide-react";

interface CoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  transactions: CoinTransaction[];
  onUpdateProfile: (updatedProfile: UserProfile) => void;
  onRefreshTransactions: () => void;
}

export default function CoinsModal({
  isOpen,
  onClose,
  profile,
  transactions,
  onUpdateProfile,
  onRefreshTransactions
}: CoinsModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleBuyCoins = async (coinsAmount: number, moneyAmount: number) => {
    setLoading(`${coinsAmount}`);
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/users/${profile.uid}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "buy_coins",
          amountCoins: coinsAmount,
          amountMoney: moneyAmount
        })
      });
      if (response.ok) {
        const data = await response.json();
        onUpdateProfile(data.user);
        onRefreshTransactions();
        setSuccessMsg(`অভিনন্দন! আপনি সফলভাবে ${coinsAmount}টি কয়েন ক্রয় করেছেন।`);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const err = await response.json();
        alert(err.error || "ক্রয় সম্পন্ন করা সম্ভব হয়নি।");
      }
    } catch (e) {
      console.error(e);
      alert("সার্ভার ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setLoading(null);
    }
  };

  const bundles = [
    { coins: 100, price: 200, label: "স্টার্টার প্যাক" },
    { coins: 250, price: 500, label: "পপুলার প্যাক", popular: true },
    { coins: 600, price: 1000, label: "সুপার ভ্যালু (১০০ বোনাস!)" }
  ];

  return (
    <div className="fixed inset-0 bg-brand-deep-teal/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div 
        id="coins-modal-container"
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left Panel: Wallet & Store */}
        <div className="bg-slate-50/50 p-6 md:w-1/2 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto">
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold bg-brand-soft-teal/10 text-brand-deep-teal px-3 py-1 rounded-xl flex items-center gap-1.5 border border-brand-soft-teal/20">
                <Sparkles className="w-3.5 h-3.5 text-brand-amber animate-pulse" />
                কয়েন ওয়ালেট
              </span>
              <button 
                id="close-coins-modal"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Balances */}
            <div className="space-y-4 mb-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-amber text-white p-2.5 rounded-xl shadow-xs">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">বর্তমান কয়েন</p>
                    <p className="text-xl font-black font-mono text-brand-amber">{profile.coins} CC</p>
                  </div>
                </div>
                <div className="text-right text-[10px] bg-brand-amber/10 text-brand-amber font-bold px-2.5 py-1 rounded-lg">
                  ১ CC = ২ টাকা
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-deep-teal text-white p-2.5 rounded-xl shadow-xs">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ওয়ালেটের কারেন্ট ব্যালেন্স</p>
                    <p className="text-xl font-black font-mono text-brand-deep-teal">৳ {profile.currentBalance}</p>
                  </div>
                </div>
                <div className="text-right text-[9px] text-slate-400 max-w-[100px] leading-tight">
                  ব্যালেন্স ও কয়েন সম্পূর্ণ সমন্বিত
                </div>
              </div>
            </div>

            {/* Coin Shop */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-brand-deep-teal" />
                কয়েন কিনুন (Buy Coins)
              </h4>

              {successMsg && (
                <div className="p-3 bg-brand-emerald/5 text-brand-emerald border border-brand-emerald/10 rounded-xl text-xs font-semibold leading-relaxed animate-bounce">
                  ✓ {successMsg}
                </div>
              )}

              <div className="space-y-2">
                {bundles.map((bundle) => (
                  <button
                    id={`buy-bundle-${bundle.coins}`}
                    key={bundle.coins}
                    onClick={() => handleBuyCoins(bundle.coins, bundle.price)}
                    disabled={loading !== null}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all relative flex items-center justify-between cursor-pointer ${
                      bundle.popular 
                        ? "bg-brand-amber/5 border-brand-amber/25 hover:border-brand-amber shadow-3xs" 
                        : "bg-white border-slate-200 hover:border-brand-soft-teal"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-sm font-mono">{bundle.coins} Coins</span>
                        {bundle.popular && (
                          <span className="text-[8px] bg-brand-amber text-white px-1.5 py-0.5 rounded-md font-bold uppercase">
                            সেরা ডিল
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{bundle.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-deep-teal font-mono">৳{bundle.price}</span>
                      <div className="bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg text-slate-500">
                        {loading === `${bundle.coins}` ? (
                          <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-brand-amber rounded-full animate-spin"></div>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/60 text-[9px] text-slate-400 leading-relaxed">
            * পেমেন্ট bKash, Nagad অথবা কার্ডের মাধ্যমে ইনস্ট্যান্ট রিচার্জ করা সম্ভব। কয়েন ওয়ালেট রিচার্জ করার সাথে সাথে পাঠক প্যানেলে তা আপগ্রেড হয়ে যায়।
          </div>
        </div>

        {/* Right Panel: Transaction History */}
        <div className="p-6 md:w-1/2 flex flex-col justify-between overflow-y-auto bg-white">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <TrendingUp className="w-4 h-4 text-brand-deep-teal" />
              সম্প্রতি খরচ ও ট্রানজেকশন হিস্ট্রি
            </h3>

            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Coins className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-xs font-bold text-slate-600">কোনো ট্রানজেকশন পাওয়া যায়নি।</p>
                <p className="text-[10px] text-slate-400 mt-1">কয়েন কিনলে বা লেখা পড়লে ইতিহাস এখানে প্রদর্শিত হবে।</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {transactions.slice(0, 10).map((tx) => {
                  const isPurchase = tx.type === "buy_coins";
                  const isPrint = tx.type === "print_post";

                  return (
                    <div 
                      key={tx.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full ${
                            isPurchase ? "bg-brand-emerald" : isPrint ? "bg-brand-amber" : "bg-brand-soft-teal"
                          }`} />
                          <span className="font-bold text-slate-600">
                            {isPurchase ? "কয়েন ক্রয়" : isPrint ? "প্রিন্ট বাস্কেটে যুক্ত" : "লেখা রিডার মোড"}
                          </span>
                        </div>
                        {tx.postTitle && (
                          <p className="text-slate-500 text-[10px] truncate leading-tight mb-1" title={tx.postTitle}>
                            {tx.postTitle}
                          </p>
                        )}
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(tx.timestamp).toLocaleString("bn-BD", { hour12: true })}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold font-mono text-[11px] ${isPurchase ? "text-brand-emerald" : "text-slate-600"}`}>
                          {isPurchase ? "+" : "-"}{tx.amountCoins} CC
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {isPurchase ? "+" : "-"}৳{tx.amountMoney}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>মোট ট্রানজেকশন: {transactions.length} টি</span>
            <span className="font-bold text-brand-deep-teal">Read-to-Print Engine v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
