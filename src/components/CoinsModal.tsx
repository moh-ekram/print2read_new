/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CoinTransaction, UserProfile } from "../types";
import { Coins, Wallet, Landmark, TrendingUp, Sparkles, Check, ChevronRight } from "lucide-react";

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
    <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        id="coins-modal-container"
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-orange-100 flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left Panel: Wallet & Store */}
        <div className="bg-linear-to-b from-brand-orange-50 to-brand-purple-50 p-6 md:w-1/2 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto">
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-semibold bg-brand-orange-100 text-brand-orange-700 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                কয়েন ওয়ালেট
              </span>
              <button 
                id="close-coins-modal"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Balances */}
            <div className="space-y-4 mb-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-orange-500 text-white p-2.5 rounded-xl">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">বর্তমান কয়েন</p>
                    <p className="text-xl font-bold font-mono text-brand-orange-700">{profile.coins} CC</p>
                  </div>
                </div>
                <div className="text-right text-xs bg-brand-orange-50 text-brand-orange-600 font-medium px-2.5 py-1 rounded-lg">
                  ১ কয়েন = ২ টাকা
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-purple-600 text-white p-2.5 rounded-xl">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">ওয়ালেটের কারেন্ট ব্যালেন্স</p>
                    <p className="text-xl font-bold font-mono text-brand-purple-700">৳ {profile.currentBalance}</p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400 max-w-[100px] leading-tight">
                  ব্যালেন্স ও কয়েন সম্পূর্ণ সমন্বিত
                </div>
              </div>
            </div>

            {/* Coin Shop */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-600 flex items-center gap-1">
                <Landmark className="w-4 h-4 text-brand-orange-500" />
                কয়েন কিনুন (Buy Coins)
              </h4>

              {successMsg && (
                <div className="p-3 bg-brand-green-50 text-brand-green-700 border border-brand-green-100 rounded-xl text-xs font-semibold leading-relaxed">
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
                    className={`w-full text-left p-3 rounded-xl border transition-all relative flex items-center justify-between cursor-pointer ${
                      bundle.popular 
                        ? "bg-brand-orange-50/40 border-brand-orange-300 hover:border-brand-orange-500" 
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 text-sm font-mono">{bundle.coins} Coins</span>
                        {bundle.popular && (
                          <span className="text-[9px] bg-brand-orange-500 text-white px-1.5 py-0.5 rounded-md font-medium">
                            সেরা ডিল
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{bundle.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-purple-700 font-mono">৳{bundle.price}</span>
                      <div className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg text-slate-600">
                        {loading === `${bundle.coins}` ? (
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-brand-orange-600 rounded-full animate-spin"></div>
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

          <div className="mt-6 pt-4 border-t border-slate-200/60 text-[10px] text-slate-400 leading-relaxed">
            * পেমেন্ট bKash, Nagad অথবা কার্ডের মাধ্যমে ইনস্ট্যান্ট রিচার্জ করা সম্ভব। কয়েন ওয়ালেট রিচার্জ করার সাথে সাথে পাঠক প্যানেলে তা আপগ্রেড হয়ে যায়।
          </div>
        </div>

        {/* Right Panel: Transaction History */}
        <div className="p-6 md:w-1/2 flex flex-col justify-between overflow-y-auto bg-white">
          <div>
            <h3 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-brand-purple-600" />
              সম্প্রতি খরচ ও ট্রানজেকশন হিস্ট্রি
            </h3>

            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Coins className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-xs font-medium">কোনো ট্রানজেকশন পাওয়া যায়নি।</p>
                <p className="text-[10px] text-slate-400 mt-1">কয়েন কিনলে বা লেখা পড়লে ইতিহাস এখানে প্রদর্শিত হবে।</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {transactions.slice(0, 10).map((tx) => {
                  const isPurchase = tx.type === "buy_coins";
                  const isPrint = tx.type === "print_post";
                  const isRead = tx.type === "read_post";

                  return (
                    <div 
                      key={tx.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full ${
                            isPurchase ? "bg-brand-green-500" : isPrint ? "bg-brand-orange-500" : "bg-brand-purple-500"
                          }`} />
                          <span className="font-bold text-slate-600">
                            {isPurchase ? "কয়েন ক্রয়" : isPrint ? "প্রিন্ট বাস্কেটে যুক্ত" : "লেখা রিডার মোড"}
                          </span>
                        </div>
                        {tx.postTitle && (
                          <p className="text-slate-500 text-[11px] truncate leading-tight mb-1" title={tx.postTitle}>
                            {tx.postTitle}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(tx.timestamp).toLocaleString("bn-BD", { hour12: true })}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold font-mono ${isPurchase ? "text-brand-green-600" : "text-slate-600"}`}>
                          {isPurchase ? "+" : "-"}{tx.amountCoins} CC
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {isPurchase ? "+" : "-"}৳{tx.amountMoney}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>মোট ট্রানজেকশন: {transactions.length} টি</span>
            <span className="font-semibold text-brand-purple-600">Read-to-Print Engine v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
