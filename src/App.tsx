/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, Post, CoinTransaction, UserRole } from "./types";
import AuthModal from "./components/AuthModal";
import { firebaseAuth, isFirebaseConfigured } from "./lib/firebase";
import { 
  fetchPostsFromFirestore, 
  getUserProfileFromFirestore, 
  saveUserProfileToFirestore, 
  createPostInFirestore, 
  editPostInFirestore, 
  handleUserActionInFirestore, 
  fetchTransactionsFromFirestore, 
  createWithdrawRequestInFirestore, 
  handleWithdrawActionInFirestore, 
  fetchAdminDataFromFirestore,
  submitWriterApplicationInFirestore,
  approveWriterApplicationInFirestore
} from "./lib/firestoreService";
import CoinsModal from "./components/CoinsModal";
import ReaderPanel from "./components/ReaderPanel";
import WriterPanel from "./components/WriterPanel";
import AdminPanel from "./components/AdminPanel";
import PostReaderModal from "./components/PostReaderModal";
import FacebookPostBox from "./components/FacebookPostBox";
import { 
  BookOpen, 
  Coins, 
  Wallet, 
  Sparkles, 
  Printer, 
  LogIn, 
  LogOut, 
  User, 
  TrendingUp, 
  History, 
  PenTool, 
  Clock,
  ShieldAlert,
  Search,
  BookMarked,
  Heart,
  ExternalLink,
  Users,
  ShoppingBag,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  CreditCard,
  Plus,
  RefreshCw
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  
  // Admin Data states
  const [adminData, setAdminData] = useState<{ users: any[]; withdrawRequests: any[]; globalHistory: any[] }>({
    users: [],
    withdrawRequests: [],
    globalHistory: []
  });

  // Modal controls
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCoinsOpen, setIsCoinsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Active view tabs for profile
  const [profileView, setProfileView] = useState<"reader" | "writer" | "admin">("reader");
  const [activeNavView, setActiveNavView] = useState<"home" | "profile" | "authors" | "basket" | "balance" | "writer-panel" | "admin">("home");
  const [profileSection, setProfileSection] = useState<"reader" | "writer">("reader");
  const [readerTab, setReaderTab] = useState<"bookmarks" | "basket" | "following">("bookmarks");
  const [searchQuery, setSearchQuery] = useState("");

  // Simulated physical print states
  const [printingState, setPrintingState] = useState<"idle" | "processing" | "paper" | "printing" | "success">("idle");
  const [printProgress, setPrintProgress] = useState(0);
  const [printedReceipt, setPrintedReceipt] = useState<any | null>(null);

  // Coins purchase gateway simulation
  const [paymentGatewayState, setPaymentGatewayState] = useState<"idle" | "selecting" | "paying" | "success">("idle");
  const [selectedBundle, setSelectedBundle] = useState<any | null>(null);
  const [gatewayPhone, setGatewayPhone] = useState("");
  const [gatewayPin, setGatewayPin] = useState("");

  // Author Application fields
  const [appCategory, setAppCategory] = useState("প্রবন্ধ ও গল্প");
  const [appMotivation, setAppMotivation] = useState("");
  const [sample1Title, setSample1Title] = useState("");
  const [sample1Content, setSample1Content] = useState("");
  const [sample2Title, setSample2Title] = useState("");
  const [sample2Content, setSample2Content] = useState("");
  const [selectedAuthorForView, setSelectedAuthorForView] = useState<any | null>(null);
  const [authorSearchQuery, setAuthorSearchQuery] = useState("");

  // Loading states
  const [loadingPosts, setLoadingPosts] = useState(true);

  // 1. Initial mounting and loading
  useEffect(() => {
    if (isFirebaseConfigured && firebaseAuth) {
      const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
        if (user) {
          loadUserSession(user.uid, user.email || undefined);
        } else {
          setCurrentUser(null);
        }
      });
      fetchPosts();
      fetchAdminData();
      return () => unsubscribe();
    } else {
      // Sandbox mode: Restore last logged-in user if available, otherwise start as guest (null)
      const savedUid = localStorage.getItem("sandbox_user_uid");
      if (savedUid) {
        loadUserSession(savedUid);
      } else {
        setCurrentUser(null);
      }
      fetchPosts();
      fetchAdminData();
    }
  }, []);

  const loadUserSession = async (uid: string, email?: string) => {
    try {
      if (isFirebaseConfigured) {
        const actualEmail = email || firebaseAuth?.currentUser?.email || undefined;
        const profile = await getUserProfileFromFirestore(uid, actualEmail ? { email: actualEmail } : undefined);
        if (profile) {
          const updatedProfile = { ...profile } as any;
          if (actualEmail) {
            updatedProfile.email = actualEmail;
          }
          // Force admin privileges if the email is mohammad.001ekram@gmail.com
          if (
            updatedProfile.email?.toLowerCase().trim() === "mohammad.001ekram@gmail.com" ||
            actualEmail?.toLowerCase().trim() === "mohammad.001ekram@gmail.com"
          ) {
            updatedProfile.role = "admin";
          }
          setCurrentUser(updatedProfile as any);
          setProfileView(updatedProfile.role);
          setProfileSection(updatedProfile.role === "writer" ? "writer" : "reader");
          fetchTransactions(updatedProfile.uid);
        }
      } else {
        const response = await fetch(`/api/users/${uid}`);
        if (response.ok) {
          const profile = await response.json();
          // Force admin in sandbox mode if email matches
          if (profile.email?.toLowerCase().trim() === "mohammad.001ekram@gmail.com") {
            profile.role = "admin";
          }
          setCurrentUser(profile);
          setProfileView(profile.role);
          setProfileSection(profile.role === "writer" ? "writer" : "reader");
          fetchTransactions(profile.uid);
        }
      }
    } catch (e) {
      console.error("Failed to load user session", e);
    }
  };

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      if (isFirebaseConfigured) {
        const data = await fetchPostsFromFirestore();
        setPosts(data);
      } else {
        const response = await fetch("/api/posts");
        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        }
      }
    } catch (e) {
      console.error("Failed to fetch posts", e);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchTransactions = async (uid: string) => {
    try {
      if (isFirebaseConfigured) {
        const data = await fetchTransactionsFromFirestore(uid);
        setTransactions(data);
      } else {
        const response = await fetch(`/api/transactions/${uid}`);
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        }
      }
    } catch (e) {
      console.error("Failed to fetch transactions", e);
    }
  };

  const fetchAdminData = async () => {
    try {
      if (isFirebaseConfigured) {
        const data = await fetchAdminDataFromFirestore();
        setAdminData(data);
      } else {
        const response = await fetch("/api/admin/data");
        if (response.ok) {
          const data = await response.json();
          setAdminData(data);
        }
      }
    } catch (e) {
      console.error("Failed to fetch admin data", e);
    }
  };

  // 2. Interactive Handlers
  const handleAuthSuccess = (profile: UserProfile) => {
    const updatedProfile = { ...profile };
    if (updatedProfile.email?.toLowerCase().trim() === "mohammad.001ekram@gmail.com") {
      updatedProfile.role = "admin";
    }
    setCurrentUser(updatedProfile as any);
    setProfileView(updatedProfile.role);
    setProfileSection(updatedProfile.role === "writer" ? "writer" : "reader");
    fetchTransactions(updatedProfile.uid);
    fetchAdminData();
    if (!isFirebaseConfigured) {
      localStorage.setItem("sandbox_user_uid", updatedProfile.uid);
    }
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        await firebaseAuth.signOut();
      } catch (e) {
        console.error("Firebase sign out error", e);
      }
    } else {
      localStorage.removeItem("sandbox_user_uid");
    }
    setCurrentUser(null);
  };

  // Unified interaction handler (bookmarks, print basket, follows, reads)
  const handleAction = async (actionType: string, postId?: string, authorId?: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    try {
      if (isFirebaseConfigured) {
        const result = await handleUserActionInFirestore(currentUser.uid, actionType, { postId, authorId });
        if (result && result.success) {
          if (result.user) {
            setCurrentUser(result.user as any);
          }
          // Refresh listings and metrics
          fetchPosts();
          fetchTransactions(currentUser.uid);
          fetchAdminData();

          // If currently viewing the selected post, update its views/counters locally
          if (selectedPost && postId === selectedPost.id) {
            const allPosts = await fetchPostsFromFirestore();
            const updatedPost = allPosts.find((p: any) => p.id === postId) || selectedPost;
            setSelectedPost(updatedPost);
          }
        } else {
          alert("অ্যাকশন সম্পন্ন করা যায়নি।");
        }
      } else {
        const response = await fetch(`/api/users/${currentUser.uid}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionType, postId, authorId }),
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          
          // Refresh local listings and metrics
          fetchPosts();
          fetchTransactions(currentUser.uid);
          fetchAdminData();

          // If currently viewing the selected post, update its views/counters locally
          if (selectedPost && postId === selectedPost.id) {
            const updatedPost = data.posts?.find((p: Post) => p.id === postId) || selectedPost;
            setSelectedPost(updatedPost);
          }
        } else {
          const err = await response.json();
          alert(err.error || "অ্যাকশন সম্পন্ন করা যায়নি।");
        }
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "সার্ভার সংযোগ ব্যাহত হয়েছে। পুনরায় চেষ্টা করুন।");
    }
  };

  // Author publishing a new post
  const handlePublishPost = async (
    title: string,
    excerpt: string,
    content: string,
    priceCoins: number,
    priceMoney: number
  ) => {
    if (!currentUser) return;
    try {
      if (isFirebaseConfigured) {
        const newPost = await createPostInFirestore({
          title,
          excerpt,
          content,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          priceCoins,
          priceMoney
        });
        if (newPost) {
          alert("আপনার লেখাটি সফলভাবে প্রকাশিত হয়েছে!");
          fetchPosts();
          fetchAdminData();
        } else {
          alert("লেখা প্রকাশ করতে ব্যর্থ হয়েছে।");
        }
      } else {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            excerpt,
            content,
            priceCoins,
            priceMoney,
            authorId: currentUser.uid,
            authorName: currentUser.displayName
          })
        });

        if (response.ok) {
          alert("আপনার লেখাটি সফলভাবে প্রকাশিত হয়েছে!");
          fetchPosts();
          fetchAdminData();
        } else {
          const err = await response.json();
          alert(err.error || "লেখা প্রকাশ করতে ব্যর্থ হয়েছে।");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Writer editing an existing post
  const handleEditPost = async (
    postId: string,
    title: string,
    excerpt: string,
    content: string,
    priceCoins: number,
    priceMoney: number
  ) => {
    try {
      if (isFirebaseConfigured) {
        const updated = await editPostInFirestore(postId, { title, excerpt, content, priceCoins, priceMoney });
        if (updated) {
          setSelectedPost(updated);
          fetchPosts();
          fetchAdminData();
          alert("লেখাটি সফলভাবে আপডেট করা হয়েছে।");
        } else {
          alert("আপডেট ব্যর্থ হয়েছে।");
        }
      } else {
        const response = await fetch(`/api/posts/${postId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, excerpt, content, priceCoins, priceMoney })
        });

        if (response.ok) {
          const updated = await response.json();
          setSelectedPost(updated);
          fetchPosts();
          fetchAdminData();
          alert("লেখাটি সফলভাবে আপডেট করা হয়েছে।");
        } else {
          const err = await response.json();
          alert(err.error || "আপডেট ব্যর্থ হয়েছে।");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Writer submitting a withdraw request
  const handleWithdrawRequest = async (
    amount: number,
    paymentMethod: string,
    accountNumber: string
  ) => {
    if (!currentUser) return;
    if (isFirebaseConfigured) {
      const result = await createWithdrawRequestInFirestore(
        currentUser.uid,
        currentUser.email,
        amount,
        paymentMethod,
        accountNumber
      );
      if (result && result.success) {
        await loadUserSession(currentUser.uid);
        await fetchAdminData();
      } else {
        throw new Error("উইথড্র সম্পন্ন করা যায়নি।");
      }
    } else {
      const response = await fetch("/api/admin/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.uid,
          userEmail: currentUser.email,
          amount,
          paymentMethod,
          accountNumber
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        fetchAdminData();
      } else {
        const err = await response.json();
        throw new Error(err.error || "উইথড্র সম্পন্ন করা যায়নি।");
      }
    }
  };

  // Admin approving/rejecting a payout
  const handleApproveWithdraw = async (requestId: string, status: "approved" | "rejected") => {
    if (isFirebaseConfigured) {
      const result = await handleWithdrawActionInFirestore(requestId, status);
      if (result && result.success) {
        fetchAdminData();
        if (currentUser) {
          loadUserSession(currentUser.uid);
        }
      } else {
        throw new Error("অ্যাকশন সম্পন্ন করা যায়নি।");
      }
    } else {
      const response = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status })
      });

      if (response.ok) {
        fetchAdminData();
        // If admin was logged in, reload current wallet balance if they are connected
        if (currentUser) {
          loadUserSession(currentUser.uid);
        }
      } else {
        const err = await response.json();
        throw new Error(err.error || "অ্যাকশন সম্পন্ন করা যায়নি।");
      }
    }
  };

  const handleWriterApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!sample1Title || !sample1Content || !sample2Title || !sample2Content) {
      alert("দয়া করে ২ টি নমুনা লেখার শিরোনাম এবং কন্টেন্ট সম্পূর্ণ পূরণ করুন।");
      return;
    }
    try {
      if (isFirebaseConfigured) {
        const result = await submitWriterApplicationInFirestore({
          userId: currentUser.uid,
          userEmail: currentUser.email || `${currentUser.uid}@readtoprint.com`,
          userDisplayName: currentUser.displayName || currentUser.email?.split("@")[0] || `user-${currentUser.uid.slice(0, 5)}`,
          category: appCategory,
          motivation: appMotivation,
          sample1Title,
          sample1Content,
          sample2Title,
          sample2Content
        });

        if (result && result.success) {
          alert("আপনার লেখক আবেদনটি সফলভাবে সাবমিট করা হয়েছে এবং অ্যাডমিন মূল্যায়নের জন্য পাঠানো হয়েছে।");
          setAppMotivation("");
          setSample1Title("");
          setSample1Content("");
          setSample2Title("");
          setSample2Content("");
          fetchAdminData();
          await loadUserSession(currentUser.uid);
        } else {
          alert("আবেদন সাবমিট করতে ত্রুটি হয়েছে।");
        }
      } else {
        const response = await fetch("/api/admin/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userDisplayName: currentUser.displayName,
            category: appCategory,
            motivation: appMotivation,
            sample1Title,
            sample1Content,
            sample2Title,
            sample2Content
          })
        });

        if (response.ok) {
          alert("আপনার লেখক আবেদনটি সফলভাবে সাবমিট করা হয়েছে এবং অ্যাডমিন মূল্যায়নের জন্য পাঠানো হয়েছে।");
          setAppMotivation("");
          setSample1Title("");
          setSample1Content("");
          setSample2Title("");
          setSample2Content("");
          fetchAdminData();
          await loadUserSession(currentUser.uid);
        } else {
          const err = await response.json();
          alert(err.error || "আবেদন সাবমিট করতে ত্রুটি হয়েছে।");
        }
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "সার্ভার ত্রুটি ঘটেছে।");
    }
  };

  const handleApproveApplication = async (applicationId: string, status: "approved" | "rejected") => {
    try {
      if (isFirebaseConfigured) {
        const result = await approveWriterApplicationInFirestore(applicationId, status);
        if (result && result.success) {
          await fetchAdminData();
          await fetchPosts();
          if (currentUser) {
            await loadUserSession(currentUser.uid);
          }
        } else {
          throw new Error("অ্যাকশন সম্পন্ন করা যায়নি।");
        }
      } else {
        const response = await fetch(`/api/admin/applications/${applicationId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });

        if (response.ok) {
          await fetchAdminData();
          await fetchPosts();
          if (currentUser) {
            await loadUserSession(currentUser.uid);
          }
        } else {
          const err = await response.json();
          throw new Error(err.error || "অ্যাকশন সম্পন্ন করা যায়নি।");
        }
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "সার্ভার সংযোগ ব্যাহত হয়েছে।");
    }
  };

  const handleOpenPostReader = async (post: Post) => {
    setSelectedPost(post);
    // Real view log
    try {
      if (isFirebaseConfigured) {
        await handleUserActionInFirestore(currentUser?.uid || "anonymous", "read", { postId: post.id });
        fetchPosts();
        fetchAdminData();
      } else {
        await fetch(`/api/users/${currentUser?.uid || "anonymous"}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionType: "read", postId: post.id })
        });
        fetchPosts();
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Top Authors lists
  const authorMap = posts.reduce((acc: any, post) => {
    if (!acc[post.authorId]) {
      acc[post.authorId] = {
        id: post.authorId,
        name: post.authorName,
        postCount: 0,
        totalViews: 0,
        totalPrints: 0
      };
    }
    acc[post.authorId].postCount += 1;
    acc[post.authorId].totalViews += post.viewCount;
    acc[post.authorId].totalPrints += post.addToPrintCount;
    return acc;
  }, {});

  const topAuthors = Object.values(authorMap).sort((a: any, b: any) => b.totalPrints - a.totalPrints);

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const menuItems = [
    {
      id: "home" as const,
      label: "হোম পেজ",
      icon: BookOpen,
      color: "brand-deep-teal",
      bgColor: "bg-brand-deep-teal/10 text-brand-deep-teal border border-brand-deep-teal/20",
      hoverColor: "hover:bg-brand-deep-teal/5 hover:text-brand-deep-teal",
      activeText: "text-brand-deep-teal",
      desc: "সকল প্রকাশিত লেখা ও ড্যাশবোর্ড"
    },
    {
      id: "profile" as const,
      label: "আমার প্রোফাইল",
      icon: User,
      color: "brand-soft-teal",
      bgColor: "bg-brand-soft-teal/15 text-brand-deep-teal border border-brand-soft-teal/30",
      hoverColor: "hover:bg-brand-soft-teal/5 hover:text-brand-deep-teal",
      activeText: "text-brand-deep-teal",
      desc: "প্রোফাইল বিবরণ ও বায়োগ্রাফি"
    },
    {
      id: "authors" as const,
      label: "লেখকবৃন্দ",
      icon: Users,
      color: "brand-deep-teal",
      bgColor: "bg-brand-deep-teal/10 text-brand-deep-teal border border-brand-deep-teal/20",
      hoverColor: "hover:bg-brand-deep-teal/5 hover:text-brand-deep-teal",
      activeText: "text-brand-deep-teal",
      desc: "রেজিস্টার্ড লেখকদের তালিকা"
    },
    {
      id: "basket" as const,
      label: "বাস্কেট",
      icon: ShoppingBag,
      color: "brand-amber",
      bgColor: "bg-brand-amber/10 text-brand-amber border border-brand-amber/20",
      hoverColor: "hover:bg-brand-amber/5 hover:text-brand-amber",
      activeText: "text-brand-amber",
      desc: "মুদ্রণযোগ্য লেখার ঝুড়ি",
      badge: currentUser?.printBasketPostIds.length || 0
    },
    {
      id: "balance" as const,
      label: "ব্যালেন্স",
      icon: Coins,
      color: "brand-amber",
      bgColor: "bg-brand-amber/10 text-brand-amber border border-brand-amber/20",
      hoverColor: "hover:bg-brand-amber/5 hover:text-brand-amber",
      activeText: "text-brand-amber",
      desc: "কয়েন ক্রয় ও লেনদেনের খতিয়ান",
      badgeText: currentUser ? `${currentUser.coins} CC` : undefined
    },
    {
      id: "writer-panel" as const,
      label: currentUser?.role === "writer" ? "লেখক প্যানেল" : "লেখক আবেদন",
      icon: PenTool,
      color: "brand-soft-teal",
      bgColor: "bg-brand-soft-teal/15 text-brand-deep-teal border border-brand-soft-teal/30",
      hoverColor: "hover:bg-brand-soft-teal/5 hover:text-brand-deep-teal",
      activeText: "text-brand-deep-teal",
      desc: currentUser?.role === "writer" ? "লেখা প্রকাশ ও আয় পরিসংখ্যান" : "লেখক হতে আবেদন করুন"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-orange-100 selection:text-orange-800 text-slate-800">
      {/* Main Flex Layout with Left Sidebar */}
      <div className="flex-1 flex flex-row min-h-0 relative">
        {/* Left Sidebar navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between py-6 sticky top-0 h-screen shrink-0 hidden md:flex z-30 shadow-xs">
          <div className="flex flex-col gap-6 px-4">
            {/* Header / Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="bg-gradient-to-tr from-brand-deep-teal to-brand-soft-teal text-white p-2.5 rounded-2xl shadow-sm shrink-0">
                <Printer className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-serif font-bold text-slate-800 leading-none">Read-to-Print</h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1.5">মুদ্রণযোগ্য সাহিত্য হাব</p>
              </div>
            </div>

            {/* Nav Items */}
            <nav className="flex flex-col gap-1.5">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = item.id === "writer-panel"
                  ? (activeNavView === "profile" && profileSection === "writer")
                  : item.id === "profile"
                  ? (activeNavView === "profile" && profileSection === "reader")
                  : activeNavView === item.id;

                const isProfileItem = item.id === "profile";
                const showAdminButton = isProfileItem && (
                  currentUser?.email?.toLowerCase().trim() === "mohammad.001ekram@gmail.com" || 
                  currentUser?.role === "admin"
                );

                return (
                  <React.Fragment key={item.id}>
                    <button
                      onClick={() => {
                        if (item.id !== "home" && item.id !== "authors" && !currentUser) {
                          setIsAuthOpen(true);
                        } else {
                          if (item.id === "writer-panel") {
                            setActiveNavView("profile");
                            setProfileSection("writer");
                          } else {
                            setActiveNavView(item.id);
                          }
                          setSelectedAuthorForView(null); // Reset when navigating
                        }
                      }}
                      className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between group border border-transparent ${
                        isActive
                          ? item.bgColor
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <IconComponent className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? item.activeText : "text-slate-400"
                        }`} />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold leading-none ${isActive ? item.activeText : "text-slate-700"}`}>
                            {item.label}
                          </p>
                          <p className="text-[9px] text-slate-400 truncate mt-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      {/* Badge */}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="text-[9px] bg-orange-500 text-white font-bold font-mono px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      {item.badgeText !== undefined && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold font-mono px-1.5 py-0.5 rounded-md">
                          {item.badgeText}
                        </span>
                      )}
                    </button>

                    {showAdminButton && (
                      <button
                        onClick={() => {
                          setActiveNavView("admin");
                          setSelectedAuthorForView(null);
                        }}
                        className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border border-transparent ${
                          activeNavView === "admin"
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-850"
                        }`}
                      >
                        <ShieldAlert className={`w-5 h-5 shrink-0 ${activeNavView === "admin" ? "text-rose-600" : "text-slate-400"}`} />
                        <div>
                          <p className="text-xs font-bold leading-none text-rose-700">অ্যাডমিন প্যানেল</p>
                          <p className="text-[9px] text-slate-400 mt-1">রিকোয়েস্ট ও ইউজার কন্ট্রোল</p>
                        </div>
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer User Details */}
          <div className="px-4">
            {currentUser ? (
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs font-serif uppercase shrink-0">
                    {currentUser.displayName.substring(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 truncate leading-none">{currentUser.displayName}</p>
                    <p className="text-[9px] text-slate-400 capitalize mt-1 truncate">
                      {currentUser.role === "writer" ? "✍️ লেখক" : currentUser.role === "admin" ? "🛡️ অ্যাডমিন" : "📖 পাঠক"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-650 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="লগআউট"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                লগইন / নিবন্ধন
              </button>
            )}
          </div>
        </aside>

        {/* Main Content viewport */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* 2. PRIMARY NAVBAR */}
          <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 h-16 shrink-0 shadow-2xs">
            <div className="max-w-[1550px] mx-auto px-4 md:px-8 h-full flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="md:hidden bg-gradient-to-r from-brand-deep-teal to-brand-soft-teal p-2 rounded-xl text-white shadow-xs">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-base md:text-lg font-serif font-bold text-slate-800 leading-none">Read-to-Print</h1>
                    <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1.5">Where Literature Meets Physical Print Layouts</p>
                  </div>
                </div>
              </div>

              {/* Header Right Widgets */}
              <div className="flex items-center gap-3">
                {currentUser ? (
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 p-1 rounded-full">
                    <button
                      onClick={() => setIsCoinsOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/60 rounded-full shadow-3xs transition-all text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <Coins className="w-4 h-4 text-brand-amber" />
                      <span className="font-mono">{currentUser.coins} CC</span>
                    </button>

                    <div className="w-px h-4 bg-slate-300"></div>

                    <button
                      onClick={() => setActiveNavView("profile")}
                      className="flex items-center gap-2 pr-3 pl-1 text-xs hover:text-brand-deep-teal transition-colors"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-soft-teal shrink-0" />
                      <span className="font-semibold text-slate-700 max-w-[120px] truncate leading-none">{currentUser.displayName}</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="md:hidden p-1.5 hover:bg-red-50 text-red-500 rounded-full transition-colors cursor-pointer"
                      title="লগআউট"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="py-2 px-4 bg-brand-deep-teal hover:bg-brand-deep-teal/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    লগইন / নিবন্ধন
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Mobile responsive scrollable submenu (only visible on mobile) */}
          <div className="md:hidden flex items-center gap-2 overflow-x-auto bg-white p-2.5 scrollbar-none shrink-0 sticky top-16 z-35">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = item.id === "writer-panel"
                ? (activeNavView === "profile" && profileSection === "writer")
                : item.id === "profile"
                ? (activeNavView === "profile" && profileSection === "reader")
                : activeNavView === item.id;

              const isProfileItem = item.id === "profile";
              const showAdminButton = isProfileItem && (
                currentUser?.email?.toLowerCase().trim() === "mohammad.001ekram@gmail.com" || 
                currentUser?.role === "admin"
              );

              return (
                <React.Fragment key={item.id}>
                  <button
                    onClick={() => {
                      if (item.id !== "home" && item.id !== "authors" && !currentUser) {
                        setIsAuthOpen(true);
                      } else {
                        if (item.id === "writer-panel") {
                          setActiveNavView("profile");
                          setProfileSection("writer");
                        } else {
                          setActiveNavView(item.id);
                        }
                        setSelectedAuthorForView(null);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer shrink-0 border ${
                      isActive
                        ? item.bgColor
                        : "bg-slate-50 text-slate-500 border-slate-150 hover:bg-slate-100"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1 bg-orange-500 text-white text-[9px] px-1 rounded-full font-mono font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>

                  {showAdminButton && (
                    <button
                      onClick={() => {
                        setActiveNavView("admin");
                        setSelectedAuthorForView(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer shrink-0 border ${
                        activeNavView === "admin"
                          ? "bg-rose-50 text-rose-700 border-rose-100"
                          : "bg-slate-50 text-slate-500 border-slate-150"
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>অ্যাডমিন প্যানেল</span>
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* 3. HERO BANNER */}
          <section className="bg-white border-b border-slate-200 py-6 shrink-0">
            <div className="max-w-[1550px] mx-auto px-4 md:px-8 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 tracking-tight leading-tight">
                  মুদ্রণযোগ্য জ্ঞান ও সাহিত্যের আধুনিক মিলনমেলা
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
                  রিড-টু-প্রিন্ট একটি সমন্বিত ডিজিটাল হাব। এখানে পাঠকেরা তাদের পছন্দের লেখাগুলো বাস্কেটে যুক্ত করতে পারেন ফিজিক্যাল প্রিন্ট নেওয়ার উদ্দেশ্যে, এবং লেখকেরা পান তাদের লেখার ভিউ, বাস্কেট ও আয়ের সঠিক পরিসংখ্যান।
                </p>
              </div>
              <div className="flex md:self-center self-stretch shrink-0 justify-center">
                <span className="bg-brand-soft-teal/10 text-brand-deep-teal text-xs px-4 py-2 border border-brand-soft-teal/30 rounded-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-amber animate-spin" style={{ animationDuration: "3s" }} />
                  Premium Edition Active
                </span>
              </div>
            </div>
          </section>

          {/* 4. MAIN LAYOUT GRID (HIGH DENSITY VIEW) */}
          <main className="max-w-[1550px] w-full mx-auto px-4 md:px-8 py-6 flex-1">
            {activeNavView === "home" ? (
              /* --- HOMEPAGE VIEW: Shows Post feed & Side Rails only --- */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Center Column: All writings feed */}
                <section className="lg:col-span-8 flex flex-col gap-6">
                  {currentUser?.role === "writer" && (
                    <FacebookPostBox
                      currentUser={currentUser}
                      onPublishPost={handlePublishPost}
                    />
                  )}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-serif font-bold text-slate-800">সকল প্রকাশিত লেখা (All Articles)</h3>
                        <p className="text-xs text-slate-400 mt-1">পড়ুন, বুকমার্ক করুন অথবা আপনার প্রিন্ট বাস্কেটে যুক্ত করুন</p>
                      </div>
                      
                      {/* Search bar */}
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="search-writings-input"
                          type="text"
                          placeholder="লেখা বা লেখক অনুসন্ধান..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-soft-teal/20 focus:border-brand-soft-teal transition-all text-slate-700"
                        />
                      </div>
                    </div>

                    {loadingPosts ? (
                      <div className="text-center py-16">
                        <div className="w-8 h-8 border-3 border-slate-300 border-t-brand-deep-teal rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs text-slate-400">লেখাগুলো লোড করা হচ্ছে...</p>
                      </div>
                    ) : filteredPosts.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BookOpen className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-xs font-medium">কোনো লেখা খুঁজে পাওয়া যায়নি।</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredPosts.map((post) => {
                          const isBookmarked = currentUser?.bookmarkedPostIds.includes(post.id) || false;
                          const isAdded = currentUser?.printBasketPostIds.includes(post.id) || false;

                          return (
                            <div 
                              key={post.id}
                              className="bg-white p-5 rounded-2xl border border-slate-150 hover:border-brand-soft-teal shadow-3xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <span className="text-[10px] bg-brand-soft-teal/10 font-sans font-bold text-brand-deep-teal px-2 py-0.5 rounded-full">
                                    ✍️ {post.authorName}
                                  </span>
                                  {currentUser && (
                                    <button
                                      id={`toggle-bookmark-feed-${post.id}`}
                                      onClick={() => handleAction("bookmark", post.id)}
                                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                        isBookmarked 
                                          ? "bg-brand-soft-teal/15 border-brand-soft-teal/40 text-brand-deep-teal" 
                                          : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600"
                                      }`}
                                    >
                                      <BookMarked className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                  )}
                                </div>

                                <h4 
                                  id={`feed-post-title-click-${post.id}`}
                                  onClick={() => handleOpenPostReader(post)}
                                  className="text-base md:text-lg font-bold font-serif text-slate-800 hover:text-brand-amber transition-colors cursor-pointer leading-snug mb-1.5"
                                >
                                  {post.title}
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-sans mb-3 line-clamp-2">
                                  {post.excerpt}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-slate-150 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex gap-4 text-[10px] text-slate-400 font-mono font-medium">
                                  <span className="flex items-center gap-1">👁️ {post.viewCount} ভিউ</span>
                                  <span className="flex items-center gap-1 text-brand-amber font-bold">🖨️ {post.addToPrintCount} প্রিন্টস</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    id={`read-post-feed-${post.id}`}
                                    onClick={() => handleOpenPostReader(post)}
                                    className="py-1.5 px-3 hover:bg-brand-soft-teal/10 text-brand-deep-teal border border-slate-200 hover:border-brand-soft-teal/40 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    পড়ুন
                                  </button>

                                  {currentUser?.uid !== post.authorId && (
                                    <button
                                      id={`basket-post-feed-${post.id}`}
                                      onClick={() => handleAction("basket", post.id)}
                                      className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1 ${
                                        isAdded 
                                          ? "bg-brand-deep-teal text-white" 
                                          : "bg-brand-amber hover:bg-brand-amber/90 text-white"
                                      }`}
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                      {isAdded ? "প্রিন্টেড" : "অ্যাড টু প্রিন্ট"}
                                      <span className="font-mono text-[10px] opacity-85">({post.priceCoins} CC)</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                {/* Right Rail: Stats, charts and global history */}
                <section className="lg:col-span-4 flex flex-col gap-6">
                  {/* Top Authors chart */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
                      <TrendingUp className="w-4 h-4 text-brand-soft-teal" />
                      সেরা লেখক চার্ট (Top Authors Chart)
                    </h3>
                    {topAuthors.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4">কোনো ডাটা এখনও পাওয়া যায়নি।</p>
                    ) : (
                      <div className="space-y-1">
                        {topAuthors.slice(0, 5).map((author: any, idx) => (
                          <div key={author.id} className="flex items-center justify-between text-xs py-1.5 hover:bg-slate-50/60 rounded-xl px-2 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 flex items-center justify-center rounded-full font-mono font-bold text-[10px] ${
                                idx === 0 ? "bg-brand-amber/15 text-brand-amber" : idx === 1 ? "bg-brand-soft-teal/20 text-brand-deep-teal" : "bg-slate-100 text-slate-500"
                              }`}>
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-bold text-slate-700 font-serif">{author.name}</p>
                                <p className="text-[9px] text-slate-400">{author.postCount}টি লেখা</p>
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-slate-400 font-mono">
                              <span className="text-brand-deep-teal font-bold">{author.totalViews} ভিউ</span>
                              <span className="mx-1">•</span>
                              <span className="text-brand-amber font-bold">{author.totalPrints} প্রিন্টস</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Global print history */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
                      <History className="w-4 h-4 text-brand-amber animate-pulse" />
                      গ্লোবাল প্রিন্ট ইতিহাস (Global Print History)
                    </h3>
                    {adminData.globalHistory.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4">এখনও কোনো প্রিন্ট ইতিহাস নেই।</p>
                    ) : (
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {adminData.globalHistory.slice(0, 10).map((h: any, idx: number) => {
                          const borderColors = [
                            "border-l-3 border-brand-soft-teal bg-brand-soft-teal/5",
                            "border-l-3 border-brand-amber bg-brand-amber/5",
                            "border-l-3 border-brand-deep-teal bg-brand-deep-teal/5"
                          ];
                          return (
                            <div key={h.id} className={`text-[10px] p-2 border border-slate-100 rounded-lg flex justify-between items-center gap-2 leading-tight ${borderColors[idx % borderColors.length]}`}>
                              <div className="truncate flex-1">
                                <span className="font-bold text-slate-600">{h.userDisplayName}</span>
                                <span className="text-slate-400 mx-1">যোগ করেছেন</span>
                                <span className="font-semibold text-brand-deep-teal truncate inline-block max-w-[120px]" title={h.postTitle}>{h.postTitle}</span>
                              </div>
                              <span className="text-slate-400 font-mono shrink-0">
                                {new Date(h.timestamp).toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

              </div>
            ) : activeNavView === "profile" ? (
              /* --- MY PROFILE VIEW --- */
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden mb-6">
                  <div className="h-32 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-600 relative">
                    <div className="absolute -bottom-10 left-8">
                      <div className="w-20 h-20 rounded-2xl bg-white p-1 border-2 border-white shadow-md">
                        <div className="w-full h-full rounded-xl bg-violet-100 text-violet-700 font-serif font-bold text-3xl flex items-center justify-center uppercase">
                          {currentUser?.displayName ? currentUser.displayName.substring(0,1) : "P"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-14 p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-1.5 font-serif">
                          {currentUser?.displayName}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 font-mono">{currentUser?.email}</p>
                      </div>
                      <span className="self-start sm:self-auto px-3.5 py-1.5 bg-violet-50 text-violet-700 rounded-full font-bold text-xs uppercase tracking-wider">
                        {currentUser?.role === "writer" ? "✍️ রেজিস্টার্ড লেখক" : currentUser?.role === "admin" ? "🛡️ সুপার অ্যাডমিন" : "📖 সম্মানিত পাঠক"}
                      </span>
                    </div>

                    {/* Bio Editor Section */}
                    <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl mb-6">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-sm text-slate-600 italic leading-relaxed">
                          "{currentUser?.bio || "কোনো বায়োগ্রাফি সেট করা নেই। 'এডিট বায়ো' বাটনে ক্লিক করে প্রোফাইল সাজাতে পারেন।"}"
                        </p>
                        <button
                          id="edit-bio-btn"
                          onClick={() => {
                            const newBio = prompt("আপনার বায়োগ্রাফি লিখুন:", currentUser?.bio || "");
                            if (newBio !== null) {
                              const newName = prompt("আপনার নাম লিখুন:", currentUser?.displayName || "");
                              if (newName !== null) {
                                fetch(`/api/users/${currentUser?.uid}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ displayName: newName || currentUser?.displayName, bio: newBio })
                                }).then(res => {
                                  if (res.ok) {
                                    alert("প্রোফাইল সফলভাবে আপডেট হয়েছে!");
                                    loadUserSession(currentUser!.uid);
                                    fetchAdminData();
                                  }
                                });
                              }
                            }
                          }}
                          className="text-xs text-violet-600 font-bold hover:underline shrink-0 cursor-pointer"
                        >
                          এডিট প্রোফাইল
                        </button>
                      </div>
                    </div>

                    {/* Reader / Writer Toggle Header */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                      <button
                        id="profile-toggle-reader"
                        onClick={() => setProfileSection("reader")}
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                          profileSection === "reader"
                            ? "bg-white text-emerald-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        📖 পাঠক অংশ (Reader Part)
                      </button>
                      <button
                        id="profile-toggle-writer"
                        onClick={() => setProfileSection("writer")}
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                          profileSection === "writer"
                            ? "bg-white text-orange-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        ✍️ লেখক অংশ (Writer Part)
                      </button>
                    </div>

                    {profileSection === "reader" ? (
                      <div className="space-y-6">
                        {currentUser && (
                          <ReaderPanel
                            profile={currentUser}
                            posts={posts}
                            authors={adminData.users}
                            onAction={handleAction}
                            onOpenCoinsModal={() => setIsCoinsOpen(true)}
                            onOpenPost={handleOpenPostReader}
                            activeTab={readerTab}
                            onTabChange={setReaderTab}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {currentUser?.role === "writer" ? (
                          <WriterPanel
                            profile={currentUser}
                            posts={posts}
                            onOpenPost={handleOpenPostReader}
                            onPublishPost={handlePublishPost}
                            onWithdrawRequest={handleWithdrawRequest}
                          />
                        ) : (() => {
                          const userApp = (adminData.writerApplications || []).find(
                            (a) => a.userId === currentUser?.uid
                          );
                          if (userApp && userApp.status === "pending") {
                            return (
                              <div className="p-8 bg-amber-50 rounded-2xl border border-amber-200 text-center max-w-lg mx-auto">
                                <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-pulse" />
                                <h3 className="text-sm font-bold text-amber-800">আবেদনটি পেন্ডিং অবস্থায় আছে</h3>
                                <p className="text-xs text-amber-600 mt-2 leading-relaxed font-sans">
                                  আপনার লেখক হওয়ার আবেদনটি সফলভাবে সাবমিট করা হয়েছে এবং অ্যাডমিন মূল্যায়নের জন্য পাঠানো হয়েছে। অনুমোদন সম্পন্ন হলে আপনার জন্য লেখক অংশটি সচল হয়ে যাবে।
                                </p>
                              </div>
                            );
                          }
                          return (
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs max-w-xl mx-auto">
                              <div className="text-center max-w-sm mx-auto mb-6">
                                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
                                  <PenTool className="w-6 h-6" />
                                </div>
                                <h2 className="text-md font-serif font-bold text-slate-800">রিড-টু-প্রিন্ট লেখক প্রোগ্রাম</h2>
                                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">আপনার অসাধারণ সাহিত্যকর্ম প্রকাশ করুন, পাঠকদের সাথে যুক্ত হোন এবং রয়্যালটি ও কয়েন আয় করুন।</p>
                              </div>

                              <form onSubmit={handleWriterApplicationSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-500 block">আপনার লেখার মূল ক্যাটাগরি</label>
                                  <select
                                    value={appCategory}
                                    onChange={(e) => setAppCategory(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-hidden text-slate-700 font-bold"
                                  >
                                    <option value="গল্প ও উপন্যাস">গল্প ও উপন্যাস (Fiction)</option>
                                    <option value="কবিতা ও আবৃত্তি">কবিতা ও আবৃত্তি (Poetry)</option>
                                    <option value="প্রবন্ধ ও কলাম">প্রবন্ধ ও কলাম (Essays / Columns)</option>
                                    <option value="ইতিহাস ও দর্শন">ইতিহাস ও দর্শন (History / Philosophy)</option>
                                  </select>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-500 block">কেন আপনি রিড-টু-প্রিন্টে লিখতে চান?</label>
                                  <textarea
                                    placeholder="আপনার অনুপ্রেরণা বা কিছু বাক্য লিখুন..."
                                    value={appMotivation}
                                    onChange={(e) => setAppMotivation(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 outline-hidden min-h-[80px]"
                                    required
                                  />
                                </div>

                                {/* Sample Writing 1 */}
                                <div className="space-y-3 bg-orange-50/40 p-4 rounded-xl border border-orange-100/50">
                                  <h4 className="text-xs font-bold text-orange-700">নমুনা লেখা ১ (Sample Writing 1)</h4>
                                  <div className="space-y-1.5">
                                    <input
                                      type="text"
                                      placeholder="শিরোনাম (Title)"
                                      value={sample1Title}
                                      onChange={(e) => setSample1Title(e.target.value)}
                                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 outline-hidden font-bold"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <textarea
                                      placeholder="লেখাটির মূল বিষয়বস্তু বা বিষয় (Content)..."
                                      value={sample1Content}
                                      onChange={(e) => setSample1Content(e.target.value)}
                                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 outline-hidden min-h-[120px] font-serif"
                                      required
                                    />
                                  </div>
                                </div>

                                {/* Sample Writing 2 */}
                                <div className="space-y-3 bg-orange-50/40 p-4 rounded-xl border border-orange-100/50">
                                  <h4 className="text-xs font-bold text-orange-700">নমুনা লেখা ২ (Sample Writing 2)</h4>
                                  <div className="space-y-1.5">
                                    <input
                                      type="text"
                                      placeholder="শিরোনাম (Title)"
                                      value={sample2Title}
                                      onChange={(e) => setSample2Title(e.target.value)}
                                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 outline-hidden font-bold"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <textarea
                                      placeholder="লেখাটির মূল বিষয়বস্তু বা বিষয় (Content)..."
                                      value={sample2Content}
                                      onChange={(e) => setSample2Content(e.target.value)}
                                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 outline-hidden min-h-[120px] font-serif"
                                      required
                                    />
                                  </div>
                                </div>

                                <button
                                  type="submit"
                                  className="w-full mt-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <PenTool className="w-4 h-4 shrink-0" />
                                  ২টি নমুনাসহ আবেদন জমা দিন
                                </button>
                              </form>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeNavView === "authors" ? (
              /* --- AUTHORS DIRECTORY VIEW --- */
              <div className="max-w-5xl mx-auto">
                {selectedAuthorForView ? (
                  /* Single Author articles details view */
                  <div>
                    <button
                      onClick={() => setSelectedAuthorForView(null)}
                      className="mb-6 py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      সকল লেখকদের তালিকায় ফিরে যান
                    </button>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs mb-6 flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-750 flex items-center justify-center font-bold text-2xl font-serif">
                        {selectedAuthorForView.displayName.substring(0,1)}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-xl font-bold font-serif text-slate-800">{selectedAuthorForView.displayName}</h2>
                        <p className="text-xs text-slate-500 mt-1 italic">"{selectedAuthorForView.bio || "লেখক সম্পর্কে অতিরিক্ত তথ্য নেই।"}"</p>
                      </div>
                      <button
                        onClick={() => handleAction("follow", undefined, selectedAuthorForView.uid)}
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentUser?.followingAuthors.includes(selectedAuthorForView.uid)
                            ? "bg-slate-100 text-slate-500 border border-slate-200"
                            : "bg-indigo-650 text-white hover:bg-indigo-700 shadow-xs"
                        }`}
                      >
                        {currentUser?.followingAuthors.includes(selectedAuthorForView.uid) ? "✓ অনুসরণ করছেন" : "ফলো করুন"}
                      </button>
                    </div>

                    <h3 className="text-base font-bold font-serif text-slate-800 mb-4">
                      {selectedAuthorForView.displayName}-এর প্রকাশিত লেখাসমূহ:
                    </h3>

                    {posts.filter(p => p.authorId === selectedAuthorForView.uid).length === 0 ? (
                      <div className="bg-white p-12 text-center text-slate-400 border border-slate-200 rounded-2xl">
                        কোনো লেখা এখনও প্রকাশিত হয়নি।
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {posts.filter(p => p.authorId === selectedAuthorForView.uid).map(post => {
                          const isBookmarked = currentUser?.bookmarkedPostIds.includes(post.id) || false;
                          const isAdded = currentUser?.printBasketPostIds.includes(post.id) || false;
                          return (
                            <div key={post.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
                              <div>
                                <h4 onClick={() => handleOpenPostReader(post)} className="text-base font-bold font-serif hover:text-indigo-600 transition-colors cursor-pointer mb-2">
                                  {post.title}
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                              </div>
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-mono">👁️ {post.viewCount} ভিউ • 🖨️ {post.addToPrintCount} প্রিন্টস</span>
                                <div className="flex gap-2">
                                  <button onClick={() => handleOpenPostReader(post)} className="py-1 px-2.5 bg-slate-50 text-slate-600 border border-slate-150 rounded-lg text-xs font-semibold">পড়ুন</button>
                                  {currentUser?.uid !== post.authorId && (
                                    <button
                                      onClick={() => handleAction("basket", post.id)}
                                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                        isAdded ? "bg-slate-800 text-white" : "bg-orange-500 text-white hover:bg-orange-600"
                                      }`}
                                    >
                                      <Printer className="w-3 h-3" />
                                      {isAdded ? "প্রিন্টেড" : "অ্যাড টু প্রিন্ট"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Author profiles directory list grid */
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-xl font-bold font-serif text-slate-800">আমাদের সম্মানিত লেখকবৃন্দ</h2>
                        <p className="text-xs text-slate-400 mt-1">লেখকদের প্রোফাইল দেখুন ও তাদের চমৎকার সৃষ্টিগুলো অনুসরণ করুন</p>
                      </div>

                      {/* Author search box */}
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="লেখক অনুসন্ধান করুন..."
                          value={authorSearchQuery}
                          onChange={(e) => setAuthorSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {adminData.users.filter(u => u.role === "writer" && u.displayName.toLowerCase().includes(authorSearchQuery.toLowerCase())).map((writer) => {
                        const isFollowing = currentUser?.followingAuthors.includes(writer.uid) || false;
                        const writerPostsCount = posts.filter(p => p.authorId === writer.uid).length;
                        return (
                          <div key={writer.uid} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-250 hover:shadow-sm transition-all flex flex-col justify-between shadow-3xs">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg font-serif uppercase shrink-0">
                                {writer.displayName.substring(0,1)}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-800 truncate font-serif">{writer.displayName}</h3>
                                <p className="text-[10px] text-slate-400 font-mono tracking-wide mt-1 uppercase">✍️ Registered Writer</p>
                              </div>
                            </div>

                            <p className="text-xs text-slate-500 line-clamp-3 mt-3 italic mb-4 leading-relaxed">
                              "{writer.bio || "কোনো বায়োগ্রাফি সেট করা নেই।"}"
                            </p>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div className="text-[10px] text-slate-400 font-mono">
                                <p className="font-bold text-indigo-600">{writerPostsCount}টি প্রবন্ধ</p>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setSelectedAuthorForView(writer)}
                                  className="py-1 px-2 text-[11px] bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"
                                >
                                  লেখাগুলো দেখুন
                                </button>
                                <button
                                  onClick={() => handleAction("follow", undefined, writer.uid)}
                                  className={`py-1 px-2.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                                    isFollowing ? "bg-slate-100 text-slate-500 border border-slate-200" : "bg-indigo-600 text-white hover:bg-indigo-700"
                                  }`}
                                >
                                  {isFollowing ? "✓ ফলো করছেন" : "ফলো"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : activeNavView === "basket" ? (
              /* --- MY BASKET / SIMULATED PHYSICAL PRINTER VIEW --- */
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-orange-500" />
                      <div>
                        <h2 className="text-lg font-bold font-serif text-slate-800">আমার প্রিন্টিং বাস্কেট (Print Basket)</h2>
                        <p className="text-xs text-slate-400">আপনার বাস্কেটে থাকা লেখাগুলো ফিজিক্যাল প্রিন্ট করুন</p>
                      </div>
                    </div>
                    <span className="bg-orange-100 text-orange-700 font-mono font-bold text-xs px-3 py-1 rounded-full">
                      {currentUser?.printBasketPostIds.length || 0} টি লেখা
                    </span>
                  </div>

                  {printingState !== "idle" ? (
                    /* Printer Live Simulation Stream */
                    <div className="p-8 text-center bg-slate-900 text-slate-100 font-mono min-h-[400px] flex flex-col justify-between rounded-b-3xl">
                      <div className="border border-slate-700 p-4 rounded-xl bg-slate-950 max-w-xl mx-auto w-full text-left">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs font-bold text-slate-300 tracking-wider uppercase font-mono">LOCAL SYSTEM PRINTER CONNECTED</span>
                        </div>
                        <div className="space-y-1.5 text-xs text-emerald-400 max-h-[180px] overflow-y-auto font-mono">
                          <p className="text-slate-500">[{new Date().toLocaleTimeString()}] Establishing print protocol...</p>
                          {printProgress >= 15 && <p>✔ [PROTOCOL] Core page-dimensions validated.</p>}
                          {printProgress >= 35 && <p className="text-yellow-400">▶ Loading high-gloss A4 premium ivory papers...</p>}
                          {printProgress >= 50 && <p>✔ [FEEDER] Loaded 80gsm sheets securely.</p>}
                          {printProgress >= 65 && <p className="text-indigo-400 font-bold">▶ Core thermal ink-jet nozzle calibrating...</p>}
                          {printProgress >= 80 && <p className="text-emerald-300 animate-pulse">▶ Printing: Page 1/3... Formatting margins... Done.</p>}
                          {printProgress >= 95 && <p className="text-emerald-300 animate-pulse">▶ Printing: Page 2/3... Binding booklet adhesive... Done.</p>}
                          {printProgress === 100 && <p className="text-slate-200">✔ [SYSTEM] Booklet generated. Output tray unlocked.</p>}
                        </div>
                      </div>

                      {/* Progress meter */}
                      <div className="max-w-md mx-auto w-full space-y-4 my-6">
                        <div className="flex justify-between items-center text-xs font-bold font-mono">
                          <span className="text-orange-400 uppercase tracking-widest">
                            {printingState === "processing" ? "কাগজ প্রক্রিয়াকরণ..." : printingState === "paper" ? "মুদ্রণযোগ্য উপাদান লোড হচ্ছে..." : printingState === "printing" ? "মুদ্রণ ও বাইন্ডিং চলছে..." : "সম্পূর্ণ হয়েছে!"}
                          </span>
                          <span>{printProgress}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                          <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300 rounded-full" style={{ width: `${printProgress}%` }} />
                        </div>
                      </div>

                      {/* Printed receipt summary */}
                      {printingState === "success" && printedReceipt && (
                        <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200 max-w-md mx-auto w-full text-left shadow-lg">
                          <div className="text-center pb-4 border-b border-dashed border-slate-300">
                            <h3 className="font-serif font-bold text-base tracking-tight text-slate-800">READ-TO-PRINT INVOICE</h3>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">Receipt ID: {printedReceipt.receiptId}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{printedReceipt.timestamp}</p>
                          </div>
                          <div className="py-4 space-y-2 text-xs">
                            <p className="font-bold text-slate-500">মুদ্রিত উপাদানসমূহ:</p>
                            {printedReceipt.items.map((it: any, index: number) => (
                              <div key={index} className="flex justify-between gap-2">
                                <span className="truncate max-w-[200px]">{it.title}</span>
                                <span className="font-mono text-slate-500 shrink-0">{it.priceCoins} CC</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-3 border-t border-dashed border-slate-300 flex justify-between items-center text-xs font-bold font-mono">
                            <span>মোট খরচের কয়েন:</span>
                            <span className="text-orange-600">{printedReceipt.totalCoins} CC</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-4 leading-relaxed text-center">
                            * বইয়ের প্রিন্ট কপি সফলভাবে জেনারেট হয়েছে। এই বিলিং রিসিপ্টটি আপনার অফলাইন ডায়েরিতে সংরক্ষিত রয়েছে।
                          </p>
                          <button
                            onClick={() => {
                              setPrintingState("idle");
                              setPrintedReceipt(null);
                            }}
                            className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                          >
                            ড্যাশবোর্ডে ফিরে যান
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Default Basket list view */
                    <div className="p-6">
                      {posts.filter(p => currentUser?.printBasketPostIds.includes(p.id)).length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-8 h-8 text-slate-300" />
                          </div>
                          <h3 className="font-serif font-bold text-slate-700 text-base">আপনার বাস্কেটটি সম্পূর্ণ খালি</h3>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">হোমপেজে গিয়ে আপনার পছন্দের লেখাগুলো বাস্কেটে যোগ করুন ফিজিক্যাল প্রিন্ট নেওয়ার উদ্দেশ্যে।</p>
                          <button
                            onClick={() => setActiveNavView("home")}
                            className="mt-6 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            হোম পেজে লেখা খুঁজুন
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          {/* Basket items stack */}
                          <div className="lg:col-span-7 space-y-3">
                            {posts.filter(p => currentUser?.printBasketPostIds.includes(p.id)).map(post => (
                              <div key={post.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center gap-4 hover:border-orange-200 transition-colors">
                                <div className="min-w-0">
                                  <h4 onClick={() => handleOpenPostReader(post)} className="font-bold text-slate-800 truncate font-serif text-sm cursor-pointer hover:text-orange-600">{post.title}</h4>
                                  <p className="text-[10px] text-slate-400 mt-1">লেখক: {post.authorName}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">{post.priceCoins} CC</span>
                                  <button
                                    onClick={() => handleAction("basket", post.id)}
                                    className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                    title="রিমুভ করুন"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Summary checkout panel */}
                          <div className="lg:col-span-5 bg-slate-50 border border-slate-150 p-6 rounded-2xl">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">অর্ডার সারাংশ (Order Summary)</h3>
                            <div className="space-y-3 text-xs mb-6 font-mono">
                              <div className="flex justify-between text-slate-500">
                                <span>মোট নির্বাচিত লেখা:</span>
                                <span>{posts.filter(p => currentUser?.printBasketPostIds.includes(p.id)).length} টি</span>
                              </div>
                              <div className="flex justify-between text-slate-500">
                                <span>শিপিং চার্জ:</span>
                                <span className="text-emerald-600 font-bold">ফ্রি (Promo Active)</span>
                              </div>
                              <div className="h-px bg-slate-200 my-2" />
                              <div className="flex justify-between text-slate-700 font-bold text-sm">
                                <span>প্রয়োজনীয় কয়েন:</span>
                                <span className="text-orange-600 font-bold font-mono">
                                  {posts.filter(p => currentUser?.printBasketPostIds.includes(p.id)).reduce((a, b) => a + b.priceCoins, 0)} CC
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-400 text-[10px]">
                                <span>সমানুপাতিক টাকা:</span>
                                <span className="font-mono">৳ {posts.filter(p => currentUser?.printBasketPostIds.includes(p.id)).reduce((a, b) => a + b.priceMoney, 0)}</span>
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                const totalCoins = posts.filter(p => currentUser?.printBasketPostIds.includes(p.id)).reduce((a, b) => a + b.priceCoins, 0);
                                if (currentUser!.coins < totalCoins) {
                                  alert("দুঃখিত! আপনার ওয়ালেটে পর্যাপ্ত কয়েন নেই। অনুগ্রহ করে কয়েন রিচার্জ করুন।");
                                  setActiveNavView("balance");
                                  return;
                                }

                                // Trigger Printer simulation progress
                                setPrintingState("processing");
                                setPrintProgress(0);
                                
                                let progressVal = 0;
                                const interval = setInterval(() => {
                                  progressVal += 10;
                                  if (progressVal <= 25) {
                                    setPrintingState("processing");
                                  } else if (progressVal <= 50) {
                                    setPrintingState("paper");
                                  } else if (progressVal <= 90) {
                                    setPrintingState("printing");
                                  }
                                  
                                  setPrintProgress(Math.min(100, progressVal));
                                  
                                  if (progressVal >= 100) {
                                    clearInterval(interval);
                                    setPrintingState("success");
                                    
                                    // Generate print invoice details
                                    const itemsPrinted = posts.filter(p => currentUser?.printBasketPostIds.includes(p.id));
                                    setPrintedReceipt({
                                      receiptId: "RTPI-" + Math.floor(Math.random() * 900000 + 100000),
                                      timestamp: new Date().toLocaleString("bn-BD"),
                                      items: itemsPrinted,
                                      totalCoins: totalCoins
                                    });

                                    // Deduct coins & Sync backend
                                    fetch(`/api/users/${currentUser!.uid}/action`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ actionType: "checkout_basket" })
                                    }).then(res => res.json()).then(data => {
                                      if (data.success) {
                                        // Update local session
                                        const updatedUser = { ...currentUser!, coins: currentUser!.coins - totalCoins, printBasketPostIds: [] };
                                        setCurrentUser(updatedUser);
                                        fetchAdminData();
                                      }
                                    });
                                  }
                                }, 500);
                              }}
                              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Printer className="w-4 h-4" />
                              মুদ্রণ নিশ্চিত করুন ও সরাসরি প্রিন্ট করুন
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : activeNavView === "balance" ? (
              /* --- WALLET & COIN STORE VIEW --- */
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Wallet Cards & Instant Store */}
                  <div className="md:col-span-7 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                      <h3 className="text-sm font-bold text-slate-700 font-serif mb-4 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-violet-500" />
                        আমার কয়েন ওয়ালেট
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-tr from-orange-500 to-amber-500 text-white p-5 rounded-2xl relative overflow-hidden shadow-xs">
                          <Coins className="w-12 h-12 absolute -right-3 -bottom-3 opacity-20" />
                          <p className="text-[10px] uppercase font-bold opacity-80 leading-none">বর্তমান কয়েন</p>
                          <p className="text-2xl font-black font-mono mt-2">{currentUser?.coins} CC</p>
                          <p className="text-[9px] opacity-75 mt-1.5">১ কয়েন = ২ টাকা</p>
                        </div>
                        
                        <div className="bg-gradient-to-tr from-purple-600 to-indigo-600 text-white p-5 rounded-2xl relative overflow-hidden shadow-xs">
                          <Wallet className="w-12 h-12 absolute -right-3 -bottom-3 opacity-20" />
                          <p className="text-[10px] uppercase font-bold opacity-80 leading-none">ওয়ালেট ব্যালেন্স</p>
                          <p className="text-2xl font-black font-mono mt-2">৳ {currentUser?.currentBalance}</p>
                          <p className="text-[9px] opacity-75 mt-1.5 font-bold">ব্যালেন্স ও কয়েন সমন্বিত</p>
                        </div>
                      </div>
                    </div>

                    {/* Coins Purchase shop */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                      <h3 className="text-sm font-bold text-slate-700 font-serif mb-4 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-orange-500" />
                        কয়েন ক্রয় করুন (Buy CC Coins)
                      </h3>

                      {paymentGatewayState === "selecting" && selectedBundle ? (
                        /* Mobile payment gateway simulator */
                        <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-700">বিকাশ / নগদ / রকেট গেটওয়ে</span>
                            <button onClick={() => setPaymentGatewayState("idle")} className="text-xs text-slate-400 hover:text-slate-600">বাতিল</button>
                          </div>
                          <div className="text-center py-2">
                            <p className="text-[10px] text-slate-400">মোট পরিশোধ করতে হবে:</p>
                            <p className="text-xl font-bold font-mono text-purple-700">৳ {selectedBundle.price}</p>
                            <p className="text-[11px] text-slate-500 font-bold mt-1">কয়েন পাবেন: {selectedBundle.coins} CC</p>
                          </div>
                          <div className="space-y-3">
                            <input
                              type="tel"
                              placeholder="আপনার ওয়ালেট নাম্বার দিন (যেমন: 017xxxxxxxx)"
                              value={gatewayPhone}
                              onChange={(e) => setGatewayPhone(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 outline-hidden font-mono"
                            />
                            <input
                              type="password"
                              placeholder="পিন কোড দিন (যেমন: xxxx)"
                              value={gatewayPin}
                              onChange={(e) => setGatewayPin(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 outline-hidden font-mono"
                            />
                            <button
                              onClick={async () => {
                                if (!gatewayPhone || !gatewayPin) {
                                  alert("অনুগ্রহ করে মোবাইল নাম্বার এবং পিন প্রদান করুন।");
                                  return;
                                }
                                setPaymentGatewayState("paying");
                                try {
                                  const response = await fetch(`/api/users/${currentUser?.uid}/action`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      actionType: "buy_coins",
                                      amountCoins: selectedBundle.coins,
                                      amountMoney: selectedBundle.price
                                    })
                                  });
                                  if (response.ok) {
                                    const data = await response.json();
                                    setCurrentUser(data.user);
                                    setTransactions(prev => [data.transaction, ...prev]);
                                    setPaymentGatewayState("success");
                                    setGatewayPhone("");
                                    setGatewayPin("");
                                    setTimeout(() => {
                                      setPaymentGatewayState("idle");
                                    }, 3000);
                                  }
                                } catch (e) {
                                  console.error(e);
                                  alert("গেটওয়ে ত্রুটি ঘটেছে।");
                                  setPaymentGatewayState("idle");
                                }
                              }}
                              className="w-full py-2.5 bg-purple-650 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                            >
                              {paymentGatewayState === "paying" ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : "পেমেন্ট নিশ্চিত করুন"}
                            </button>
                          </div>
                        </div>
                      ) : paymentGatewayState === "success" ? (
                        <div className="bg-emerald-50 border border-emerald-150 p-6 rounded-2xl text-center space-y-2">
                          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                          <h4 className="text-sm font-bold text-emerald-800">পেমেন্ট সফল হয়েছে!</h4>
                          <p className="text-xs text-emerald-600 font-bold leading-relaxed">কয়েন ওয়ালেট সফলভাবে রিচার্জ করা হয়েছে। আপনার ব্যালেন্স আপডেট করা হয়েছে।</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {[
                            { coins: 100, price: 200, label: "স্টার্টার প্যাক" },
                            { coins: 250, price: 500, label: "পপুলার প্যাক", popular: true },
                            { coins: 600, price: 1000, label: "সুপার ভ্যালু (১০০ বোনাস!)" }
                          ].map((bundle, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedBundle(bundle);
                                setPaymentGatewayState("selecting");
                              }}
                              className={`w-full p-4 border rounded-2xl flex items-center justify-between text-left hover:bg-slate-50 transition-all cursor-pointer ${
                                bundle.popular ? "border-orange-300 bg-orange-50/20" : "border-slate-200"
                              }`}
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-700 font-mono flex items-center gap-1">
                                  {bundle.coins} Coins
                                  {bundle.popular && <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded-xs font-bold">সেরা ডিল</span>}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">{bundle.label}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-purple-700 font-mono">৳{bundle.price}</span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transaction History ledger */}
                  <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-700 font-serif mb-4 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-purple-500" />
                      লেনদেনের ইতিহাস (Transactions)
                    </h3>

                    {transactions.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">এখনও কোনো লেনদেনের ইতিহাস নেই।</p>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {transactions.map((tx) => (
                          <div key={tx.id} className="p-3 border border-slate-100 rounded-xl flex justify-between items-center bg-slate-50 text-xs">
                            <div>
                              <p className="font-bold text-slate-700 leading-none">
                                {tx.type === "buy_coins" ? "কয়েন রিচার্জ" : tx.type === "print_post" ? "প্রিন্ট বাস্কেটে খরচ" : "আর্টিকেল ক্রয়"}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono mt-1">
                                {new Date(tx.timestamp).toLocaleString("bn-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold font-mono ${tx.type === "buy_coins" ? "text-emerald-600" : "text-rose-500"}`}>
                                {tx.type === "buy_coins" ? "+" : "-"}{tx.amountCoins} Coins
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">৳{tx.amountMoney}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : activeNavView === "writer-panel" ? (
              /* --- REDIRECT / WRITER VIEW --- */
              <div className="max-w-3xl mx-auto">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-xs">
                  <PenTool className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">আপনাকে প্রোফাইলের লেখক অংশে নিয়ে যাওয়া হচ্ছে...</p>
                  <button 
                    onClick={() => {
                      setActiveNavView("profile");
                      setProfileSection("writer");
                    }}
                    className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
                  >
                    এখানে ক্লিক করুন
                  </button>
                </div>
              </div>
            ) : (
              /* --- ADMIN PANEL VIEW --- */
              <div className="max-w-6xl mx-auto">
                <AdminPanel
                  profile={currentUser!}
                  adminData={adminData}
                  posts={posts}
                  onApproveWithdraw={handleApproveWithdraw}
                  onApproveApplication={handleApproveApplication}
                  onRefreshAdminData={fetchAdminData}
                  onRefreshPosts={fetchPosts}
                />
              </div>
            )}
          </main>

          {/* FOOTER */}
          <footer className="mt-16 bg-white border-t border-slate-100 py-8 shrink-0 text-slate-400 text-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="font-bold text-slate-600 font-serif">Read-to-Print Engine v1.0</p>
                <p className="text-[10px] text-slate-400 mt-1">© 2026 Read-to-Print. সর্বস্বত্ব সংরক্ষিত।</p>
              </div>
              <div className="flex gap-4 font-medium text-[10px]">
                <a href="#" className="hover:text-brand-purple-600 transition-colors">ব্যবহারের শর্তাবলী</a>
                <a href="#" className="hover:text-brand-purple-600 transition-colors">গোপনীয়তা নীতি</a>
                <a href="#" className="hover:text-brand-purple-600 transition-colors">যোগাযোগ</a>
              </div>
            </div>
          </footer>

        </div>
      </div>

      {/* MODALS */}

      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {isCoinsOpen && currentUser && (
        <CoinsModal
          isOpen={isCoinsOpen}
          onClose={() => setIsCoinsOpen(false)}
          profile={currentUser}
          transactions={transactions}
          onUpdateProfile={setCurrentUser}
          onRefreshTransactions={() => fetchTransactions(currentUser.uid)}
        />
      )}

      {selectedPost && (
        <PostReaderModal
          post={selectedPost}
          profile={currentUser}
          onClose={() => setSelectedPost(null)}
          onAction={handleAction}
          onEditPost={handleEditPost}
        />
      )}

    </div>
  );
}
