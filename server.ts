/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

const DB_FILE = path.join(process.cwd(), "db.json");

// Define Initial Seed Data
const initialData = {
  users: [
    {
      uid: "reader-1",
      email: "reader@readtoprint.com",
      displayName: "সাকিব আল হাসান (Reader)",
      role: "reader",
      coins: 450,
      currentBalance: 500, // in BDT
      bookmarkedPostIds: ["post-1", "post-3"],
      printBasketPostIds: ["post-2"],
      followingAuthors: ["writer-1"],
      bio: "বই পড়তে এবং নতুন নতুন আর্টিকেল সংগ্রহ করতে ভালোবাসি।"
    },
    {
      uid: "writer-1",
      email: "writer@readtoprint.com",
      displayName: "রবীন্দ্রনাথ ঠাকুর (Writer)",
      role: "writer",
      coins: 1200,
      currentBalance: 2450, // in BDT
      bookmarkedPostIds: ["post-2"],
      printBasketPostIds: [],
      followingAuthors: [],
      bio: "সাহিত্যিক, গবেষক এবং নতুন যুগের ডিজিটাল লেখক।"
    },
    {
      uid: "admin-1",
      email: "admin@readtoprint.com",
      displayName: "প্রশাসক (Admin)",
      role: "admin",
      coins: 10000,
      currentBalance: 50000,
      bookmarkedPostIds: [],
      printBasketPostIds: [],
      followingAuthors: [],
      bio: "Read-to-Print সিস্টেমের মূল অ্যাডমিন।"
    }
  ],
  posts: [
    {
      id: "post-1",
      title: "সোনার তরী: কাব্যিক জীবনের নতুন রূপরেখা",
      excerpt: "জীবনের স্রোতে ভেসে যাওয়া এবং শেষ পর্যন্ত সোনালী নৌকায় নিজের সৃষ্টির স্থান পাওয়ার এক অপার্থিব রূপক...",
      content: "মহাবিশ্বের সৃষ্টি ও লয়ের মাঝে মানুষের জীবন এক ক্ষণস্থায়ী তরণী। রবীন্দ্রনাথ ঠাকুরের ‘সোনার তরী’ কবিতায় আমরা দেখি মানুষ তার সারা জীবনের সাধনা ও সোনালী ফসল পরম যত্নে মহাকালের নৌকায় তুলে দেয়। কিন্তু সেই নৌকায় মানুষের নিজের স্থান হয় না। এই গভীর জীবনদর্শন আমাদের স্মরণ করিয়ে দেয় যে, মানুষের কাজ বেঁচে থাকে, মানুষ নয়। আধুনিক যুগে আমরা যখনই কিছু প্রিন্ট করি বা লিখে প্রকাশ করি, আমরা মূলত এই সোনার তরীতেই আমাদের সোনালী শস্য তুলে দিচ্ছি।",
      authorId: "writer-1",
      authorName: "রবীন্দ্রনাথ ঠাকুর (Writer)",
      viewCount: 142,
      addToPrintCount: 38,
      priceCoins: 10,
      priceMoney: 20,
      createdAt: "2026-07-01T10:00:00Z"
    },
    {
      id: "post-2",
      title: "ডিজিটাল প্রিন্ট প্রযুক্তির বিবর্তন ও আমাদের ভবিষ্যৎ",
      excerpt: "কীভাবে থ্রিডি এবং পেপার প্রিন্ট আমাদের সমাজকে বদলে দিচ্ছে এবং রিড-টু-প্রিন্ট ধারণার উৎপত্তি...",
      content: "ডিজিটাল প্রিন্ট প্রযুক্তি গত দুই দশকে অভাবনীয় পরিবর্তন এনেছে। কাগজের পাতা থেকে শুরু করে থ্রিডি বায়ো-প্রিন্টিং পর্যন্ত সবকিছুই এখন আমাদের হাতের মুঠোয়। এই ব্লগে আমরা আলোচনা করব কীভাবে পাঠক তার স্ক্রিনে পড়া একটি আর্টিকেল বা ডকুমেন্ট সরাসরি ফিজিক্যাল কপিরূপে নিজের পড়ার টেবিলে নিয়ে আসতে পারে। রিড-টু-প্রিন্ট মূলত এই দুটি জগতের একটি সংযোগ সেতু।",
      authorId: "writer-1",
      authorName: "রবীন্দ্রনাথ ঠাকুর (Writer)",
      viewCount: 98,
      addToPrintCount: 15,
      priceCoins: 15,
      priceMoney: 30,
      createdAt: "2026-07-05T14:30:00Z"
    },
    {
      id: "post-3",
      title: "কৃত্রিম বুদ্ধিমত্তা এবং বাংলা সাহিত্যের সংযোগ",
      excerpt: "বাংলা ভাষা প্রযুক্তির সাথে কতটুকু খাপ খাইয়ে নিতে পেরেছে এবং এআই রাইটিং এর সম্ভাবনা ও সীমাবদ্ধতা...",
      content: "কৃত্রিম বুদ্ধিমত্তা আজ বিশ্বজুড়ে আলোচনার শীর্ষে। আমাদের বাংলা সাহিত্যও এর বাইরে নয়। বড় ভাষার মডেলগুলো এখন চমৎকার বাংলা কবিতা ও প্রবন্ধ লিখতে পারছে। তবে সাহিত্যের মূল প্রাণ—আবেগ এবং অনুভূতি—তা কি এআই ধারণ করতে পারে? এই প্রবন্ধে আমরা যুক্তি এবং তর্কের মাধ্যমে দেখব কীভাবে একজন লেখক কৃত্রিম বুদ্ধিমত্তাকে তার সহায়ক হিসেবে ব্যবহার করতে পারেন, প্রতিযোগী হিসেবে নয়।",
      authorId: "writer-1",
      authorName: "রবীন্দ্রনাথ ঠাকুর (Writer)",
      viewCount: 220,
      addToPrintCount: 64,
      priceCoins: 5,
      priceMoney: 10,
      createdAt: "2026-07-10T08:15:00Z"
    }
  ],
  transactions: [
    {
      id: "tx-1",
      userId: "reader-1",
      type: "buy_coins",
      amountCoins: 100,
      amountMoney: 200,
      timestamp: "2026-07-11T09:00:00Z"
    },
    {
      id: "tx-2",
      userId: "reader-1",
      type: "print_post",
      amountCoins: 15,
      amountMoney: 30,
      postId: "post-2",
      postTitle: "ডিজিটাল প্রিন্ট প্রযুক্তির বিবর্তন ও আমাদের ভবিষ্যৎ",
      timestamp: "2026-07-12T11:20:00Z"
    },
    {
      id: "tx-3",
      userId: "reader-1",
      type: "read_post",
      amountCoins: 10,
      amountMoney: 20,
      postId: "post-1",
      postTitle: "সোনার তরী: কাব্যিক জীবনের নতুন রূপরেখা",
      timestamp: "2026-07-13T06:45:00Z"
    }
  ],
  withdrawRequests: [
    {
      id: "wr-1",
      userId: "writer-1",
      userEmail: "writer@readtoprint.com",
      amount: 500,
      paymentMethod: "bKash",
      accountNumber: "01712345678",
      status: "pending",
      timestamp: "2026-07-12T15:00:00Z"
    }
  ],
  globalHistory: [
    {
      id: "gh-1",
      userDisplayName: "সাকিব আল হাসান (Reader)",
      postTitle: "ডিজিটাল প্রিন্ট প্রযুক্তির বিবর্তন ও আমাদের ভবিষ্যৎ",
      timestamp: "2026-07-12T11:20:00Z"
    }
  ]
};

// Load or Initialize Database
function getDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const seeded = { ...initialData, writerApplications: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), "utf-8");
    return seeded;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const db = JSON.parse(content);
    if (!db.writerApplications) {
      db.writerApplications = [];
    }
    return db;
  } catch (e) {
    console.error("Database read error. Re-initializing.", e);
    const seeded = { ...initialData, writerApplications: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), "utf-8");
    return seeded;
  }
}

function saveDatabase(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ---------------------- API ROUTES ----------------------

// Get posts
app.get("/api/posts", (req, res) => {
  const db = getDatabase();
  res.json(db.posts);
});

// Create post
app.post("/api/posts", (req, res) => {
  const { title, excerpt, content, priceCoins, priceMoney, authorId, authorName } = req.body;
  if (!title || !content || !authorId) {
    return res.status(400).json({ error: "Title, content and authorId are required" });
  }

  const db = getDatabase();
  const newPost = {
    id: "post-" + Date.now(),
    title,
    excerpt: excerpt || content.substring(0, 100) + "...",
    content,
    authorId,
    authorName: authorName || "Unknown Author",
    viewCount: 0,
    addToPrintCount: 0,
    priceCoins: Number(priceCoins) || 0,
    priceMoney: Number(priceMoney) || 0,
    createdAt: new Date().toISOString()
  };

  db.posts.unshift(newPost);
  saveDatabase(db);
  res.status(201).json(newPost);
});

// Edit post
app.put("/api/posts/:id", (req, res) => {
  const { id } = req.params;
  const { title, excerpt, content, priceCoins, priceMoney } = req.body;

  const db = getDatabase();
  const postIdx = db.posts.findIndex((p: any) => p.id === id);
  if (postIdx === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  db.posts[postIdx] = {
    ...db.posts[postIdx],
    title: title || db.posts[postIdx].title,
    excerpt: excerpt || db.posts[postIdx].excerpt,
    content: content || db.posts[postIdx].content,
    priceCoins: priceCoins !== undefined ? Number(priceCoins) : db.posts[postIdx].priceCoins,
    priceMoney: priceMoney !== undefined ? Number(priceMoney) : db.posts[postIdx].priceMoney,
  };

  saveDatabase(db);
  res.json(db.posts[postIdx]);
});

// Get user profile
app.get("/api/users/:uid", (req, res) => {
  const { uid } = req.params;
  const db = getDatabase();
  let user = db.users.find((u: any) => u.uid === uid);

  if (!user) {
    // Create lazy user profile
    user = {
      uid,
      email: uid.includes("@") ? uid : `${uid}@readtoprint.com`,
      displayName: uid.split("-")[0] || "User",
      role: "reader",
      coins: 100,
      currentBalance: 200,
      bookmarkedPostIds: [],
      printBasketPostIds: [],
      followingAuthors: [],
      bio: "স্বাগতম রিড-টু-প্রিন্ট অ্যাপ্লিকেশনে।"
    };
    db.users.push(user);
    saveDatabase(db);
  }

  res.json(user);
});

// Update user profile
app.put("/api/users/:uid", (req, res) => {
  const { uid } = req.params;
  const { displayName, bio, role } = req.body;

  const db = getDatabase();
  let userIdx = db.users.findIndex((u: any) => u.uid === uid);
  if (userIdx === -1) {
    const newUser = {
      uid,
      email: uid.includes("@") ? uid : `${uid}@readtoprint.com`,
      displayName: displayName || "User",
      role: role || "reader",
      coins: 100,
      currentBalance: 200,
      bookmarkedPostIds: [],
      printBasketPostIds: [],
      followingAuthors: [],
      bio: bio || "স্বাগতম রিড-টু-প্রিন্ট অ্যাপ্লিকেশনে।"
    };
    db.users.push(newUser);
    userIdx = db.users.length - 1;
  } else {
    db.users[userIdx] = {
      ...db.users[userIdx],
      displayName: displayName || db.users[userIdx].displayName,
      bio: bio !== undefined ? bio : db.users[userIdx].bio,
      role: role || db.users[userIdx].role,
    };
  }

  saveDatabase(db);
  res.json(db.users[userIdx]);
});

// Handle transactional actions (buy coins, read post, bookmark, basket, follow)
app.post("/api/users/:uid/action", (req, res) => {
  const { uid } = req.params;
  const { actionType, postId, amountCoins, amountMoney, authorId, paymentMethod, accountNumber } = req.body;

  const db = getDatabase();
  const userIdx = db.users.findIndex((u: any) => u.uid === uid);
  if (userIdx === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = db.users[userIdx];

  if (actionType === "checkout_basket") {
    user.printBasketPostIds = [];
    saveDatabase(db);
    return res.json({ success: true, user });
  }

  if (actionType === "buy_coins") {
    const buyCoins = Number(amountCoins) || 100;
    const buyCost = Number(amountMoney) || 200;

    user.coins += buyCoins;
    // Current wallet balance and current coins are synchronized
    user.currentBalance += buyCost; 

    const newTx = {
      id: "tx-" + Date.now(),
      userId: uid,
      type: "buy_coins",
      amountCoins: buyCoins,
      amountMoney: buyCost,
      timestamp: new Date().toISOString()
    };

    db.transactions.unshift(newTx);
    saveDatabase(db);
    return res.json({ success: true, user, transaction: newTx });
  }

  if (actionType === "bookmark") {
    if (!postId) return res.status(400).json({ error: "postId is required" });
    const hasBookmark = user.bookmarkedPostIds.includes(postId);
    if (hasBookmark) {
      user.bookmarkedPostIds = user.bookmarkedPostIds.filter((id: string) => id !== postId);
    } else {
      user.bookmarkedPostIds.push(postId);
    }
    saveDatabase(db);
    return res.json({ success: true, user, isBookmarked: !hasBookmark });
  }

  if (actionType === "basket") {
    if (!postId) return res.status(400).json({ error: "postId is required" });
    const post = db.posts.find((p: any) => p.id === postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const hasInBasket = user.printBasketPostIds.includes(postId);
    if (hasInBasket) {
      user.printBasketPostIds = user.printBasketPostIds.filter((id: string) => id !== postId);
      post.addToPrintCount = Math.max(0, post.addToPrintCount - 1);
    } else {
      // Check coins
      if (user.coins < post.priceCoins) {
        return res.status(400).json({ error: "Insufficient coins! Please buy coins first." });
      }
      user.coins -= post.priceCoins;
      // Deducting BDT proportional to post cost for synchronized wallet balance
      user.currentBalance = Math.max(0, user.currentBalance - post.priceMoney);

      user.printBasketPostIds.push(postId);
      post.addToPrintCount += 1;

      // Add earning to author
      const author = db.users.find((u: any) => u.uid === post.authorId);
      if (author) {
        author.coins += post.priceCoins;
        author.currentBalance += post.priceMoney;
      }

      // Add to global add to print history
      db.globalHistory.unshift({
        id: "gh-" + Date.now(),
        userDisplayName: user.displayName,
        postTitle: post.title,
        timestamp: new Date().toISOString()
      });

      // Create transaction logs
      const newTx = {
        id: "tx-" + Date.now(),
        userId: uid,
        type: "print_post",
        amountCoins: post.priceCoins,
        amountMoney: post.priceMoney,
        postId: post.id,
        postTitle: post.title,
        timestamp: new Date().toISOString()
      };
      db.transactions.unshift(newTx);
    }
    saveDatabase(db);
    return res.json({ success: true, user, posts: db.posts, isAdded: !hasInBasket });
  }

  if (actionType === "read") {
    if (!postId) return res.status(400).json({ error: "postId is required" });
    const post = db.posts.find((p: any) => p.id === postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    // Readers pay small coins for reading if set, or just views increment
    post.viewCount += 1;
    saveDatabase(db);
    return res.json({ success: true, posts: db.posts });
  }

  if (actionType === "follow") {
    if (!authorId) return res.status(400).json({ error: "authorId is required" });
    const hasFollow = user.followingAuthors.includes(authorId);
    if (hasFollow) {
      user.followingAuthors = user.followingAuthors.filter((id: string) => id !== authorId);
    } else {
      user.followingAuthors.push(authorId);
    }
    saveDatabase(db);
    return res.json({ success: true, user, isFollowing: !hasFollow });
  }

  return res.status(400).json({ error: "Invalid actionType" });
});

// Get transactions for user
app.get("/api/transactions/:uid", (req, res) => {
  const { uid } = req.params;
  const db = getDatabase();
  const txs = db.transactions.filter((t: any) => t.userId === uid);
  res.json(txs);
});

// Get admin and global reports
app.get("/api/admin/data", (req, res) => {
  const db = getDatabase();
  res.json({
    withdrawRequests: db.withdrawRequests,
    writerApplications: db.writerApplications || [],
    users: db.users.map((u: any) => ({
      uid: u.uid,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      coins: u.coins,
      currentBalance: u.currentBalance,
      bio: u.bio
    })),
    globalHistory: db.globalHistory
  });
});

// Create withdraw request (Writer)
app.post("/api/admin/withdraw", (req, res) => {
  const { userId, userEmail, amount, paymentMethod, accountNumber } = req.body;
  if (!userId || !amount || !accountNumber) {
    return res.status(400).json({ error: "Missing required details" });
  }

  const db = getDatabase();
  const writer = db.users.find((u: any) => u.uid === userId);
  if (!writer) return res.status(404).json({ error: "Writer not found" });

  if (writer.currentBalance < amount) {
    return res.status(400).json({ error: "Insufficient balance for withdrawal" });
  }

  // Deduct balance and create request
  writer.currentBalance -= amount;

  const newRequest = {
    id: "wr-" + Date.now(),
    userId,
    userEmail: userEmail || writer.email,
    amount: Number(amount),
    paymentMethod: paymentMethod || "Bkash",
    accountNumber,
    status: "pending",
    timestamp: new Date().toISOString()
  };

  db.withdrawRequests.unshift(newRequest);
  saveDatabase(db);
  res.status(201).json({ success: true, withdrawRequests: db.withdrawRequests, user: writer });
});

// Admin action on withdraw request
app.post("/api/admin/action", (req, res) => {
  const { requestId, status } = req.body; // 'approved' | 'rejected'
  if (!requestId || !status) {
    return res.status(400).json({ error: "Missing requestId or status" });
  }

  const db = getDatabase();
  const reqIdx = db.withdrawRequests.findIndex((r: any) => r.id === requestId);
  if (reqIdx === -1) {
    return res.status(404).json({ error: "Request not found" });
  }

  const request = db.withdrawRequests[reqIdx];
  request.status = status;

  if (status === "rejected") {
    // Refund money to writer
    const writer = db.users.find((u: any) => u.uid === request.userId);
    if (writer) {
      writer.currentBalance += request.amount;
    }
  }

  saveDatabase(db);
  res.json({ success: true, withdrawRequests: db.withdrawRequests });
});

// Create a new writer application
app.post("/api/admin/applications", (req, res) => {
  const { userId, userEmail, userDisplayName, category, motivation, sample1Title, sample1Content, sample2Title, sample2Content } = req.body;
  if (!userId || !userEmail || !sample1Title || !sample1Content || !sample2Title || !sample2Content) {
    return res.status(400).json({ error: "Missing required details (UserId, Email, Sample 1, Sample 2 are required)" });
  }

  const db = getDatabase();
  
  // Check if there's already a pending or approved application
  const existingApp = (db.writerApplications || []).find((a: any) => a.userId === userId && a.status === "pending");
  if (existingApp) {
    return res.status(400).json({ error: "আপনার একটি আবেদন ইতিপূর্বে জমা দেওয়া হয়েছে এবং তা অনুমোদনের অপেক্ষায় রয়েছে।" });
  }

  const newApp = {
    id: "app-" + Date.now(),
    userId,
    userEmail,
    userDisplayName: userDisplayName || userEmail.split("@")[0],
    category: category || "প্রবন্ধ ও কলাম",
    motivation: motivation || "",
    sample1Title,
    sample1Content,
    sample2Title,
    sample2Content,
    status: "pending",
    timestamp: new Date().toISOString()
  };

  if (!db.writerApplications) {
    db.writerApplications = [];
  }
  db.writerApplications.unshift(newApp);
  saveDatabase(db);
  res.status(201).json({ success: true, application: newApp, writerApplications: db.writerApplications });
});

// Admin action on writer application
app.post("/api/admin/applications/:id/action", (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "approved" | "rejected"
  if (!status) {
    return res.status(400).json({ error: "Missing status field" });
  }

  const db = getDatabase();
  const appIdx = (db.writerApplications || []).findIndex((a: any) => a.id === id);
  if (appIdx === -1) {
    return res.status(404).json({ error: "Application not found" });
  }

  const application = db.writerApplications[appIdx];
  application.status = status;

  if (status === "approved") {
    // 1. Update user role to "writer"
    const user = db.users.find((u: any) => u.uid === application.userId);
    if (user) {
      user.role = "writer";
      user.bio = application.motivation || user.bio || "রেজিস্টার্ড লেখক।";
    }

    // 2. Automatically publish the 2 sample writings as real posts under this author!
    const newPost1 = {
      id: "post-" + Date.now() + "-1",
      title: application.sample1Title,
      excerpt: application.sample1Content.substring(0, 100) + "...",
      content: application.sample1Content,
      authorId: application.userId,
      authorName: application.userDisplayName || user?.displayName || "Unknown Writer",
      viewCount: 0,
      addToPrintCount: 0,
      priceCoins: 10,
      priceMoney: 20,
      createdAt: new Date().toISOString()
    };

    const newPost2 = {
      id: "post-" + Date.now() + "-2",
      title: application.sample2Title,
      excerpt: application.sample2Content.substring(0, 100) + "...",
      content: application.sample2Content,
      authorId: application.userId,
      authorName: application.userDisplayName || user?.displayName || "Unknown Writer",
      viewCount: 0,
      addToPrintCount: 0,
      priceCoins: 10,
      priceMoney: 20,
      createdAt: new Date().toISOString()
    };

    db.posts.unshift(newPost1);
    db.posts.unshift(newPost2);
  }

  saveDatabase(db);
  res.json({ success: true, writerApplications: db.writerApplications, posts: db.posts });
});

// ---------------------- VITE SETUP ----------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
