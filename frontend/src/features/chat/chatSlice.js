
import { createSlice } from "@reduxjs/toolkit";

// ============================================================
// HELPERS
// ============================================================

const getMessageId = (message) =>
  String(message?.id || message?._id || message?.messageId || "");

const normalizeWallet = (wallet) =>
  String(wallet || "").trim().toLowerCase();

const isDuplicateMessage = (messages, message) => {
  const messageId = getMessageId(message);

  if (!messageId) return false;

  return messages.some(
    (item) => getMessageId(item) === messageId
  );
};

const getAnnouncementId = (announcement) =>
  String(announcement?._id || announcement?.id || "");

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
  // MEMBER CHAT
  groupMessages: [],
  privateMessages: [],
  announcements: [],

  groupLoading: false,
  privateLoading: false,
  announcementsLoading: false,
  announcementsError: null,

  // MEMBER UNREAD COUNTS
  unreadCounts: {
    group: 0,
    admin: 0,
    announcements: 0,
  },

  // ADMIN GROUP CHAT
  adminGroupMessages: [],

  // ADMIN PRIVATE CONVERSATIONS
  adminConversations: {},

  // ADMIN MEMBERS DASHBOARD
  adminMembers: [],
  activeAdminMemberWallet: "",

  // ADMIN LOADING AND ERRORS
  adminGroupLoading: false,
  adminPrivateLoading: false,
  adminMembersLoading: false,
  adminChatError: null,
};

// ============================================================
// CHAT SLICE
// ============================================================

const chatSlice = createSlice({
  name: "chat",
  initialState,

  reducers: {
    // ========================================================
    // MEMBER GROUP CHAT
    // ========================================================

    setGroupMessages: (state, action) => {
      state.groupMessages = action.payload;
    },

    addGroupMessage: (state, action) => {
      const message = action.payload;

      if (!isDuplicateMessage(state.groupMessages, message)) {
        state.groupMessages.push(message);
      }
    },

    updateGroupMessage: (state, action) => {
      const updatedMessage = action.payload;
      const messageId = getMessageId(updatedMessage);

      if (!messageId) return;

      state.groupMessages = state.groupMessages.map((message) =>
        getMessageId(message) === messageId
          ? { ...message, ...updatedMessage }
          : message
      );
    },

    deleteGroupMessage: (state, action) => {
      const messageId = String(action.payload);

      state.groupMessages = state.groupMessages.filter(
        (message) => getMessageId(message) !== messageId
      );
    },

    setGroupLoading: (state, action) => {
      state.groupLoading = action.payload;
    },

    // ========================================================
    // MEMBER PRIVATE CHAT
    // ========================================================

    setPrivateMessages: (state, action) => {
      state.privateMessages = action.payload;
    },

    addPrivateMessage: (state, action) => {
      const message = action.payload;

      if (!isDuplicateMessage(state.privateMessages, message)) {
        state.privateMessages.push(message);
      }
    },

    updatePrivateMessage: (state, action) => {
      const updatedMessage = action.payload;
      const messageId = getMessageId(updatedMessage);

      if (!messageId) return;

      state.privateMessages = state.privateMessages.map((message) =>
        getMessageId(message) === messageId
          ? { ...message, ...updatedMessage }
          : message
      );
    },

    deletePrivateMessage: (state, action) => {
      const messageId = String(action.payload);

      state.privateMessages = state.privateMessages.filter(
        (message) => getMessageId(message) !== messageId
      );
    },

    setPrivateLoading: (state, action) => {
      state.privateLoading = action.payload;
    },

    // ========================================================
    // ANNOUNCEMENTS
    // ========================================================

    // Replace announcements after fetching from the backend.
    setAnnouncements: (state, action) => {
      state.announcements = Array.isArray(action.payload)
        ? action.payload
        : [];
    },

    // Add a new announcement OR update an existing announcement.
    // This supports announcement:new and announcement:updated.
    addAnnouncement: (state, action) => {
      const announcement = action.payload;

      if (!announcement) return;

      const announcementId = getAnnouncementId(announcement);

      // Ignore an announcement without an ID.
      if (!announcementId) return;

      const existingIndex = state.announcements.findIndex(
        (item) => getAnnouncementId(item) === announcementId
      );

      if (existingIndex >= 0) {
        state.announcements[existingIndex] = {
          ...state.announcements[existingIndex],
          ...announcement,
        };
      } else {
        state.announcements.push(announcement);
      }

      // Keep newest announcements first.
      state.announcements.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    },

    // Remove an announcement after deletion or unpublishing.
    // Accepts an ID string or an object containing id / _id.
    removeAnnouncement: (state, action) => {
      const announcementId = String(
        action.payload?.id ||
          action.payload?._id ||
          action.payload ||
          ""
      );

      if (!announcementId) return;

      state.announcements = state.announcements.filter(
        (item) => getAnnouncementId(item) !== announcementId
      );
    },

    setAnnouncementsLoading: (state, action) => {
      state.announcementsLoading = action.payload;
    },

    setAnnouncementsError: (state, action) => {
      state.announcementsError = action.payload;
    },

    // ========================================================
    // MEMBER UNREAD COUNTS
    // ========================================================

    incrementUnread: (state, action) => {
      const { channel, amount = 1 } = action.payload || {};

      if (
        Object.prototype.hasOwnProperty.call(
          state.unreadCounts,
          channel
        )
      ) {
        const increment = Math.max(0, Number(amount) || 0);
        state.unreadCounts[channel] += increment;
      }
    },

    clearUnread: (state, action) => {
      const channel = action.payload;

      if (
        Object.prototype.hasOwnProperty.call(
          state.unreadCounts,
          channel
        )
      ) {
        state.unreadCounts[channel] = 0;
      }
    },

    clearAllUnread: (state) => {
      state.unreadCounts.group = 0;
      state.unreadCounts.admin = 0;
      state.unreadCounts.announcements = 0;
    },

    setUnreadCount: (state, action) => {
      const { channel, count } = action.payload || {};

      if (
        Object.prototype.hasOwnProperty.call(
          state.unreadCounts,
          channel
        )
      ) {
        state.unreadCounts[channel] = Math.max(
          0,
          Number(count) || 0
        );
      }
    },

    // ========================================================
    // ADMIN GROUP CHAT
    // ========================================================

    setAdminGroupMessages: (state, action) => {
      state.adminGroupMessages = action.payload;
    },

    addAdminGroupMessage: (state, action) => {
      const message = action.payload;

      if (!isDuplicateMessage(state.adminGroupMessages, message)) {
        state.adminGroupMessages.push(message);
      }
    },

    updateAdminGroupMessage: (state, action) => {
      const updatedMessage = action.payload;
      const messageId = getMessageId(updatedMessage);

      if (!messageId) return;

      state.adminGroupMessages = state.adminGroupMessages.map(
        (message) =>
          getMessageId(message) === messageId
            ? { ...message, ...updatedMessage }
            : message
      );
    },

    deleteAdminGroupMessage: (state, action) => {
      const messageId = String(action.payload);

      state.adminGroupMessages = state.adminGroupMessages.filter(
        (message) => getMessageId(message) !== messageId
      );
    },

    setAdminGroupLoading: (state, action) => {
      state.adminGroupLoading = action.payload;
    },

    // ========================================================
    // ADMIN PRIVATE CONVERSATIONS
    // ========================================================

    setAdminPrivateMessages: (state, action) => {
      const { wallet, messages } = action.payload || {};
      const key = normalizeWallet(wallet);

      if (!key) return;

      state.adminConversations[key] = messages || [];
    },

    addAdminPrivateMessage: (state, action) => {
      const { wallet, message } = action.payload || {};
      const key = normalizeWallet(wallet);

      if (!key || !message) return;

      if (!state.adminConversations[key]) {
        state.adminConversations[key] = [];
      }

      const messages = state.adminConversations[key];

      if (!isDuplicateMessage(messages, message)) {
        messages.push(message);
      }
    },

    updateAdminPrivateMessage: (state, action) => {
      const { wallet, message: updatedMessage } =
        action.payload || {};

      const key = normalizeWallet(wallet);
      const messageId = getMessageId(updatedMessage);

      if (!key || !messageId) return;

      const messages = state.adminConversations[key] || [];

      state.adminConversations[key] = messages.map((message) =>
        getMessageId(message) === messageId
          ? { ...message, ...updatedMessage }
          : message
      );
    },

    deleteAdminPrivateMessage: (state, action) => {
      const { wallet, messageId } = action.payload || {};
      const key = normalizeWallet(wallet);

      if (!key || !messageId) return;

      const messages = state.adminConversations[key] || [];

      state.adminConversations[key] = messages.filter(
        (message) => getMessageId(message) !== String(messageId)
      );
    },

    setAdminPrivateLoading: (state, action) => {
      state.adminPrivateLoading = action.payload;
    },

    // ========================================================
    // ADMIN MEMBERS DASHBOARD
    // ========================================================

    setAdminMembers: (state, action) => {
      state.adminMembers = action.payload;
    },

    setAdminMembersLoading: (state, action) => {
      state.adminMembersLoading = action.payload;
    },

    setActiveAdminMemberWallet: (state, action) => {
      state.activeAdminMemberWallet = normalizeWallet(
        action.payload
      );
    },

    setAdminChatError: (state, action) => {
      state.adminChatError = action.payload;
    },

    // Clear admin chat data without clearing member chat data.
    clearAdminChat: (state) => {
      state.adminGroupMessages = [];
      state.adminConversations = {};
      state.adminMembers = [];
      state.activeAdminMemberWallet = "";

      state.adminGroupLoading = false;
      state.adminPrivateLoading = false;
      state.adminMembersLoading = false;
      state.adminChatError = null;
    },
  },
});

// ============================================================
// EXPORT ACTIONS
// ============================================================

export const {
  // Member group chat
  setGroupMessages,
  addGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,
  setGroupLoading,

  // Member private chat
  setPrivateMessages,
  addPrivateMessage,
  updatePrivateMessage,
  deletePrivateMessage,
  setPrivateLoading,

  // Announcements
  setAnnouncements,
  addAnnouncement,
  removeAnnouncement,
  setAnnouncementsLoading,
  setAnnouncementsError,

  // Member unread counts
  incrementUnread,
  clearUnread,
  clearAllUnread,
  setUnreadCount,

  // Admin group chat
  setAdminGroupMessages,
  addAdminGroupMessage,
  updateAdminGroupMessage,
  deleteAdminGroupMessage,
  setAdminGroupLoading,

  // Admin private conversations
  setAdminPrivateMessages,
  addAdminPrivateMessage,
  updateAdminPrivateMessage,
  deleteAdminPrivateMessage,
  setAdminPrivateLoading,

  // Admin members
  setAdminMembers,
  setAdminMembersLoading,
  setActiveAdminMemberWallet,
  setAdminChatError,
  clearAdminChat,
} = chatSlice.actions;

export default chatSlice.reducer;
