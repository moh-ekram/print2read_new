import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  runTransaction
} from "firebase/firestore";
import { firebaseDb, handleFirestoreError, OperationType } from "./firebase";

// Seeding Initial Data if Firestore is empty
const initialData = {
  users: [
    {
      uid: "reader-1",
      email: "reader@readtoprint.com",
      displayName: "সাকিব আল হাসান (Reader)",
      role: "reader",
      coins: 450,
      currentBalance: 500,
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
      currentBalance: 2450,
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

// Check and seed default collections
export async function seedFirestoreIfNeeded(): Promise<void> {
  if (!firebaseDb) return;
  const path = "posts";
  try {
    const postsSnap = await getDocs(collection(firebaseDb, "posts"));
    if (postsSnap.empty) {
      console.log("Firestore empty. Seeding default data...");
      // Seed posts
      for (const post of initialData.posts) {
        await setDoc(doc(firebaseDb, "posts", post.id), post);
      }
      // Seed users
      for (const user of initialData.users) {
        await setDoc(doc(firebaseDb, "users", user.uid), user);
      }
      // Seed transactions
      for (const tx of initialData.transactions) {
        await setDoc(doc(firebaseDb, "transactions", tx.id), tx);
      }
      // Seed withdraw requests
      for (const wr of initialData.withdrawRequests) {
        await setDoc(doc(firebaseDb, "withdrawRequests", wr.id), wr);
      }
      // Seed global history
      for (const gh of initialData.globalHistory) {
        await setDoc(doc(firebaseDb, "globalHistory", gh.id), gh);
      }
      console.log("Firestore successfully seeded with default data.");
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Fetch all posts from Firestore
export async function fetchPostsFromFirestore() {
  if (!firebaseDb) return [];
  const path = "posts";
  try {
    await seedFirestoreIfNeeded();
    const postsRef = collection(firebaseDb, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const posts: any[] = [];
    querySnapshot.forEach((docSnap) => {
      posts.push({ ...docSnap.data() });
    });
    return posts;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Fetch user profile from Firestore or lazy create
export async function getUserProfileFromFirestore(uid: string, defaultData?: { displayName?: string; role?: string; bio?: string; email?: string }) {
  if (!firebaseDb) return null;
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(firebaseDb, "users", uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      // If the email field is empty or contains the placeholder "@readtoprint.com", update it with their real email if available
      if ((!data.email || data.email.endsWith("@readtoprint.com")) && defaultData?.email && !defaultData.email.endsWith("@readtoprint.com")) {
        data.email = defaultData.email;
        await updateDoc(userDocRef, { email: defaultData.email });
      }
      return data;
    } else {
      // Lazy Create User Profile
      const emailVal = defaultData?.email || (uid.includes("@") ? uid : `${uid}@readtoprint.com`);
      const newUser = {
        uid,
        email: emailVal,
        displayName: defaultData?.displayName || uid.split("-")[0] || "User",
        role: defaultData?.role || "reader",
        coins: 100,
        currentBalance: 200,
        bookmarkedPostIds: [],
        printBasketPostIds: [],
        followingAuthors: [],
        bio: defaultData?.bio || "স্বাগতম রিড-টু-প্রিন্ট অ্যাপ্লিকেশনে।"
      };
      await setDoc(userDocRef, newUser);
      return newUser;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Save or Update user profile
export async function saveUserProfileToFirestore(uid: string, profileData: { displayName?: string; bio?: string; role?: string; email?: string }) {
  if (!firebaseDb) return null;
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(firebaseDb, "users", uid);
    const userSnap = await getDoc(userDocRef);
    let finalProfile: any = {};

    if (userSnap.exists()) {
      finalProfile = {
        ...userSnap.data(),
        ...profileData
      };
      await updateDoc(userDocRef, profileData);
    } else {
      const emailVal = profileData.email || (uid.includes("@") ? uid : `${uid}@readtoprint.com`);
      finalProfile = {
        uid,
        email: emailVal,
        displayName: profileData.displayName || "User",
        role: profileData.role || "reader",
        coins: 100,
        currentBalance: 200,
        bookmarkedPostIds: [],
        printBasketPostIds: [],
        followingAuthors: [],
        bio: profileData.bio || "স্বাগতম রিড-টু-প্রিন্ট অ্যাপ্লিকেশনে।"
      };
      await setDoc(userDocRef, finalProfile);
    }
    return finalProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    return null;
  }
}

// Create new post in Firestore
export async function createPostInFirestore(postData: {
  title: string;
  excerpt?: string;
  content: string;
  authorId: string;
  authorName: string;
  priceCoins: number;
  priceMoney: number;
}) {
  if (!firebaseDb) return null;
  const path = "posts";
  try {
    const postId = "post-" + Date.now();
    const newPost = {
      id: postId,
      title: postData.title,
      excerpt: postData.excerpt || postData.content.substring(0, 100) + "...",
      content: postData.content,
      authorId: postData.authorId,
      authorName: postData.authorName || "Unknown Author",
      viewCount: 0,
      addToPrintCount: 0,
      priceCoins: Number(postData.priceCoins) || 0,
      priceMoney: Number(postData.priceMoney) || 0,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(firebaseDb, "posts", postId), newPost);
    return newPost;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return null;
  }
}

// Edit existing post in Firestore
export async function editPostInFirestore(id: string, postData: {
  title?: string;
  excerpt?: string;
  content?: string;
  priceCoins?: number;
  priceMoney?: number;
}) {
  if (!firebaseDb) return null;
  const path = `posts/${id}`;
  try {
    const postDocRef = doc(firebaseDb, "posts", id);
    const postSnap = await getDoc(postDocRef);
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }

    const updatedData: any = {};
    if (postData.title !== undefined) updatedData.title = postData.title;
    if (postData.excerpt !== undefined) updatedData.excerpt = postData.excerpt;
    if (postData.content !== undefined) updatedData.content = postData.content;
    if (postData.priceCoins !== undefined) updatedData.priceCoins = Number(postData.priceCoins);
    if (postData.priceMoney !== undefined) updatedData.priceMoney = Number(postData.priceMoney);

    await updateDoc(postDocRef, updatedData);
    return { ...postSnap.data(), ...updatedData };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    return null;
  }
}

// Handle client-side actions in Firestore securely via transactions
export async function handleUserActionInFirestore(
  uid: string,
  actionType: string,
  payload: { postId?: string; authorId?: string; amountCoins?: number; amountMoney?: number }
) {
  if (!firebaseDb) return null;
  const path = `users/${uid}/actions`;

  try {
    return await runTransaction(firebaseDb, async (transaction) => {
      const userRef = doc(firebaseDb!, "users", uid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("User profile not found in database.");
      }
      const user = userSnap.data();

      if (actionType === "checkout_basket") {
        user.printBasketPostIds = [];
        transaction.update(userRef, { printBasketPostIds: [] });
        return { success: true, user };
      }

      if (actionType === "buy_coins") {
        const buyCoins = Number(payload.amountCoins) || 100;
        const buyCost = Number(payload.amountMoney) || 200;

        const updatedCoins = (user.coins || 0) + buyCoins;
        const updatedBalance = (user.currentBalance || 0) + buyCost;

        transaction.update(userRef, {
          coins: updatedCoins,
          currentBalance: updatedBalance
        });

        const txId = "tx-" + Date.now();
        const txRef = doc(firebaseDb!, "transactions", txId);
        const newTx = {
          id: txId,
          userId: uid,
          type: "buy_coins",
          amountCoins: buyCoins,
          amountMoney: buyCost,
          timestamp: new Date().toISOString()
        };

        transaction.set(txRef, newTx);

        user.coins = updatedCoins;
        user.currentBalance = updatedBalance;
        return { success: true, user, transaction: newTx };
      }

      if (actionType === "bookmark") {
        const { postId } = payload;
        if (!postId) throw new Error("postId is required");
        let bookmarked = [...(user.bookmarkedPostIds || [])];
        const hasBookmark = bookmarked.includes(postId);
        if (hasBookmark) {
          bookmarked = bookmarked.filter((id) => id !== postId);
        } else {
          bookmarked.push(postId);
        }
        transaction.update(userRef, { bookmarkedPostIds: bookmarked });
        user.bookmarkedPostIds = bookmarked;
        return { success: true, user, isBookmarked: !hasBookmark };
      }

      if (actionType === "basket") {
        const { postId } = payload;
        if (!postId) throw new Error("postId is required");

        const postRef = doc(firebaseDb!, "posts", postId);
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) throw new Error("Post not found");
        const post = postSnap.data();

        let basket = [...(user.printBasketPostIds || [])];
        const hasInBasket = basket.includes(postId);

        if (hasInBasket) {
          basket = basket.filter((id) => id !== postId);
          const updatedPrintCount = Math.max(0, (post.addToPrintCount || 0) - 1);
          transaction.update(postRef, { addToPrintCount: updatedPrintCount });
          transaction.update(userRef, { printBasketPostIds: basket });
          user.printBasketPostIds = basket;
        } else {
          const priceCoins = Number(post.priceCoins) || 0;
          const priceMoney = Number(post.priceMoney) || 0;

          if ((user.coins || 0) < priceCoins) {
            throw new Error("Insufficient coins! Please buy coins first.");
          }

          const updatedCoins = (user.coins || 0) - priceCoins;
          const updatedBalance = Math.max(0, (user.currentBalance || 0) - priceMoney);

          basket.push(postId);
          const updatedPrintCount = (post.addToPrintCount || 0) + 1;

          transaction.update(userRef, {
            printBasketPostIds: basket,
            coins: updatedCoins,
            currentBalance: updatedBalance
          });

          transaction.update(postRef, { addToPrintCount: updatedPrintCount });

          // Pay author
          if (post.authorId) {
            const authorRef = doc(firebaseDb!, "users", post.authorId);
            const authorSnap = await transaction.get(authorRef);
            if (authorSnap.exists()) {
              const author = authorSnap.data();
              transaction.update(authorRef, {
                coins: (author.coins || 0) + priceCoins,
                currentBalance: (author.currentBalance || 0) + priceMoney
              });
            }
          }

          // Global history addition
          const ghId = "gh-" + Date.now();
          const ghRef = doc(firebaseDb!, "globalHistory", ghId);
          transaction.set(ghRef, {
            id: ghId,
            userDisplayName: user.displayName || "User",
            postTitle: post.title,
            timestamp: new Date().toISOString()
          });

          // Create transaction log
          const txId = "tx-" + Date.now();
          const txRef = doc(firebaseDb!, "transactions", txId);
          const newTx = {
            id: txId,
            userId: uid,
            type: "print_post",
            amountCoins: priceCoins,
            amountMoney: priceMoney,
            postId: post.id,
            postTitle: post.title,
            timestamp: new Date().toISOString()
          };
          transaction.set(txRef, newTx);

          user.coins = updatedCoins;
          user.currentBalance = updatedBalance;
          user.printBasketPostIds = basket;
        }

        return { success: true, user, isAdded: !hasInBasket };
      }

      if (actionType === "read") {
        const { postId } = payload;
        if (!postId) throw new Error("postId is required");

        const postRef = doc(firebaseDb!, "posts", postId);
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) throw new Error("Post not found");
        const post = postSnap.data();

        transaction.update(postRef, {
          viewCount: (post.viewCount || 0) + 1
        });
        return { success: true };
      }

      if (actionType === "follow") {
        const { authorId } = payload;
        if (!authorId) throw new Error("authorId is required");

        let follows = [...(user.followingAuthors || [])];
        const hasFollow = follows.includes(authorId);

        if (hasFollow) {
          follows = follows.filter((id) => id !== authorId);
        } else {
          follows.push(authorId);
        }

        transaction.update(userRef, { followingAuthors: follows });
        user.followingAuthors = follows;
        return { success: true, user, isFollowing: !hasFollow };
      }

      throw new Error("Invalid actionType");
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return null;
  }
}

// Fetch transaction history
export async function fetchTransactionsFromFirestore(uid: string) {
  if (!firebaseDb) return [];
  const path = "transactions";
  try {
    const txRef = collection(firebaseDb, "transactions");
    const q = query(txRef, where("userId", "==", uid));
    const snap = await getDocs(q);
    const txs: any[] = [];
    snap.forEach((docSnap) => {
      txs.push(docSnap.data());
    });
    // Sort desc by timestamp manually or as loaded
    return txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Create withdraw request
export async function createWithdrawRequestInFirestore(
  userId: string,
  userEmail: string,
  amount: number,
  paymentMethod: string,
  accountNumber: string
) {
  if (!firebaseDb) return null;
  const path = "withdrawRequests";
  try {
    return await runTransaction(firebaseDb, async (transaction) => {
      const userRef = doc(firebaseDb!, "users", userId);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("Writer profile not found.");
      const writer = userSnap.data();

      if ((writer.currentBalance || 0) < amount) {
        throw new Error("Insufficient balance for withdrawal");
      }

      const updatedBalance = (writer.currentBalance || 0) - amount;
      transaction.update(userRef, { currentBalance: updatedBalance });

      const wrId = "wr-" + Date.now();
      const wrRef = doc(firebaseDb!, "withdrawRequests", wrId);
      const newRequest = {
        id: wrId,
        userId,
        userEmail: userEmail || writer.email,
        amount: Number(amount),
        paymentMethod: paymentMethod || "bKash",
        accountNumber,
        status: "pending",
        timestamp: new Date().toISOString()
      };

      transaction.set(wrRef, newRequest);
      return { success: true, request: newRequest };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return null;
  }
}

// Approve/Reject withdraw request
export async function handleWithdrawActionInFirestore(requestId: string, status: string) {
  if (!firebaseDb) return null;
  const path = `withdrawRequests/${requestId}`;
  try {
    return await runTransaction(firebaseDb, async (transaction) => {
      const wrRef = doc(firebaseDb!, "withdrawRequests", requestId);
      const wrSnap = await transaction.get(wrRef);
      if (!wrSnap.exists()) throw new Error("Withdraw request not found.");
      const request = wrSnap.data();

      transaction.update(wrRef, { status });

      if (status === "rejected") {
        // Refund money
        const userRef = doc(firebaseDb!, "users", request.userId);
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
          const writer = userSnap.data();
          transaction.update(userRef, {
            currentBalance: (writer.currentBalance || 0) + request.amount
          });
        }
      }

      return { success: true };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return null;
  }
}

// Fetch all admin data
export async function fetchAdminDataFromFirestore() {
  if (!firebaseDb) return { withdrawRequests: [], users: [], globalHistory: [] };
  try {
    const wrSnap = await getDocs(collection(firebaseDb, "withdrawRequests"));
    const withdrawRequests: any[] = [];
    wrSnap.forEach((docSnap) => {
      withdrawRequests.push(docSnap.data());
    });

    const userSnap = await getDocs(collection(firebaseDb, "users"));
    const users: any[] = [];
    userSnap.forEach((docSnap) => {
      const u = docSnap.data();
      users.push({
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        role: u.role,
        coins: u.coins,
        currentBalance: u.currentBalance,
        bio: u.bio
      });
    });

    const ghSnap = await getDocs(collection(firebaseDb, "globalHistory"));
    const globalHistory: any[] = [];
    ghSnap.forEach((docSnap) => {
      globalHistory.push(docSnap.data());
    });

    // Sort appropriately
    const sortedWr = withdrawRequests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const sortedGh = globalHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      withdrawRequests: sortedWr,
      users,
      globalHistory: sortedGh
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "admin");
    return { withdrawRequests: [], users: [], globalHistory: [] };
  }
}
