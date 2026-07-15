/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X, ChevronLeft, ChevronRight, BookOpen, Download, Printer, FileText } from "lucide-react";
import { Post } from "../types";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  basketPosts: Post[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  bookTitle,
  basketPosts,
  totalPages,
  currentPage,
  setCurrentPage,
}: PdfPreviewModalProps) {
  if (!isOpen) return null;

  // Generate logical PDF pages based on basket posts
  const getPdfPages = () => {
    const pages: {
      type: "cover" | "toc" | "content";
      title?: string;
      author?: string;
      content?: string;
      pageNum: number;
      articleIndex?: number;
    }[] = [];

    // Page 1: Cover Page
    pages.push({
      type: "cover",
      pageNum: 1,
    });

    // Page 2: Table of Contents (TOC)
    pages.push({
      type: "toc",
      pageNum: 2,
    });

    // Pages 3+: Content Pages
    let currentStartPage = 3;
    basketPosts.forEach((post, postIdx) => {
      const words = post.content ? post.content.split(/\s+/).filter(Boolean) : [];
      const wordCount = words.length || 200;
      const pagesNeeded = Math.ceil(wordCount / 200);

      const wordsPerPage = Math.ceil(wordCount / pagesNeeded);
      for (let i = 0; i < pagesNeeded; i++) {
        const startIdx = i * wordsPerPage;
        const endIdx = Math.min(wordCount, (i + 1) * wordsPerPage);
        const pageContent = words.slice(startIdx, endIdx).join(" ");

        pages.push({
          type: "content",
          title: post.title,
          author: post.authorName,
          content: pageContent,
          pageNum: currentStartPage + i,
          articleIndex: postIdx + 1,
        });
      }
      currentStartPage += pagesNeeded;
    });

    return pages;
  };

  const pdfPages = getPdfPages();
  const activePage = pdfPages[currentPage - 1] || pdfPages[0];

  // Helper for Bengal Numbers conversion
  const toBengaliNumber = (num: number): string => {
    const bNum = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return num
      .toString()
      .split("")
      .map((char) => (isNaN(parseInt(char)) ? char : bNum[parseInt(char)]))
      .join("");
  };

  const handleNext = () => {
    if (currentPage < pdfPages.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Get Table of Contents mapping for render
  const getTocItems = () => {
    let currentStartPage = 3;
    return basketPosts.map((post, idx) => {
      const words = post.content ? post.content.split(/\s+/).filter(Boolean) : [];
      const wordCount = words.length || 200;
      const pagesNeeded = Math.ceil(wordCount / 200);
      const startPage = currentStartPage;
      currentStartPage += pagesNeeded;
      return {
        title: post.title,
        author: post.authorName,
        page: startPage,
        index: idx + 1,
      };
    });
  };

  const tocItems = getTocItems();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-100 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header Bar */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-slate-800 text-sm md:text-base">স্মার্ট পিডিএফ সংকলন প্রিভিউ</h3>
              <p className="text-xs text-slate-400">আপনার কাস্টম বইটির মুদ্রণ লেআউট ও কন্টেন্ট প্রিভিউ</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("পিডিএফ ফাইল জেনারেশন সম্পন্ন হয়েছে! অর্ডার প্লেস করলে এটি প্রিন্ট আকারে আপনার কাছে পাঠানো হবে।")}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              ডাউনলোড PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body / Interactive A4 Stage */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center select-none bg-slate-200/50">
          <div className="flex items-center gap-4 w-full max-w-3xl">
            
            {/* Flip Prev Trigger */}
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className={`p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all shrink-0 ${
                currentPage === 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>

            {/* A4 Page Viewport */}
            <div className="flex-1 bg-white border border-slate-300 rounded-2xl shadow-lg relative flex flex-col justify-between overflow-hidden aspect-[1/1.41] max-h-[70vh] min-h-[500px]">
              
              {/* Cover Layout */}
              {activePage.type === "cover" && (
                <div className="h-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white p-8 md:p-12 flex flex-col justify-between relative text-center font-serif">
                  {/* Decorative Header */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />
                  
                  <div className="space-y-2 mt-8">
                    <span className="text-[10px] uppercase tracking-widest text-amber-400 font-mono font-bold bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                      Read-To-Print Anthology
                    </span>
                    <h1 className="text-xl md:text-3xl font-black text-slate-100 tracking-tight leading-tight pt-4 px-2">
                      {bookTitle || "আমার সংকলন"}
                    </h1>
                    <div className="w-16 h-0.5 bg-amber-500 mx-auto my-4" />
                  </div>

                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400 font-sans tracking-wider uppercase font-bold">সংকলিত লেখকবৃন্দ</p>
                    <div className="space-y-1.5 text-xs text-slate-200 max-w-md mx-auto line-clamp-3">
                      {basketPosts
                        .map((p) => p.authorName)
                        .filter((v, i, s) => s.indexOf(v) === i)
                        .map((author, idx) => (
                          <span key={author} className="inline-block px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg m-0.5 font-sans font-medium text-slate-300">
                            ✍️ {author}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="h-px bg-white/10 max-w-xs mx-auto" />
                    <p className="text-[10px] text-amber-500 font-mono tracking-wider font-semibold">ঢাকা সাহিত্য পরিষদ প্রেস</p>
                    <p className="text-[9px] text-slate-500 font-sans">কভার পেজ • পৃষ্ঠা ১</p>
                  </div>
                </div>
              )}

              {/* Table of Contents Layout */}
              {activePage.type === "toc" && (
                <div className="h-full p-8 md:p-12 flex flex-col justify-between font-serif text-slate-800">
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-lg md:text-xl font-black border-b border-slate-200 pb-2">সূচিপত্র (Table of Contents)</h2>
                      <p className="text-[10px] text-slate-400 font-sans mt-1">এই বইয়ের অন্তর্ভুক্ত সকল রচনা ও পৃষ্ঠা পরিসীমা</p>
                    </div>

                    <div className="space-y-4 pt-4 text-xs md:text-sm">
                      {tocItems.map((item) => (
                        <div key={item.index} className="flex justify-between items-end gap-2 text-slate-700">
                          <div className="min-w-0 flex-1 flex items-baseline gap-1">
                            <span className="font-bold text-orange-600">{toBengaliNumber(item.index)}.</span>
                            <span className="font-extrabold truncate text-slate-800">{item.title}</span>
                            <span className="text-[10px] text-slate-400 font-sans font-medium">({item.author})</span>
                            <div className="flex-1 border-b border-dotted border-slate-300 mx-1 mb-1" />
                          </div>
                          <span className="font-mono text-xs text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-sm font-bold">
                            পৃষ্ঠা {toBengaliNumber(item.page)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center pt-4 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-mono tracking-wide">Read-To-Print Anthology • পৃষ্ঠা {toBengaliNumber(2)}</p>
                  </div>
                </div>
              )}

              {/* Content Page Layout */}
              {activePage.type === "content" && (
                <div className="h-full p-8 md:p-12 flex flex-col justify-between text-slate-800">
                  {/* Page Header */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-serif border-b border-slate-100 pb-1.5 leading-none">
                    <span className="truncate max-w-[150px] font-bold">{bookTitle}</span>
                    <span className="text-orange-600 font-bold">অধ্যায় {toBengaliNumber(activePage.articleIndex || 1)}</span>
                  </div>

                  {/* Dynamic Content Frame */}
                  <div className="flex-1 py-6 flex flex-col justify-start">
                    {/* Only show title and author on the FIRST page of the article */}
                    {activePage.pageNum === getTocItems().find(item => item.title === activePage.title)?.page && (
                      <div className="mb-4">
                        <h3 className="text-base md:text-lg font-serif font-black text-slate-900 leading-snug">
                          {activePage.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-sans mt-1">রচনা করেছেন: <span className="font-bold text-slate-600">{activePage.author}</span></p>
                        <div className="w-12 h-0.5 bg-indigo-500 mt-2.5" />
                      </div>
                    )}

                    {/* Justified layout */}
                    <div className="text-xs md:text-sm text-slate-600 font-serif leading-relaxed text-justify whitespace-pre-line">
                      {activePage.content}
                    </div>
                  </div>

                  {/* Page Footer */}
                  <div className="text-center pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-serif tracking-wide">পৃষ্ঠা {toBengaliNumber(activePage.pageNum)}</p>
                  </div>
                </div>
              )}

            </div>

            {/* Flip Next Trigger */}
            <button
              onClick={handleNext}
              disabled={currentPage === pdfPages.length}
              className={`p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all shrink-0 ${
                currentPage === pdfPages.length ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>

          </div>
        </div>

        {/* Bottom Pagination Control bar */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold font-mono px-2.5 py-1 rounded-lg">
              {toBengaliNumber(currentPage)} / {toBengaliNumber(totalPages)} পৃষ্ঠা
            </span>
            <span className="text-slate-400">({basketPosts.length}টি সংকলিত লেখার ভিত্তিতে প্রস্তুতকৃত)</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold flex items-center gap-1 ${
                currentPage === 1 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              ← পূর্ববর্তী
            </button>
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold flex items-center gap-1 ${
                currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              পরবর্তী →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
