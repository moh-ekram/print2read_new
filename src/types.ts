/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "reader" | "writer" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  coins: number; // Synchronized current coins
  currentBalance: number; // Synchronized wallet balance in BDT/Money
  bookmarkedPostIds: string[]; // List of bookmarked post IDs
  printBasketPostIds: string[]; // List of print basket post IDs (Add to Print)
  followingAuthors: string[]; // List of followed author UIDs
  bio?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  viewCount: number;
  addToPrintCount: number;
  priceCoins: number;
  priceMoney: number;
  createdAt: string;
  hidden?: boolean;
}

export interface CoinTransaction {
  id: string;
  userId: string;
  type: "buy_coins" | "read_post" | "print_post" | "refund";
  amountCoins: number;
  amountMoney: number; // Currency cost or earnings
  postId?: string;
  postTitle?: string;
  timestamp: string;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  paymentMethod: string;
  accountNumber: string;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
}

export interface WriterApplication {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  category: string;
  motivation: string;
  sample1Title: string;
  sample1Content: string;
  sample2Title: string;
  sample2Content: string;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
}

export interface FollowerDetail {
  uid: string;
  displayName: string;
  email: string;
  bio?: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  bookName: string;
  articleTitles: string[];
  totalPages: number;
  totalPrice: number;
  paymentStatus: "Paid" | "Unpaid";
  printingStatus: "Received" | "Printing" | "Shipped" | "Delivered";
  timestamp: string;
}

