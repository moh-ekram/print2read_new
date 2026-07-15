/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { UserProfile, Post, CoinTransaction, UserRole, Order } from "./types";
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
  approveWriterApplicationInFirestore,
  createOrderInFirestore,
  updateOrderStatusInFirestore,
  fetchUserOrdersFromFirestore
} from "./lib/firestoreService";
import CoinsModal from "./components/CoinsModal";
import ReaderPanel from "./components/ReaderPanel";
import WriterPanel from "./components/WriterPanel";
import AdminPanel from "./components/AdminPanel";
import PostReaderModal from "./components/PostReaderModal";
import FacebookPostBox from "./components/FacebookPostBox";
import PdfPreviewModal from "./components/PdfPreviewModal";
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
  RefreshCw,
  Bookmark,
  Layers
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

  // Read-to-Print Checkout & Orders states
  const [orders, setOrders] = useState<Order[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<"idle" | "form" | "payment" | "processing" | "success">("idle");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("Dhaka");
  const [bookTitle, setBookTitle] = useState("");
  const [checkoutOtp, setCheckoutOtp] = useState("");
  const [checkoutPin, setCheckoutPin] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"bKash" | "Nagad" | "Rocket" | "COD">("bKash");
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewCurrentPage, setPdfPreviewCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "prints">("recent");

  // Load and sync orders initially
  useEffect(() => {
    const savedOrders = localStorage.getItem("r2p_orders");
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders));
      } catch (e) {
        console.error("Failed to parse saved orders", e);
      }
    }
  }, []);

  // Update default customer name and book title based on current user
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.displayName || "");
      setBookTitle((currentUser.displayName || "আমার") + "-এর সংকলন");
    }
  }, [currentUser]);

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
          if (updatedProfile.role === "admin") {
            fetchAdminData(updatedProfile);
          } else {
            fetchUserOrders(updatedProfile.uid);
          }
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
          if (profile.role === "admin") {
            fetchAdminData(profile);
          } else {
            fetchUserOrders(profile.uid);
          }
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

  const fetchUserOrders = async (uid: string) => {
    try {
      if (isFirebaseConfigured) {
        const data = await fetchUserOrdersFromFirestore(uid);
        setOrders(data);
        localStorage.setItem("r2p_orders", JSON.stringify(data));
      } else {
        const response = await fetch(`/api/orders/${uid}`);
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
          localStorage.setItem("r2p_orders", JSON.stringify(data));
        }
      }
    } catch (e) {
      console.error("Failed to fetch user orders", e);
    }
  };

  const fetchAdminData = async (forceProfile?: UserProfile) => {
    const userToCheck = forceProfile || currentUser;
    if (!userToCheck || userToCheck.role !== "admin") return;
    try {
      if (isFirebaseConfigured) {
        const data = await fetchAdminDataFromFirestore();
        setAdminData(data as any);
        if (data && (data as any).orders) {
          setOrders((data as any).orders);
          localStorage.setItem("r2p_orders", JSON.stringify((data as any).orders));
        }
      } else {
        const response = await fetch("/api/admin/data");
        if (response.ok) {
          const data = await response.json();
          setAdminData(data);
          if (data && data.orders) {
            setOrders(data.orders);
            localStorage.setItem("r2p_orders", JSON.stringify(data.orders));
          }
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
    if (updatedProfile.role === "admin") {
      fetchAdminData(updatedProfile);
    } else {
      fetchUserOrders(updatedProfile.uid);
    }
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
          if (currentUser.role === "admin") {
            fetchAdminData();
          } else {
            fetchUserOrders(currentUser.uid);
          }

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
          if (currentUser.role === "admin") {
            fetchAdminData();
          } else {
            fetchUserOrders(currentUser.uid);
          }

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
          alert("আপনাদের লেখাটি সফলভাবে প্রকাশিত হয়েছে!");
          fetchPosts();
          if (currentUser.role === "admin") {
            fetchAdminData();
          } else {
            fetchUserOrders(currentUser.uid);
          }
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
          if (currentUser.role === "admin") {
            fetchAdminData();
          } else {
            fetchUserOrders(currentUser.uid);
          }
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
          if (currentUser.role === "admin") {
            fetchAdminData();
          } else {
            fetchUserOrders(currentUser.uid);
          }
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
          if (currentUser.role === "admin") {
            fetchAdminData();
          } else {
            fetchUserOrders(currentUser.uid);
          }
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
        if (currentUser.role === "admin") {
          await fetchAdminData();
        } else {
          await fetchUserOrders(currentUser.uid);
        }
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
        if (data.user.role === "admin") {
          fetchAdminData();
        } else {
          fetchUserOrders(data.user.uid);
        }
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

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      if (isFirebaseConfigured) {
        await updateOrderStatusInFirestore(orderId, newStatus);
        fetchAdminData();
      } else {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ printingStatus: newStatus })
        });
        if (response.ok) {
          fetchAdminData();
        } else {
          alert("স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।");
        }
      }
    } catch (e) {
      console.error(e);
      alert("অর্ডার স্ট্যাটাস আপডেট করার সময় ত্রুটি ঘটেছে।");
    }
  };

  const handlePlaceOrder = async () => {
    if (!currentUser) return;
    try {
      const basketPosts = posts.filter(p => (currentUser?.printBasketPostIds || []).includes(p.id));
      if (basketPosts.length === 0) return;

      let currentStartPage = 3;
      const bookArticles = basketPosts.map((post) => {
        const wordCount = post.content ? post.content.split(/\s+/).filter(Boolean).length : 200;
        const pagesNeeded = Math.ceil(wordCount / 200);
        const startPage = currentStartPage;
        const endPage = currentStartPage + pagesNeeded - 1;
        currentStartPage = endPage + 1;
        return {
          id: post.id,
          title: post.title,
          pagesNeeded,
          startPage,
          endPage
        };
      });

      const subtotalPages = bookArticles.reduce((sum, p) => sum + p.pagesNeeded, 0);
      const totalPages = subtotalPages + 2;
      const pageCost = totalPages * 1.5;
      const bindingCost = 20;
      const deliveryCost = customerCity === "Dhaka" ? 60 : 120;
      const totalPrice = pageCost + bindingCost + deliveryCost;

      const orderId = "R2P-" + Math.floor(Math.random() * 900000 + 100000);
      const newOrder: Order = {
        id: orderId,
        userId: currentUser.uid,
        customerName,
        customerPhone,
        customerAddress,
        customerCity,
        bookName: bookTitle || "আমার সংকলন",
        articleTitles: basketPosts.map(p => p.title),
        totalPages,
        totalPrice,
        paymentStatus: selectedPaymentMethod === "COD" ? "Unpaid" : "Paid",
        paymentMethod: selectedPaymentMethod,
        printingStatus: "Received",
        timestamp: new Date().toISOString()
      };

      if (isFirebaseConfigured) {
        await createOrderInFirestore(newOrder);
        await handleUserActionInFirestore(currentUser.uid, "checkout_basket", {});
      } else {
        const orderRes = await fetch("/api/admin/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newOrder)
        });
        if (!orderRes.ok) {
          const errData = await orderRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `সার্ভার অর্ডার তৈরি করতে পারেনি (স্ট্যাটাস: ${orderRes.status})`);
        }

        const actionRes = await fetch(`/api/users/${currentUser.uid}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionType: "checkout_basket" })
        });
        if (!actionRes.ok) {
          const errData = await actionRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `সার্ভার ইউজার অ্যাকশন সম্পন্ন করতে পারেনি (স্ট্যাটাস: ${actionRes.status})`);
        }
      }

      const updatedUser = { ...currentUser, printBasketPostIds: [] };
      setCurrentUser(updatedUser);

      const updatedOrders = [newOrder, ...orders];
      setOrders(updatedOrders);
      localStorage.setItem("r2p_orders", JSON.stringify(updatedOrders));

      setPlacedOrder(newOrder);
      setCheckoutStep("success");
      
      if (currentUser.role === "admin") {
        fetchAdminData();
      } else {
        fetchUserOrders(currentUser.uid);
      }
    } catch (e: any) {
      console.error("Order processing error", e);
      let errorMsg = e instanceof Error ? e.message : String(e);
      
      // Try to parse Firestore error if serialized as JSON
      try {
        if (errorMsg.startsWith("{") && errorMsg.endsWith("}")) {
          const parsed = JSON.parse(errorMsg);
          if (parsed.error) {
            errorMsg = parsed.error;
          }
        }
      } catch (parseErr) {
        // Ignore
      }

      alert(`অর্ডার সম্পন্ন করতে সমস্যা হয়েছে।\n\nত্রুটি (Error): ${errorMsg}\n\nদয়া করে পুনরায় চেষ্টা করুন বা সাহায্য চাইতে পারেন।`);
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

  const getPostCategory = (post: Post) => {
    const text = (post.title + " " + post.content + " " + post.excerpt).toLowerCase();
    if (text.includes("প্রযুক্তি") || text.includes("ডিজিটাল") || text.includes("এআই") || text.includes("কম্পিউটার") || text.includes("প্রিন্ট")) {
      return "technology";
    }
    if (text.includes("সোনার তরী") || text.includes("রবীন্দ্রনাথ") || text.includes("কাব্য") || text.includes("কবিতা") || text.includes("সাহিত্য") || text.includes("কাব্যিক")) {
      return "literature";
    }
    if (text.includes("ইতিহাস") || text.includes("ঐতিহ্য") || text.includes("দর্শন") || text.includes("সমাজ") || text.includes("প্রবন্ধ")) {
      return "essay";
    }
    return "other";
  };

  const filteredPosts = posts
    .filter((post) => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || getPostCategory(post) === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "popular") {
        return b.viewCount - a.viewCount;
      }
      if (sortBy === "prints") {
        return b.addToPrintCount - a.addToPrintCount;
      }
      // default: recent
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA || b.id.localeCompare(a.id);
    });

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

  const basketPosts = posts.filter(p => currentUser?.printBasketPostIds.includes(p.id));
  let currentStartPage = 3;
  const bookArticles = basketPosts.map((post) => {
    const wordCount = post.content ? post.content.split(/\s+/).filter(Boolean).length : 200;
    const pagesNeeded = Math.ceil(wordCount / 200);
    const startPage = currentStartPage;
    const endPage = currentStartPage + pagesNeeded - 1;
    currentStartPage = endPage + 1;
    return {
      id: post.id,
      title: post.title,
      authorName: post.authorName,
      wordCount,
      pagesNeeded,
      startPage,
      endPage
    };
  });
  const subtotalPages = bookArticles.reduce((sum, p) => sum + p.pagesNeeded, 0);
  const totalPages = basketPosts.length > 0 ? (subtotalPages + 2) : 0;
  const pageCost = totalPages * 1.5;
  const bindingCost = basketPosts.length > 0 ? 20 : 0;
  const deliveryCost = customerCity === "Dhaka" ? 60 : 120;
  const totalPrice = pageCost + bindingCost + deliveryCost;

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

                    {/* Category Filter Pills and Sort Toggle */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
                      {/* Left: Category pills */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "all", label: "সকল লেখা", emoji: "📚" },
                          { id: "literature", label: "কাব্য ও সাহিত্য", emoji: "✨" },
                          { id: "technology", label: "প্রযুক্তি ও বিবর্তন", emoji: "🔌" },
                          { id: "essay", label: "চিন্তা ও দর্শন", emoji: "💭" },
                          { id: "other", label: "অন্যান্য রচনা", emoji: "🖋️" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                              selectedCategory === cat.id
                                ? "bg-brand-deep-teal/10 text-brand-deep-teal border-brand-deep-teal/30 shadow-2xs font-bold"
                                : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100 hover:text-slate-700"
                            }`}
                          >
                            <span>{cat.emoji}</span>
                            <span>{cat.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Right: Sort controls */}
                      <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                        <span className="text-[11px] text-slate-400 font-medium">সাজান:</span>
                        <div className="bg-slate-100/80 p-0.5 rounded-xl border border-slate-150 flex items-center">
                          {[
                            { id: "recent", label: "সর্বশেষ" },
                            { id: "popular", label: "জনপ্রিয়" },
                            { id: "prints", label: "বেশি মুদ্রিত" },
                          ].map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setSortBy(option.id as any)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                sortBy === option.id
                                  ? "bg-white text-slate-800 shadow-3xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
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
                      <div className="flex flex-col gap-6">
                        {filteredPosts.map((post, index) => {
                          const isBookmarked = currentUser?.bookmarkedPostIds.includes(post.id) || false;
                          const isAdded = currentUser?.printBasketPostIds.includes(post.id) || false;
                          
                          // Calculate reading time
                          const wordsCount = post.content ? post.content.trim().split(/\s+/).length : 0;
                          const readTime = Math.max(1, Math.ceil(wordsCount / 120));

                          const numbersBengali = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
                          const toBengaliNumber = (num: number) => num.toString().split("").map(digit => numbersBengali[parseInt(digit)] || digit).join("");

                          // Helper function for beautiful Bengali dates inside component
                          const formatBengaliDate = (isoString: string) => {
                            if (!isoString) return "সম্প্রতি";
                            try {
                              const date = new Date(isoString);
                              const months = [
                                "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
                                "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
                              ];
                              
                              const day = toBengaliNumber(date.getDate());
                              const month = months[date.getMonth()];
                              const year = toBengaliNumber(date.getFullYear());
                              return `${day} ${month}, ${year}`;
                            } catch {
                              return "কিছুক্ষণ আগে";
                            }
                          };

                          const getPostTags = (p: Post) => {
                            const text = (p.title + " " + p.content + " " + p.excerpt).toLowerCase();
                            const tags: string[] = [];
                            
                            // Check for science / astrophysics keywords
                            if (text.includes("মহাবিশ্ব") || text.includes("কৃষ্ণগহ্বর") || text.includes("ব্ল্যাক হোল") || text.includes("নক্ষত্র") || text.includes("বিজ্ঞান") || text.includes("জ্যোতির্বিজ্ঞান") || text.includes("মহাকর্ষ")) {
                              tags.push("বিজ্ঞান");
                              tags.push("জ্যোতির্বিজ্ঞান");
                            } else if (text.includes("প্রযুক্তি") || text.includes("ডিজিটাল") || text.includes("এআই") || text.includes("কম্পিউটার")) {
                              tags.push("প্রযুক্তি");
                              tags.push("ডিজিটাল");
                            } else if (text.includes("কবিতা") || text.includes("কাব্য") || text.includes("সাহিত্য") || text.includes("রবীন্দ্রনাথ")) {
                              tags.push("কাব্য");
                              tags.push("সাহিত্য");
                            } else if (text.includes("ইতিহাস") || text.includes("ঐতিহ্য")) {
                              tags.push("ইতিহাস");
                              tags.push("ঐতিহ্য");
                            } else if (text.includes("দর্শন") || text.includes("চিন্তা") || text.includes("সমাজ")) {
                              tags.push("দর্শন");
                              tags.push("সমাজ");
                            } else {
                              const cat = getPostCategory(p);
                              if (cat === "literature") {
                                tags.push("কাব্য", "সাহিত্য");
                              } else if (cat === "technology") {
                                tags.push("প্রযুক্তি", "বিজ্ঞান");
                              } else if (cat === "essay") {
                                tags.push("প্রবন্ধ", "দর্শন");
                              } else {
                                tags.push("রচনা", "অন্যান্য");
                              }
                            }
                            return tags;
                          };

                          const getAuthorAvatar = (authorName: string, authorId: string) => {
                            if (authorName === "রবীন্দ্রনাথ দত্ত" || authorName.includes("রবীন্দ্রনাথ")) {
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

                          const tags = getPostTags(post);

                          return (
                            <motion.article 
                              key={post.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25) }}
                              className="bg-[#F5F4F0]/85 border border-[#E8E6DE]/80 rounded-[24px] p-6 md:p-8 flex flex-col justify-between hover:bg-[#F2F0EB]/95 hover:border-[#DFDDD5] hover:shadow-xs transition-all duration-300 relative group"
                            >
                              <div>
                                {/* Top Row of the card */}
                                <div className="flex items-center justify-between gap-4 mb-4">
                                  {/* Left side: Tags */}
                                  <div className="flex items-center gap-2.5">
                                    {tags.map((tag, idx) => (
                                      <span 
                                        key={idx}
                                        className={`text-xs font-bold font-serif transition-colors ${
                                          idx === 0 
                                            ? "bg-[#EAE8E0] text-[#334155] px-3.5 py-1.5 rounded-xl shadow-3xs" 
                                            : "text-slate-500 font-medium hover:text-slate-800"
                                        }`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Right side: Coin Price, Bookmark, and Layers icons */}
                                  <div className="flex items-center gap-3">
                                    {/* Golden Coin Price badge */}
                                    <div className="bg-[#FFFDF2] border border-[#FFE7A3] rounded-xl px-3 py-1 flex items-center gap-2 text-[#C27803] font-bold text-xs shadow-3xs hover:scale-105 transition-transform">
                                      <div className="w-4 h-4 bg-gradient-to-tr from-[#FFB800] to-[#FFE500] rounded-full border border-[#D48806]/35 flex items-center justify-center text-[9px] text-white shadow-3xs select-none">
                                        🪙
                                      </div>
                                      <span className="font-mono">{toBengaliNumber(post.priceCoins)}</span>
                                    </div>

                                    {/* Bookmark Ribbon */}
                                    {currentUser && (
                                      <button
                                        id={`toggle-bookmark-feed-${post.id}`}
                                        onClick={() => handleAction("bookmark", post.id)}
                                        className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center border hover:scale-105 ${
                                          isBookmarked 
                                            ? "bg-indigo-50 border-indigo-100 text-indigo-600" 
                                            : "bg-white/80 border-[#E8E6DE]/70 text-slate-400 hover:text-slate-600 hover:bg-white"
                                        }`}
                                        title={isBookmarked ? "বুকমার্ক থেকে সরান" : "বুকমার্ক করুন"}
                                      >
                                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current text-indigo-600" : ""}`} />
                                      </button>
                                    )}

                                    {/* Layers Stack Icon */}
                                    <button 
                                      className="p-2 rounded-xl transition-all border bg-white/80 border-[#E8E6DE]/70 text-slate-400 hover:text-slate-600 hover:bg-white hover:scale-105"
                                      title={`${toBengaliNumber(readTime)} পৃষ্ঠা`}
                                    >
                                      <Layers className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Title - "মহাবিশ্বের রহস্য ও কৃষ্ণগহ্বর" */}
                                <h4 
                                  id={`feed-post-title-click-${post.id}`}
                                  onClick={() => handleOpenPostReader(post)}
                                  className="text-xl md:text-2xl font-bold font-serif text-[#3B4FE4] hover:text-[#1D4ED8] transition-colors duration-300 cursor-pointer leading-snug tracking-tight mb-3 animate-fade-in"
                                >
                                  {post.title}
                                </h4>

                                {/* Author and Meta Row */}
                                <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                                  <img 
                                    src={getAuthorAvatar(post.authorName, post.authorId)} 
                                    alt={post.authorName} 
                                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#E8E6DE] shadow-3xs"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="font-bold text-slate-700 hover:text-[#3B4FE4] transition-colors">
                                    {post.authorName}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span>{toBengaliNumber(wordsCount)} শব্দ</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="flex items-center gap-1 bg-[#EAE8E0]/60 px-2.5 py-1 rounded-full text-[11px] text-[#475569] font-semibold shrink-0">
                                    <span className="text-xs">👁️</span>
                                    <span>{toBengaliNumber(post.viewCount)} বার</span>
                                  </span>
                                </div>

                                {/* Excerpt (Snippet) */}
                                <p className="text-sm text-slate-600 leading-relaxed font-sans mb-6 line-clamp-2 max-w-3xl">
                                  {post.excerpt}
                                </p>
                              </div>

                              {/* Bottom row of card actions */}
                              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#E8E6DE]/50">
                                {/* Left side: Read Full Article link */}
                                <button
                                  id={`read-post-feed-${post.id}`}
                                  onClick={() => handleOpenPostReader(post)}
                                  className="text-xs font-extrabold text-[#3B4FE4] hover:text-[#1D4ED8] transition-all flex items-center gap-1 hover:translate-x-0.5 cursor-pointer font-serif"
                                >
                                  পুরো লেখা পড়ুন <span className="text-[10px] font-sans">&gt;</span>
                                </button>

                                {/* Right side: Print Add button */}
                                {currentUser?.uid !== post.authorId && (
                                  <button
                                    id={`basket-post-feed-${post.id}`}
                                    onClick={() => handleAction("basket", post.id)}
                                    className={`py-2 px-5 rounded-full text-xs font-extrabold transition-all duration-300 flex items-center gap-2 shadow-2xs hover:shadow-xs hover:scale-102 cursor-pointer ${
                                      isAdded 
                                        ? "bg-sky-600 text-white hover:bg-sky-700" 
                                        : "bg-[#009663] text-white hover:bg-[#008254]"
                                    }`}
                                  >
                                    <Printer className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span>{isAdded ? "বাস্কেটে আছে" : "অ্যাড টু প্রিন্ট"}</span>
                                  </button>
                                )}
                              </div>
                            </motion.article>
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
                    <div className="p-6">
                      {basketPosts.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-8 h-8 text-slate-300" />
                          </div>
                          <h3 className="font-serif font-bold text-slate-700 text-base">আপনার বাস্কেটটি সম্পূর্ণ খালি</h3>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">হোমপেজে গিয়ে আপনার পছন্দের লেখাগুলো বাস্কেটে যোগ করুন ফিজিক্যাল প্রিন্ট নেওয়ার উদ্দেশ্যে।</p>
                          <button
                            onClick={() => {
                              setActiveNavView("home");
                              setCheckoutStep("idle");
                            }}
                            className="mt-6 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            হোম পেজে লেখা খুঁজুন
                          </button>
                        </div>
                      ) : checkoutStep === "idle" ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          {/* Basket items stack */}
                          <div className="lg:col-span-7 space-y-5">
                            <div className="bg-white p-5 rounded-3xl border border-slate-200">
                              <h3 className="text-sm font-bold text-slate-700 font-serif mb-4">নির্বাচিত লেখাসমূহ ({basketPosts.length} টি)</h3>
                              <div className="space-y-3">
                                {bookArticles.map((art) => (
                                  <div key={art.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center gap-4 hover:border-orange-100 transition-colors">
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-slate-800 truncate font-serif text-sm">{art.title}</h4>
                                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
                                        <span>লেখক: {art.authorName}</span>
                                        <span>•</span>
                                        <span>{art.wordCount} শব্দ</span>
                                        <span>•</span>
                                        <span className="text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded-sm">{art.pagesNeeded} পৃষ্ঠা (পৃষ্ঠা {art.startPage}-{art.endPage})</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <button
                                        onClick={() => handleAction("basket", art.id)}
                                        className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                                        title="মুছে ফেলুন"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Book Cover Live Customizer */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                              <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-700 font-serif">বইয়ের কভার ও মেটা কাস্টমাইজেশন</h3>
                                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">লাইভ প্রিভিউ</span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">বইয়ের শিরোনাম (Custom Title):</label>
                                    <input 
                                      type="text"
                                      value={bookTitle}
                                      onChange={(e) => setBookTitle(e.target.value)}
                                      placeholder="বইয়ের কাস্টম নাম দিন..."
                                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                                    />
                                  </div>
                                  <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="font-bold text-slate-600 mb-1">📖 সূচিপত্র ও পৃষ্ঠা নীতি (200 words = 1 Page):</p>
                                    <p>• পৃষ্ঠা ১: বইয়ের সুন্দর ডিজিটাল কভার পেজ।</p>
                                    <p>• পৃষ্ঠা ২: ডাইনামিক সূচিপত্র (TOC) এবং পৃষ্ঠা পরিসীমা।</p>
                                    <p>• পৃষ্ঠা ৩+: আপনার নির্বাচিত গল্প বা প্রবন্ধসমূহ।</p>
                                  </div>
                                </div>

                                {/* Beautiful Book Cover Mockup */}
                                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-center">
                                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-700 w-44 h-56 text-center flex flex-col justify-between relative overflow-hidden font-serif">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                                    <div className="space-y-1">
                                      <p className="text-[7px] tracking-widest text-amber-400 font-mono uppercase">Read-To-Print Anthology</p>
                                      <h4 className="text-[11px] font-extrabold text-slate-100 leading-tight truncate mt-1">{bookTitle || "আমার সংকলন"}</h4>
                                      <div className="w-8 h-px bg-amber-400 mx-auto my-1.5" />
                                    </div>
                                    <div className="space-y-0.5 text-[8px] text-slate-300">
                                      <p className="font-bold text-slate-200 text-[7px]">সংকলনে রয়েছেন:</p>
                                      <p className="truncate max-w-[150px] mx-auto text-[7px] text-slate-400">
                                        {basketPosts.map(p => p.authorName).filter((v, i, s) => s.indexOf(v) === i).join(", ")}
                                      </p>
                                    </div>
                                    <p className="text-[6px] text-amber-500 font-mono tracking-wider">ঢাকা সাহিত্য পরিষদ প্রেস</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Summary checkout panel */}
                          <div className="lg:col-span-5 bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-5">
                            <div>
                              <h3 className="text-sm font-bold text-slate-800 font-serif mb-3">মুদ্রণ ও ডেলিভারি হিসাব</h3>
                              <div className="space-y-2.5 text-xs font-mono text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                                <div className="flex justify-between">
                                  <span>নির্বাচিত কন্টেন্ট:</span>
                                  <span className="font-bold text-slate-800">{basketPosts.length} টি</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>কন্টেন্ট পৃষ্ঠা সংখ্যা:</span>
                                  <span className="font-bold text-slate-800">{subtotalPages} পৃষ্ঠা</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>কভার + সূচিপত্র:</span>
                                  <span className="font-bold text-slate-800">+২ পৃষ্ঠা</span>
                                </div>
                                <div className="h-px bg-slate-200 my-1" />
                                <div className="flex justify-between font-bold text-slate-700 text-xs">
                                  <span>মোট পৃষ্ঠা সংখ্যা:</span>
                                  <span className="text-indigo-600">{totalPages} পৃষ্ঠা</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>পৃষ্ঠা মূল্য (৳১.৫০/পৃষ্ঠা):</span>
                                  <span className="font-bold text-slate-800">৳ {pageCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>বাইন্ডিং চার্জ:</span>
                                  <span className="font-bold text-slate-800">৳ {bindingCost}.00</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>ডেলিভারি চার্জ:</span>
                                  <span className="font-bold text-slate-800">৳ {deliveryCost}.00</span>
                                </div>
                                <div className="h-px bg-slate-200 my-1" />
                                <div className="flex justify-between font-extrabold text-sm text-slate-800 pt-1">
                                  <span>সর্বমোট প্রদেয় বিল:</span>
                                  <span className="text-orange-600 text-sm">৳ {totalPrice.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">ডেলিভারি এরিয়া নির্বাচন করুন:</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => setCustomerCity("Dhaka")}
                                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                      customerCity === "Dhaka" 
                                        ? "bg-orange-50 border-orange-500 text-orange-700" 
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    ঢাকার ভেতরে (৳৬০)
                                  </button>
                                  <button
                                    onClick={() => setCustomerCity("Outside")}
                                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                      customerCity === "Outside" 
                                        ? "bg-orange-50 border-orange-500 text-orange-700" 
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    ঢাকার বাইরে (৳১২ো)
                                  </button>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setPdfPreviewCurrentPage(1);
                                  setIsPdfPreviewOpen(true);
                                }}
                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-200 mb-2"
                              >
                                <BookOpen className="w-4 h-4 text-indigo-600 animate-pulse" />
                                ডিজিটাল বইয়ের পিডিএফ প্রিভিউ দেখুন
                              </button>

                              <button
                                onClick={() => setCheckoutStep("form")}
                                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Printer className="w-4 h-4" />
                                ফিজিক্যাল কপি অর্ডার ও বুকিং করুন
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : checkoutStep === "form" ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          {/* Left Column: Book summary & calculations */}
                          <div className="lg:col-span-5 space-y-4">
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150">
                              <h4 className="font-serif font-bold text-slate-800 text-sm mb-3">সংকলন অর্ডার বিবরণী</h4>
                              <div className="space-y-2 text-xs font-mono text-slate-600">
                                <p><span className="text-slate-400">বইয়ের নাম:</span> <span className="font-bold text-slate-700">{bookTitle || "আমার সংকলন"}</span></p>
                                <p><span className="text-slate-400">মোট প্রবন্ধ:</span> <span className="font-bold text-slate-700">{basketPosts.length} টি</span></p>
                                <p><span className="text-slate-400">মোট পৃষ্ঠা:</span> <span className="font-bold text-slate-700">{totalPages} পৃষ্ঠা (A4 সাইজ)</span></p>
                                <p><span className="text-slate-400">シップিং এরিয়া:</span> <span className="font-bold text-slate-700">{customerCity === "Dhaka" ? "ঢাকার ভেতরে" : "ঢাকার বাইরে"}</span></p>
                                <div className="h-px bg-slate-200 my-2" />
                                <div className="flex justify-between text-slate-800 font-extrabold text-xs">
                                  <span>সর্বমোট পরিশোধযোগ্য:</span>
                                  <span className="text-orange-600">৳ {totalPrice.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setCheckoutStep("idle")}
                              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                            >
                              ← পূর্ববর্তী ধাপে ফিরে যান
                            </button>
                          </div>

                          {/* Right Column: Address Form */}
                          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 font-serif border-b pb-3">শিপিং ও ডেলিভারি তথ্য প্রদান করুন</h3>
                            
                            <div className="space-y-3.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">গ্রাহকের পুরো নাম (Customer Name):</label>
                                <input 
                                  type="text"
                                  value={customerName}
                                  onChange={(e) => setCustomerName(e.target.value)}
                                  placeholder="আপনার নাম লিখুন..."
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">মোবাইল নাম্বার (Mobile Number):</label>
                                <input 
                                  type="tel"
                                  value={customerPhone}
                                  onChange={(e) => setCustomerPhone(e.target.value)}
                                  placeholder="যেমন: 017XXXXXXXX"
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">পূর্ণাঙ্গ ডেলিভারি ঠিকানা (Detailed Delivery Address):</label>
                                <textarea 
                                  value={customerAddress}
                                  onChange={(e) => setCustomerAddress(e.target.value)}
                                  placeholder="বাসা নং, রোড নং, এলাকা এবং জেলা উল্লেখ করুন..."
                                  rows={3}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                                />
                              </div>

                              <button
                                onClick={() => {
                                  if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
                                    alert("অনুগ্রহ করে শিপিং ফর্মের সকল তথ্য সঠিক উপায়ে পূরণ করুন।");
                                    return;
                                  }
                                  const bdPhoneRegex = new RegExp("^(?:\\+88|88)?(01[3-9]\\d{8})$");
                                  if (!bdPhoneRegex.test(customerPhone.trim())) {
                                    alert("দয়া করে সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)।");
                                    return;
                                  }
                                  setCheckoutStep("payment");
                                }}
                                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer text-center"
                              >
                                পেমেন্ট সম্পন্ন করতে এগিয়ে যান →
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : checkoutStep === "payment" ? (

                          <div className="p-6 space-y-4">
                            <label className="block text-[11px] font-bold text-slate-500 text-center">অনুগ্রহ করে আপনার পেমেন্ট গেটওয়ে বেছে নিন:</label>
                            
                            <div className="grid grid-cols-4 gap-1.5">
                              {["bKash", "Nagad", "Rocket", "COD"].map((op) => (
                                <button
                                  key={op}
                                  onClick={() => {
                                    setSelectedPaymentMethod(op as any);
                                    setIsOtpSent(false);
                                    setCheckoutOtp("");
                                    setCheckoutPin("");
                                  }}
                                  className={`py-2 px-1 text-[10px] font-black rounded-xl border text-center transition-all cursor-pointer ${
                                    selectedPaymentMethod === op ? "ring-2 ring-orange-500 border-orange-500 bg-orange-50/25" : ""
                                  } ${
                                    op === "bKash" ? "hover:bg-pink-50 hover:border-pink-500 text-pink-700 bg-white border-slate-200" :
                                    op === "Nagad" ? "hover:bg-orange-50 hover:border-orange-500 text-orange-700 bg-white border-slate-200" :
                                    op === "Rocket" ? "hover:bg-purple-50 hover:border-purple-500 text-purple-700 bg-white border-slate-200" :
                                    "hover:bg-emerald-50 hover:border-emerald-500 text-emerald-700 bg-white border-slate-200"
                                  }`}
                                >
                                  {op === "bKash" ? "বিকাশ" : op === "Nagad" ? "নগদ" : op === "Rocket" ? "রকেট" : "ক্যাশ অন"}
                                </button>
                              ))}
                            </div>

                            <div className="h-px bg-slate-200 my-2" />

                            {selectedPaymentMethod === "COD" ? (
                              <div className="space-y-4">
                                <div className="bg-emerald-50 text-emerald-800 text-xs p-4 rounded-xl border border-emerald-200 leading-normal space-y-1">
                                  <p className="font-bold flex items-center gap-1">💵 ক্যাশ অন ডেলিভারি (Cash on Delivery)</p>
                                  <p>অর্ডারটি সফলভাবে সাবমিট হওয়ার পর আমাদের রিড-টু-প্রিন্ট টিম বইটি প্রিন্ট করে ডেলিভারি করবে। পণ্য বুঝে পেয়ে ডেলিভারি ম্যানের কাছে মূল্য পরিশোধ করবেন।</p>
                                </div>

                                <button
                                  onClick={async () => {
                                    setCheckoutStep("processing");
                                    setPrintProgress(0);

                                    let prog = 0;
                                    const interval = setInterval(async () => {
                                      prog += 20;
                                      setPrintProgress(Math.min(100, prog));
                                      if (prog >= 100) {
                                        clearInterval(interval);
                                        await handlePlaceOrder();
                                      }
                                    }, 300);
                                  }}
                                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  অর্ডার নিশ্চিত করুন (ক্যাশ অন ডেলিভারি)
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3 text-xs font-mono">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">মার্চেন্ট ওয়ালেট নাম্বার:</label>
                                  <input 
                                    type="text"
                                    disabled
                                    value={
                                      selectedPaymentMethod === "bKash" ? "01847110992 (bKash Merchant)" :
                                      selectedPaymentMethod === "Nagad" ? "01847110992 (Nagad Merchant)" :
                                      "01847110992 (Rocket Merchant)"
                                    }
                                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-bold"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">আপনার পেমেন্ট মোবাইল নাম্বার:</label>
                                  <input 
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="01XXXXXXXXX"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                                  />
                                </div>

                                {!isOtpSent ? (
                                  <button
                                    onClick={() => {
                                      if (!customerPhone || customerPhone.length < 10) {
                                        alert("অনুগ্রহ করে আপনার সঠিক ওয়ালেট মোবাইল নাম্বার দিন।");
                                        return;
                                      }
                                      setIsOtpSent(true);
                                      alert("সফলতা! একটি ডেমো ওটিপি কোড (১২৩৪) আপনার মোবাইলে পাঠানো হয়েছে।");
                                    }}
                                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    OTP কোড পাঠান
                                  </button>
                                ) : (
                                  <>
                                    <div className="bg-amber-50 text-amber-800 text-[10px] p-2.5 rounded-xl border border-amber-200 leading-normal">
                                      <p className="font-bold">✓ ওটিপি কোড পাঠানো হয়েছে!</p>
                                      <p>ডেমো পারপাসে ওটিপি হিসেবে <b>১২৩৪</b> কোডটি ব্যবহার করুন।</p>
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">৪-ডিজিট ওটিপি কোড (OTP Verification):</label>
                                      <input 
                                        type="text"
                                        maxLength={4}
                                        value={checkoutOtp}
                                        onChange={(e) => setCheckoutOtp(e.target.value)}
                                        placeholder="যেমন: ১২৩৪"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs tracking-widest text-center font-bold"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">৪-ডিজিট ওয়ালেট সিক্রেট পিন (Wallet PIN):</label>
                                      <input 
                                        type="password"
                                        maxLength={4}
                                        value={checkoutPin}
                                        onChange={(e) => setCheckoutPin(e.target.value)}
                                        placeholder="••••"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs tracking-widest text-center font-bold"
                                      />
                                    </div>

                                    <button
                                      onClick={async () => {
                                        if (checkoutOtp !== "1234") {
                                          alert("ভুল ওটিপি! ডেমো ওটিপি হিসেবে '১২৩৪' প্রবেশ করান।");
                                          return;
                                        }
                                        if (!checkoutPin || checkoutPin.length < 4) {
                                          alert("অনুগ্রহ করে ৪ ডিজিটের পিন নাম্বারটি পূরণ করুন।");
                                          return;
                                        }

                                        setCheckoutStep("processing");
                                        setPrintProgress(0);

                                        let prog = 0;
                                        const interval = setInterval(async () => {
                                          prog += 20;
                                          setPrintProgress(Math.min(100, prog));
                                          if (prog >= 100) {
                                            clearInterval(interval);
                                            await handlePlaceOrder();
                                          }
                                        }, 300);
                                      }}
                                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      পেমেন্ট সম্পন্ন ও অর্ডার নিশ্চিত করুন
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                      ) : checkoutStep === "processing" ? (
                        <div className="max-w-md mx-auto p-8 text-center bg-slate-900 text-slate-100 font-mono rounded-3xl shadow-lg space-y-6">
                          <div className="border border-slate-700 p-4 rounded-2xl bg-slate-950 text-left">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                              <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">READ-TO-PRINT PRINTER PROCESSSING</span>
                            </div>
                            <div className="space-y-1.5 text-xs text-emerald-400 font-mono">
                              <p className="text-slate-500">[{new Date().toLocaleTimeString()}] Booking print parameters...</p>
                              {printProgress >= 20 && <p>✔ [INFO] Customer billing details validated.</p>}
                              {printProgress >= 40 && <p className="text-yellow-400">▶ Syncing dynamic index & page ranges...</p>}
                              {printProgress >= 60 && <p>✔ [COMPILER] Cover Page & TOC pages mapped successfully.</p>}
                              {printProgress >= 80 && <p className="text-indigo-400 font-bold">▶ Generating thermal print layout queues...</p>}
                              {printProgress === 100 && <p className="text-slate-200">✔ [SYSTEM] Print order generated in admin registry.</p>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold font-mono">
                              <span className="text-orange-400 uppercase tracking-widest">অর্ডার সাবমিট হচ্ছে...</span>
                              <span>{printProgress}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                              <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300 rounded-full" style={{ width: `${printProgress}%` }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        placedOrder && (
                          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-lg p-6 space-y-6">
                            <div className="text-center space-y-2">
                              <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                                <CheckCircle2 className="w-6 h-6" />
                              </div>
                              <h3 className="font-serif font-black text-slate-800 text-lg leading-tight">আপনার সংকলন অর্ডারটি সফল হয়েছে!</h3>
                              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">
                                আমাদের প্রিন্টিং প্রেসে আপনার অর্ডারটি বুকড হয়েছে। দ্রুতই এটি সুন্দরভাবে ফিজিক্যাল বই আকারে বাঁধাই করে আপনার ঠিকানায় পাঠানো হবে।
                              </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 md:p-5 space-y-4">
                              <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-dashed pb-4 text-xs font-mono">
                                <div>
                                  <p className="text-slate-400 text-[10px]">ORDER RECEIPT ID</p>
                                  <p className="font-black text-slate-800 text-sm mt-0.5">{placedOrder.id}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px]">ORDER TIMESTAMP</p>
                                  <p className="font-bold text-slate-700 mt-0.5">
                                    {new Date(placedOrder.timestamp).toLocaleString("bn-BD", { dateStyle: "long", timeStyle: "short" })}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">📖 বইয়ের সূচিপত্র ও পৃষ্ঠা সূচক (INDEX & CHAPTERS)</p>
                                <div className="space-y-2 font-serif text-xs bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                                  <div className="flex justify-between text-slate-400 text-[11px]">
                                    <span>কভার পেজ (Custom Cover Page)</span>
                                    <span>পৃষ্ঠা ১</span>
                                  </div>
                                  <div className="flex justify-between text-slate-400 text-[11px]">
                                    <span>সূচিপত্র পৃষ্ঠা (Table of Contents)</span>
                                    <span>পৃষ্ঠা ২</span>
                                  </div>
                                  <div className="h-px bg-slate-100 my-1" />
                                  {bookArticles.map((art, idx) => (
                                    <div key={art.id} className="flex justify-between items-center text-slate-700">
                                      <span className="font-bold truncate max-w-[280px]">{(idx + 1)}. {art.title}</span>
                                      <span className="font-mono text-[11px] text-orange-600 bg-orange-50/60 px-1.5 py-0.5 rounded-sm">পৃষ্ঠা {art.startPage} - {art.endPage}</span>
                                    </div>
                                  ))}
                                  <div className="h-px bg-slate-100 my-1" />
                                  <div className="flex justify-between font-bold text-slate-800 text-[11px] font-sans">
                                    <span>সর্বমোট বইয়ের পৃষ্ঠা:</span>
                                    <span className="text-indigo-600 font-mono">{placedOrder.totalPages} পৃষ্ঠা</span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-600">
                                <div>
                                  <p className="text-slate-400 text-[10px]">DELIVERY ADDRESS</p>
                                  <p className="font-bold text-slate-700 mt-1 leading-normal">{placedOrder.customerName}</p>
                                  <p className="text-slate-500 mt-0.5">{placedOrder.customerPhone}</p>
                                  <p className="text-slate-500 mt-0.5 leading-relaxed">{placedOrder.customerAddress}, {placedOrder.customerCity === "Dhaka" ? "ঢাকা" : "ঢাকার বাইরে"}</p>
                                </div>
                                <div className="md:text-right">
                                  <p className="text-slate-400 text-[10px]">PAYMENT SUMMARY</p>
                                  <p className="font-bold text-slate-700 mt-1">পেমেন্ট মেথড: Mobile Banking</p>
                                  <p className="text-emerald-600 font-black mt-0.5">পেমেন্ট স্ট্যাটাস: Paid</p>
                                  <p className="text-orange-600 font-black text-sm mt-1">মোট পরিশোধিত: ৳ {placedOrder.totalPrice.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  setCheckoutStep("idle");
                                  setActiveNavView("admin-panel");
                                }}
                                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer transition-all text-center flex items-center justify-center gap-1.5"
                              >
                                <BookOpen className="w-4 h-4" />
                                অর্ডার ট্র্যাকিং হাব দেখুন
                              </button>
                              <button
                                onClick={() => {
                                  setCheckoutStep("idle");
                                  setActiveNavView("home");
                                }}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all text-center"
                              >
                                আরও লেখা খুঁজুন
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
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
                  onUpdateOrderStatus={handleUpdateOrderStatus}
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

      {isPdfPreviewOpen && (
        <PdfPreviewModal
          isOpen={isPdfPreviewOpen}
          onClose={() => setIsPdfPreviewOpen(false)}
          bookTitle={bookTitle}
          basketPosts={basketPosts}
          totalPages={totalPages}
          currentPage={pdfPreviewCurrentPage}
          setCurrentPage={setPdfPreviewCurrentPage}
        />
      )}

    </div>
  );
}
