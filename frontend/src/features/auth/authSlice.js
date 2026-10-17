
import { createSlice } from "@reduxjs/toolkit";

// ============================================================
// INITIAL STATE
// Member and Admin authentication remain separate
// ============================================================

const initialState = {
  // Member authentication
  walletAddress: localStorage.getItem("communityXWallet") || "",
  token: localStorage.getItem("communityXToken") || "",
  user: null,
  isAuthenticated: Boolean(
    localStorage.getItem("communityXToken")
  ),

  // Admin authentication
  adminToken: localStorage.getItem("adminToken") || "",
  adminUser: (() => {
    try {
      return JSON.parse(
        localStorage.getItem("adminUser") || "null"
      );
    } catch {
      return null;
    }
  })(),

  isAdminAuthenticated: Boolean(
    localStorage.getItem("adminToken")
  ),
};

// ============================================================
// AUTH SLICE
// ============================================================

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    // --------------------------------------------------------
    // MEMBER AUTHENTICATION
    // --------------------------------------------------------

    setCommunityAuth: (state, action) => {
      const {
        walletAddress = "",
        token = "",
        user = null,
      } = action.payload || {};

      state.walletAddress = walletAddress;
      state.token = token;
      state.user = user;
      state.isAuthenticated = Boolean(token);

      if (walletAddress) {
        localStorage.setItem(
          "communityXWallet",
          walletAddress
        );
      } else {
        localStorage.removeItem("communityXWallet");
      }

      if (token) {
        localStorage.setItem("communityXToken", token);
      } else {
        localStorage.removeItem("communityXToken");
      }
    },

    setCommunityUser: (state, action) => {
      state.user = action.payload;
    },

    clearCommunityAuth: (state) => {
      state.walletAddress = "";
      state.token = "";
      state.user = null;
      state.isAuthenticated = false;

      localStorage.removeItem("communityXWallet");
      localStorage.removeItem("communityXToken");
    },

    // --------------------------------------------------------
    // ADMIN AUTHENTICATION
    // --------------------------------------------------------

    setAdminAuth: (state, action) => {
      const {
        token = "",
        adminUser = null,
      } = action.payload || {};

      state.adminToken = token;
      state.adminUser = adminUser;
      state.isAdminAuthenticated = Boolean(token);

      if (token) {
        localStorage.setItem("adminToken", token);
      } else {
        localStorage.removeItem("adminToken");
      }

      if (adminUser) {
        localStorage.setItem(
          "adminUser",
          JSON.stringify(adminUser)
        );
      } else {
        localStorage.removeItem("adminUser");
      }
    },

    setAdminUser: (state, action) => {
      state.adminUser = action.payload;

      if (action.payload) {
        localStorage.setItem(
          "adminUser",
          JSON.stringify(action.payload)
        );
      } else {
        localStorage.removeItem("adminUser");
      }
    },

    clearAdminAuth: (state) => {
      state.adminToken = "";
      state.adminUser = null;
      state.isAdminAuthenticated = false;

      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
    },
  },
});

// ============================================================
// EXPORT ACTIONS
// ============================================================

export const {
  setCommunityAuth,
  setCommunityUser,
  clearCommunityAuth,
  setAdminAuth,
  setAdminUser,
  clearAdminAuth,
} = authSlice.actions;

export default authSlice.reducer;
