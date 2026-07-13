/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserProfile, WithdrawRequest } from "../types";
import { ShieldAlert, Users, Coins, TrendingUp, CheckCircle, XCircle, Clock, Search, ShieldCheck } from "lucide-react";

interface AdminPanelProps {
  profile: UserProfile;
  adminData: {
    users: any[];
    withdrawRequests: WithdrawRequest[];
  };
  onApproveWithdraw: (requestId: string, status: "approved" | "rejected") => Promise<void>;
  onRefreshAdminData: () => void;
}

export default function AdminPanel({
  profile,
  adminData,
  onApproveWithdraw,
  onRefreshAdminData
}: AdminPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"requests" | "users">("requests");

  const filteredUsers = adminData.users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = adminData.withdrawRequests.filter(r => r.status === "pending");
  const processedRequests = adminData.withdrawRequests.filter(r => r.status !== "pending");

  const handleAction = async (requestId: string, status: "approved" | "rejected") => {
    try {
      await onApproveWithdraw(requestId, status);
      alert(`রিকোয়েস্টটি সফলভাবে ${status === "approved" ? "অনুমোদিত" : "বাতিল"} করা হয়েছে।`);
    } catch (e) {
      console.error(e);
      alert("অ্যাকশন সম্পন্ন করতে ব্যর্থ হয়েছে।");
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">মোট নিবন্ধিত ইউজার</p>
            <p className="text-3xl font-bold font-mono text-violet-600 mt-1">{adminData.users.length} জন</p>
          </div>
          <div className="bg-violet-50 text-violet-600 p-3 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">অপেক্ষমাণ উইথড্র রিকোয়েস্ট</p>
            <p className="text-3xl font-bold font-mono text-orange-500 mt-1">{pendingRequests.length} টি</p>
          </div>
          <div className="bg-orange-50 text-orange-500 p-3 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">অনুমোদিত উইথড্র রিকোয়েস্ট</p>
            <p className="text-3xl font-bold font-mono text-emerald-600 mt-1">
              {adminData.withdrawRequests.filter(r => r.status === "approved").length} টি
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Admin Action Bar */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex">
        <button
          id="admin-tab-requests-btn"
          onClick={() => setActiveTab("requests")}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "requests" 
              ? "bg-white text-violet-600 shadow-sm" 
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-violet-500" />
          পেমেন্ট / উইথড্র রিকোয়েস্ট ({pendingRequests.length})
        </button>
        <button
          id="admin-tab-users-btn"
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "users" 
              ? "bg-white text-violet-600 shadow-sm" 
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          ইউজার ডিরেক্টরি ও ম্যানেজমেন্ট ({adminData.users.length})
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        {activeTab === "requests" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                <Clock className="w-4.5 h-4.5 text-brand-orange-500" />
                অপেক্ষমাণ উইথড্র রিকোয়েস্টসমূহ (Pending Requests)
              </h3>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-semibold">কোনো অপেক্ষমাণ উইথড্র রিকোয়েস্ট নেই।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div 
                      key={req.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold bg-brand-purple-100 text-brand-purple-700 px-2.5 py-0.5 rounded-md">
                            {req.paymentMethod}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">ID: {req.id}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700">আবেদনকারী: {req.userEmail}</p>
                        <p className="text-xs text-slate-400 mt-1">অ্যাকাউন্ট নম্বর: <span className="font-mono font-bold text-slate-600">{req.accountNumber}</span></p>
                        <p className="text-xs text-slate-400 mt-0.5">সময়: {new Date(req.timestamp).toLocaleString("bn-BD")}</p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right mr-2">
                          <p className="text-xs text-slate-400 font-medium">উইথড্র পরিমাণ</p>
                          <p className="text-lg font-bold font-mono text-brand-purple-700">৳{req.amount} BDT</p>
                        </div>
                        <button
                          id={`approve-req-btn-${req.id}`}
                          onClick={() => handleAction(req.id, "approved")}
                          className="py-1.5 px-3 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          অনুমোদন
                        </button>
                        <button
                          id={`reject-req-btn-${req.id}`}
                          onClick={() => handleAction(req.id, "rejected")}
                          className="py-1.5 px-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Processed Requests History */}
            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2 mb-4">
                <CheckCircle className="w-4.5 h-4.5 text-brand-green-500" />
                পূর্ববর্তী উইথড্র ট্রানজেকশন হিস্ট্রি (Completed Transactions)
              </h3>

              {processedRequests.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-xs font-medium">কোনো পূর্ববর্তী রেকর্ড নেই।</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {processedRequests.map((req) => (
                    <div 
                      key={req.id}
                      className="p-3 bg-white border border-slate-100 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-700">{req.userEmail}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{req.paymentMethod} • {req.accountNumber}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono text-slate-600">৳{req.amount}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === "approved" 
                            ? "bg-brand-green-50 text-brand-green-700" 
                            : "bg-red-50 text-red-600"
                        }`}>
                          {req.status === "approved" ? "অনুমোদিত" : "বাতিলকৃত"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="admin-search-users"
                type="text"
                placeholder="নাম অথবা ইমেইল দিয়ে ইউজার খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-purple-500/20"
              />
            </div>

            {/* Users list */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="excel-table w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th>ইউজারের নাম ও ইমেইল (User)</th>
                    <th className="text-center">ভূমিকা (Role)</th>
                    <th className="text-center">বর্তমান কয়েন</th>
                    <th className="text-center">ওয়ালেট ব্যালেন্স</th>
                    <th className="text-center">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.uid}>
                      <td className="text-left font-sans">
                        <p className="font-bold text-slate-700 leading-none mb-1">{u.displayName}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{u.email}</span>
                      </td>
                      <td className="text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === "admin" 
                            ? "bg-brand-purple-100 text-brand-purple-800" 
                            : u.role === "writer" 
                            ? "bg-brand-orange-100 text-brand-orange-800" 
                            : "bg-brand-green-100 text-brand-green-800"
                        }`}>
                          {u.role === "admin" ? "Admin" : u.role === "writer" ? "Writer" : "Reader"}
                        </span>
                      </td>
                      <td className="text-center font-mono font-bold text-brand-orange-600">{u.coins} CC</td>
                      <td className="text-center font-mono font-bold text-brand-purple-700">৳ {u.currentBalance}</td>
                      <td className="text-center font-sans text-slate-500 font-medium text-xs">সক্রিয় (Active)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
