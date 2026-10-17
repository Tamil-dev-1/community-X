import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import {
  setCommunityAuth,
  setCommunityUser,
} from "../features/auth/authSlice";

import {
  setGroupMessages,
  addGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,
  setGroupLoading,
  setPrivateMessages,
  addPrivateMessage,
  updatePrivateMessage,
  deletePrivateMessage,
  setPrivateLoading,
  addAnnouncement,
  removeAnnouncement,
  setAnnouncements,
  setAnnouncementsLoading,
  setAnnouncementsError,
  incrementUnread,
  clearUnread,
} from "../features/chat/chatSlice";

import CommunityChatContext from "../context/CommunityChatContext";
import ChatSidebar from "../components/community-chat/ChatSidebar";
import ChatHeader from "../components/community-chat/ChatHeader";

import "../pages/communitychat/CommunityChat.css";

// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = "http://localhost:5000/api/messages";
const SOCKET_URL = "http://localhost:5000";

const COMMUNITY_PROFILE_URL =
  `${SOCKET_URL}/api/community/profile/check`;

const ANNOUNCEMENTS_URL =
  `${SOCKET_URL}/api/announcements`;

const ADMIN_IDENTIFIER = "admin:adm-001";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

// ============================================================
// HELPERS
// ============================================================

const getMessageId = (message) =>
  message?._id ||
  message?.id ||
  message?.messageId ||
  null;

const isBannedError = (status, data) =>
  status === 403 &&
  data?.code === "COMMUNITY_MEMBER_BANNED";

const readApiResponse = async (response) => {
  const responseText = await response.text();

  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an invalid response."
        : `Request failed (HTTP ${response.status}). Check the backend terminal.`
    );
  }
};

// ============================================================
// COMMUNITY LAYOUT
// ============================================================

const CommunityLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ----------------------------------------------------------
  // ACTIVE PAGE
  // ----------------------------------------------------------

  const activeTab =
    location.pathname === "/welcome"
      ? "welcome"
      : location.pathname === "/private-chat"
        ? "admin"
        : location.pathname === "/announcements"
          ? "announcements"
          : "group";

  // ----------------------------------------------------------
  // REDUX STATE
  // ----------------------------------------------------------

  const {
    groupMessages,
    privateMessages,
    groupLoading,
    privateLoading,
    announcements,
    announcementsLoading,
    announcementsError,
    unreadCounts,
  } = useSelector((state) => state.chat);

  const auth = useSelector((state) => state.auth);

  // ----------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------

  const communityUserFromState =
    location.state?.communityUser;

  const walletAddressFromState =
    location.state?.walletAddress;

  const storedWallet =
    localStorage.getItem("communityXWallet") || "";

  const storedToken =
    localStorage.getItem("communityXToken") || "";

  const token = auth?.token || storedToken;

  const reduxWallet = auth?.walletAddress || "";
  const reduxUser = auth?.user || null;

  // ----------------------------------------------------------
  // PROFILE FALLBACK REF
  // ----------------------------------------------------------

  const profileFallbackRef = useRef({
    reduxUser,
    reduxWallet,
    walletAddressFromState,
    storedWallet,
  });

  profileFallbackRef.current = {
    reduxUser,
    reduxWallet,
    walletAddressFromState,
    storedWallet,
  };

  // ----------------------------------------------------------
  // SAVED PROFILE
  // ----------------------------------------------------------

  const [savedProfile, setSavedProfile] = useState(reduxUser);

  // Keep a valid Redux profile synchronized with local state.
  // Do not erase savedProfile when Redux is intentionally cleared
  // because the member has been banned.
  useEffect(() => {
    if (reduxUser) {
      setSavedProfile(reduxUser);
    }
  }, [reduxUser]);

  const [profileLoading, setProfileLoading] = useState(
    Boolean(token)
  );

  // ----------------------------------------------------------
  // MEMBER ACCESS STATUS
  // ----------------------------------------------------------

  const [accessSuspended, setAccessSuspended] = useState(false);
  const [banReason, setBanReason] = useState("");

  // ----------------------------------------------------------
  // CURRENT MEMBER
  // ----------------------------------------------------------

  const profile =
    savedProfile ||
    reduxUser ||
    communityUserFromState ||
    null;

  const currentUser = {
    walletAddress:
      profile?.walletAddress ||
      reduxWallet ||
      walletAddressFromState ||
      storedWallet ||
      "",

    name:
      profile?.fullName?.trim() ||
      profile?.username?.trim() ||
      "Community Member",

    username: profile?.username || "",

    avatar:
      profile?.profileImage?.trim() ||
      DEFAULT_AVATAR,

    isAdmin: false,
  };

  const currentWallet = String(
    currentUser.walletAddress || ""
  )
    .toLowerCase()
    .trim();

  const adminIdentifier = ADMIN_IDENTIFIER.toLowerCase();

  // ----------------------------------------------------------
  // LOCAL UI STATE
  // ----------------------------------------------------------

  const [inputText, setInputText] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  const [announcementRetry, setAnnouncementRetry] = useState(0);

  // ----------------------------------------------------------
  // REFS
  // ----------------------------------------------------------

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeTabRef = useRef(activeTab);
  const seenUnreadEventsRef = useRef(new Set());

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // ----------------------------------------------------------
  // HANDLE BANNED MEMBER
  // ----------------------------------------------------------

  const handleAccessSuspended = useCallback(
    (reason = "", bannedUser = null) => {
      const readableReason =
        typeof reason === "string" && reason.trim()
          ? reason.trim()
          : "Your access has been suspended by an administrator.";

      // Preserve the backend profile when it is provided.
      // Otherwise keep the last profile already loaded.
      setSavedProfile((previous) => {
        if (bannedUser) {
          return {
            ...previous,
            ...bannedUser,
          };
        }

        return previous || null;
      });

      setBanReason(readableReason);
      setAccessSuspended(true);

      // Clear the profile from Redux and clear cached messages.
      // IMPORTANT: Do not remove communityXToken here.
      // On refresh, the backend needs this token to identify
      // the banned member and return the ban reason again.
      dispatch(setCommunityUser(null));

      dispatch(setGroupMessages([]));
      dispatch(setPrivateMessages([]));
      dispatch(setAnnouncements([]));

      setInputText("");
      setEditingMessageId(null);
      setShowEmojiPicker(false);

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      console.warn("Community X access suspended.");
    },
    [dispatch]
  );

  // ----------------------------------------------------------
  // CLEAR UNREAD COUNT FOR ACTIVE PAGE
  // ----------------------------------------------------------

  useEffect(() => {
    dispatch(clearUnread(activeTab));
  }, [activeTab, dispatch]);

  // ----------------------------------------------------------
  // LOAD COMMUNITY PROFILE
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadCommunityProfile = async () => {
      // IMPORTANT:
      // When banned, preserve the profile and reason already shown.
      // Do not clear savedProfile in this branch.
      if (accessSuspended) {
        setProfileLoading(false);
        return;
      }

      if (!token) {
        setSavedProfile(null);
        setProfileLoading(false);
        dispatch(setCommunityUser(null));
        return;
      }

      setProfileLoading(true);

      try {
        const response = await fetch(COMMUNITY_PROFILE_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const data = await readApiResponse(response);

        if (cancelled) return;

        if (!response.ok) {
          if (isBannedError(response.status, data)) {
            handleAccessSuspended(
              data.reason,
              data.user || null
            );
            return;
          }

          throw new Error(
            data.message ||
              "Failed to load your Community X profile."
          );
        }

        if (data.exists && data.user) {
          const user = data.user;
          const latest = profileFallbackRef.current;

          const walletAddress = String(
            user.walletAddress ||
              latest.reduxWallet ||
              latest.walletAddressFromState ||
              latest.storedWallet ||
              ""
          )
            .toLowerCase()
            .trim();

          setSavedProfile(user);

          if (walletAddress) {
            localStorage.setItem(
              "communityXWallet",
              walletAddress
            );
          }

          dispatch(setCommunityUser(user));

          dispatch(
            setCommunityAuth({
              walletAddress,
              token,
              user,
            })
          );
        } else {
          setSavedProfile(null);
          dispatch(setCommunityUser(null));
        }
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Load Community X profile error:",
          error
        );

        setSavedProfile(
          profileFallbackRef.current.reduxUser || null
        );
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadCommunityProfile();

    return () => {
      cancelled = true;
    };
  }, [
    token,
    dispatch,
    accessSuspended,
    handleAccessSuspended,
  ]);

  // ----------------------------------------------------------
  // DEDUPLICATE UNREAD EVENTS
  // ----------------------------------------------------------

  const rememberUnreadEvent = (channel, eventId) => {
    if (!eventId) return false;

    const key = `${channel}:${String(eventId)}`;
    const seen = seenUnreadEventsRef.current;

    if (seen.has(key)) return false;

    seen.add(key);

    if (seen.size > 2000) {
      const recentKeys = Array.from(seen).slice(-1000);

      seen.clear();

      recentKeys.forEach((recentKey) => {
        seen.add(recentKey);
      });
    }

    return true;
  };

  // ----------------------------------------------------------
  // FORMAT MESSAGE
  // ----------------------------------------------------------

  const formatMessage = (message) => {
    const createdAt = message?.createdAt || null;

    const senderWallet = String(
      message?.senderWallet ||
        message?.senderId ||
        ""
    )
      .toLowerCase()
      .trim();

    const isCurrentUser = senderWallet === currentWallet;

    const senderAvatar = String(
      message?.senderAvatar ||
        message?.avatar ||
        ""
    ).trim();

    const avatar =
      senderAvatar ||
      (isCurrentUser ? currentUser.avatar : "") ||
      DEFAULT_AVATAR;

    return {
      id: String(getMessageId(message) || ""),

      senderId: message?.senderWallet || senderWallet,
      senderWallet: message?.senderWallet || senderWallet,

      receiverWallet: message?.receiverWallet || null,

      senderName:
        message?.senderName ||
        (isCurrentUser
          ? currentUser.name
          : "Community Member"),

      avatar,

      isAdmin: senderWallet === adminIdentifier,

      text: message?.message ?? message?.text ?? "",

      isEdited: message?.isEdited === true,

      attachment: message?.attachment || null,

      createdAt,

      time: new Date(
        createdAt || Date.now()
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  // ----------------------------------------------------------
  // BUILD PARTIAL MESSAGE UPDATE
  // ----------------------------------------------------------

  const buildMessageUpdate = (updatedMessage, fallbackId) => {
    const updatedId =
      getMessageId(updatedMessage) || fallbackId;

    const update = {
      id: String(updatedId),
    };

    if (
      updatedMessage?.message !== undefined ||
      updatedMessage?.text !== undefined
    ) {
      update.text =
        updatedMessage.message ?? updatedMessage.text;
    }

    if (updatedMessage?.isEdited !== undefined) {
      update.isEdited = updatedMessage.isEdited === true;
    }

    if (updatedMessage?.attachment !== undefined) {
      update.attachment = updatedMessage.attachment;
    }

    if (updatedMessage?.createdAt) {
      update.createdAt = updatedMessage.createdAt;

      update.time = new Date(
        updatedMessage.createdAt
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return update;
  };

  // ----------------------------------------------------------
  // CHECK PRIVATE ADMIN CONVERSATION
  // ----------------------------------------------------------

  const belongsToAdminConversation = (message) => {
    const senderWallet = String(
      message?.senderWallet || message?.senderId || ""
    )
      .toLowerCase()
      .trim();

    const receiverWallet = String(
      message?.receiverWallet || ""
    )
      .toLowerCase()
      .trim();

    return (
      (senderWallet === currentWallet &&
        receiverWallet === adminIdentifier) ||
      (senderWallet === adminIdentifier &&
        receiverWallet === currentWallet)
    );
  };

  // ----------------------------------------------------------
  // CANCEL MESSAGE EDIT
  // ----------------------------------------------------------

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setInputText("");
    setShowEmojiPicker(false);
  };

  // ----------------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------------

  const handleTabNavigation = (tab) => {
    const routes = {
      welcome: "/welcome",
      group: "/community",
      admin: "/private-chat",
      announcements: "/announcements",
    };

    handleCancelEdit();
    activeTabRef.current = tab;

    dispatch(clearUnread(tab));
    navigate(routes[tab] || "/welcome");

    setMobileMenuOpen(false);
  };

  // ----------------------------------------------------------
  // SOCKET.IO CONNECTION
  // ----------------------------------------------------------

  useEffect(() => {
    if (!token || accessSuspended) {
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        "Community X socket connected:",
        socket.id
      );

      socket.emit("authenticate-socket", { token });
    });

    socket.on("socket-authenticated", (data) => {
      console.log("Member socket authenticated:", data);
    });

    socket.on("socket-auth-error", (error) => {
      console.error(
        "Member socket authentication error:",
        error
      );

      if (error?.code === "COMMUNITY_MEMBER_BANNED") {
        handleAccessSuspended(
          error.reason,
          error.user || null
        );
      }
    });

    socket.on("member-banned", (payload) => {
      const bannedWallet = String(
        payload?.walletAddress || ""
      )
        .toLowerCase()
        .trim();

      if (
        bannedWallet &&
        currentWallet &&
        bannedWallet !== currentWallet
      ) {
        return;
      }

      handleAccessSuspended(
        payload?.reason,
        payload?.user || null
      );
    });

    // NEW PUBLISHED ANNOUNCEMENT

    socket.on("announcement:new", (announcement) => {
      if (!announcement) return;

      const isPublished =
        announcement.isPublished === true ||
        String(announcement.status || "").toLowerCase() ===
          "published";

      if (!isPublished) return;

      const announcementId =
        announcement._id ||
        announcement.id ||
        announcement.announcementId;

      const isFirstDelivery = rememberUnreadEvent(
        "announcements",
        announcementId
      );

      dispatch(addAnnouncement(announcement));
      dispatch(setAnnouncementsError(""));

      if (
        isFirstDelivery &&
        activeTabRef.current !== "announcements"
      ) {
        dispatch(
          incrementUnread({
            channel: "announcements",
          })
        );
      }
    });

    // UPDATED ANNOUNCEMENT

    socket.on("announcement:updated", (announcement) => {
      if (!announcement) return;

      const announcementId =
        announcement._id ||
        announcement.id ||
        announcement.announcementId;

      if (!announcementId) return;

      if (announcement.isPublished !== true) {
        dispatch(removeAnnouncement(String(announcementId)));
        return;
      }

      dispatch(addAnnouncement(announcement));
      dispatch(setAnnouncementsError(""));
    });

    // DELETED ANNOUNCEMENT

    socket.on("announcement:deleted", (payload) => {
      const announcementId = payload?.id || payload?._id;

      if (!announcementId) return;

      dispatch(removeAnnouncement(String(announcementId)));
    });

    // NEW GROUP MESSAGE

    socket.on("new-group-message", (newMessage) => {
      if (!newMessage) return;

      const formattedMessage = formatMessage(newMessage);

      if (!formattedMessage.id) return;

      const isFirstDelivery = rememberUnreadEvent(
        "group",
        formattedMessage.id
      );

      const senderWallet = String(
        newMessage.senderWallet ||
          newMessage.senderId ||
          ""
      )
        .toLowerCase()
        .trim();

      const isOwnMessage =
        senderWallet !== "" &&
        senderWallet === currentWallet;

      dispatch(addGroupMessage(formattedMessage));

      if (
        isFirstDelivery &&
        !isOwnMessage &&
        activeTabRef.current !== "group"
      ) {
        dispatch(
          incrementUnread({
            channel: "group",
          })
        );
      }
    });

    // UPDATED GROUP MESSAGE

    socket.on("message-updated", (updatedMessage) => {
      const updatedId = getMessageId(updatedMessage);

      if (!updatedId) return;

      dispatch(
        updateGroupMessage(
          buildMessageUpdate(
            {
              ...updatedMessage,
              isEdited: updatedMessage?.isEdited ?? true,
            },
            updatedId
          )
        )
      );
    });

    // DELETED GROUP MESSAGE

    socket.on("message-deleted", (deletedMessage) => {
      const deletedId = getMessageId(deletedMessage);

      if (!deletedId) return;

      dispatch(deleteGroupMessage(String(deletedId)));
    });

    // NEW PRIVATE ADMIN MESSAGE

    socket.on("new-private-message", (newMessage) => {
      if (!newMessage) return;

      if (!belongsToAdminConversation(newMessage)) {
        return;
      }

      const formattedMessage = formatMessage(newMessage);

      if (!formattedMessage.id) return;

      const isFirstDelivery = rememberUnreadEvent(
        "admin",
        formattedMessage.id
      );

      const senderWallet = String(
        newMessage.senderWallet ||
          newMessage.senderId ||
          ""
      )
        .toLowerCase()
        .trim();

      const isOwnMessage =
        senderWallet !== "" &&
        senderWallet === currentWallet;

      dispatch(addPrivateMessage(formattedMessage));

      if (
        isFirstDelivery &&
        !isOwnMessage &&
        activeTabRef.current !== "admin"
      ) {
        dispatch(
          incrementUnread({
            channel: "admin",
          })
        );
      }
    });

    // UPDATED PRIVATE ADMIN MESSAGE

    socket.on(
      "private-message-updated",
      (updatedMessage) => {
        const updatedId = getMessageId(updatedMessage);

        if (!updatedId) return;

        if (!belongsToAdminConversation(updatedMessage)) {
          return;
        }

        dispatch(
          updatePrivateMessage(
            buildMessageUpdate(
              {
                ...updatedMessage,
                isEdited: true,
              },
              updatedId
            )
          )
        );
      }
    );

    // DELETED PRIVATE ADMIN MESSAGE

    socket.on(
      "private-message-deleted",
      (deletedMessage) => {
        const deletedId = getMessageId(deletedMessage);

        if (!deletedId) return;

        dispatch(deletePrivateMessage(String(deletedId)));
      }
    );

    socket.on("disconnect", (reason) => {
      console.log(
        "Community X socket disconnected:",
        reason
      );
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [
    token,
    currentWallet,
    dispatch,
    accessSuspended,
    handleAccessSuspended,
  ]);

  // ----------------------------------------------------------
  // FETCH GROUP MESSAGES
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchGroupMessages = async () => {
      dispatch(setGroupLoading(true));

      if (!token || accessSuspended) {
        dispatch(setGroupMessages([]));
        dispatch(setGroupLoading(false));
        return;
      }

      try {
        const response = await fetch(`${API_URL}/group`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await readApiResponse(response);

        if (cancelled) return;

        if (!response.ok) {
          if (isBannedError(response.status, data)) {
            handleAccessSuspended(
              data.reason,
              data.user || null
            );
            return;
          }

          throw new Error(
            data.message || "Failed to fetch group messages"
          );
        }

        const serverMessages = Array.isArray(data)
          ? data
          : Array.isArray(data.messages)
            ? data.messages
            : Array.isArray(data.data)
              ? data.data
              : [];

        const formattedMessages = serverMessages
          .map(formatMessage)
          .filter((message) => message.id);

        if (!cancelled) {
          dispatch(setGroupMessages(formattedMessages));
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Fetch group messages error:", error);
        dispatch(setGroupMessages([]));
      } finally {
        if (!cancelled) {
          dispatch(setGroupLoading(false));
        }
      }
    };

    fetchGroupMessages();

    return () => {
      cancelled = true;
    };
  }, [
    token,
    dispatch,
    accessSuspended,
    handleAccessSuspended,
  ]);

  // ----------------------------------------------------------
  // FETCH PRIVATE ADMIN MESSAGES
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchPrivateMessages = async () => {
      dispatch(setPrivateLoading(true));

      if (!token || !currentWallet || accessSuspended) {
        dispatch(setPrivateMessages([]));
        dispatch(setPrivateLoading(false));
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/private/${ADMIN_IDENTIFIER}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await readApiResponse(response);

        if (cancelled) return;

        if (!response.ok) {
          if (isBannedError(response.status, data)) {
            handleAccessSuspended(
              data.reason,
              data.user || null
            );
            return;
          }

          throw new Error(
            data.message || "Failed to fetch private messages"
          );
        }

        const serverMessages = Array.isArray(data)
          ? data
          : Array.isArray(data.messages)
            ? data.messages
            : Array.isArray(data.data)
              ? data.data
              : [];

        const formattedMessages = serverMessages
          .filter(belongsToAdminConversation)
          .map(formatMessage)
          .filter((message) => message.id);

        if (!cancelled) {
          dispatch(setPrivateMessages(formattedMessages));
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Fetch private messages error:", error);
        dispatch(setPrivateMessages([]));
      } finally {
        if (!cancelled) {
          dispatch(setPrivateLoading(false));
        }
      }
    };

    fetchPrivateMessages();

    return () => {
      cancelled = true;
    };
  }, [
    token,
    currentWallet,
    dispatch,
    accessSuspended,
    handleAccessSuspended,
  ]);

  // ----------------------------------------------------------
  // FETCH PUBLISHED ANNOUNCEMENTS
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchAnnouncements = async () => {
      dispatch(setAnnouncementsLoading(true));
      dispatch(setAnnouncementsError(""));

      if (!token || accessSuspended) {
        dispatch(setAnnouncements([]));

        if (!accessSuspended) {
          dispatch(
            setAnnouncementsError(
              "Your session has expired. Please log in again."
            )
          );
        }

        dispatch(setAnnouncementsLoading(false));
        return;
      }

      try {
        const response = await fetch(ANNOUNCEMENTS_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await readApiResponse(response);

        if (cancelled) return;

        if (!response.ok) {
          if (isBannedError(response.status, data)) {
            handleAccessSuspended(
              data.reason,
              data.user || null
            );
            return;
          }

          if (response.status === 401) {
            throw new Error(
              "Your session is invalid or expired. Please log in again."
            );
          }

          throw new Error(
            data?.message || "Failed to load announcements."
          );
        }

        const items = Array.isArray(data?.announcements)
          ? data.announcements
          : [];

        const publishedItems = items.filter(
          (item) => item.isPublished === true
        );

        if (!cancelled) {
          dispatch(
            setAnnouncements(
              [...publishedItems].sort(
                (a, b) =>
                  new Date(b.createdAt || 0).getTime() -
                  new Date(a.createdAt || 0).getTime()
              )
            )
          );
        }
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Fetch community announcements error:",
          error
        );

        dispatch(setAnnouncements([]));

        dispatch(
          setAnnouncementsError(
            error.message ||
              "Unable to load announcements. Please try again."
          )
        );
      } finally {
        if (!cancelled) {
          dispatch(setAnnouncementsLoading(false));
        }
      }
    };

    fetchAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [
    token,
    announcementRetry,
    dispatch,
    accessSuspended,
    handleAccessSuspended,
  ]);

  // ----------------------------------------------------------
  // SEND OR EDIT MESSAGE
  // ----------------------------------------------------------

  const handleSendMessage = async (
    event,
    selectedFile = null
  ) => {
    event?.preventDefault();

    const trimmedText = inputText.trim();

    if (accessSuspended) {
      alert("Your Community X access has been suspended.");
      return false;
    }

    if (sending) return false;

    if (
      !trimmedText &&
      !selectedFile &&
      !editingMessageId
    ) {
      return false;
    }

    if (!currentUser.walletAddress) {
      alert(
        "Wallet information is missing. Please connect your wallet again."
      );
      return false;
    }

    if (!token) {
      alert(
        "Your Community X session has expired. Please login again."
      );
      return false;
    }

    if (profileLoading) {
      alert("Please wait while your profile is loading.");
      return false;
    }

    const validProfileName =
      savedProfile?.fullName?.trim() ||
      reduxUser?.fullName?.trim() ||
      communityUserFromState?.fullName?.trim();

    if (!validProfileName) {
      alert(
        "Your saved profile name could not be loaded. " +
          "Please refresh and try again. If the problem continues, " +
          "check your profile API in the browser Network tab."
      );
      return false;
    }

    setSending(true);

    try {
      // EDIT EXISTING MESSAGE

      if (editingMessageId) {
        if (selectedFile) {
          alert(
            "Please finish editing before attaching a document."
          );
          return false;
        }

        if (!trimmedText) {
          alert(
            "Message text cannot be empty while editing."
          );
          return false;
        }

        const isPrivateChat = activeTab === "admin";

        const endpoint = isPrivateChat
          ? `${API_URL}/private/${editingMessageId}`
          : `${API_URL}/group/${editingMessageId}`;

        const response = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: trimmedText,
          }),
        });

        const data = await readApiResponse(response);

        if (!response.ok) {
          if (isBannedError(response.status, data)) {
            handleAccessSuspended(
              data.reason,
              data.user || null
            );
            return false;
          }

          throw new Error(
            data.message || "Failed to update message"
          );
        }

        const updatedMessage =
          data?.data || data?.messageData || null;

        const updatePayload = updatedMessage
          ? buildMessageUpdate(
              {
                ...updatedMessage,
                isEdited: true,
                message:
                  updatedMessage.message ?? trimmedText,
              },
              editingMessageId
            )
          : {
              id: String(editingMessageId),
              text: trimmedText,
              isEdited: true,
            };

        if (isPrivateChat) {
          dispatch(updatePrivateMessage(updatePayload));
        } else {
          dispatch(updateGroupMessage(updatePayload));
        }

        setEditingMessageId(null);
        setInputText("");
        setShowEmojiPicker(false);

        return true;
      }

      // BUILD FORM DATA

      const formData = new FormData();

      formData.append("senderName", validProfileName);
      formData.append("message", trimmedText);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      // SEND PRIVATE ADMIN MESSAGE

      if (activeTab === "admin") {
        const response = await fetch(
          `${API_URL}/private/${ADMIN_IDENTIFIER}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const data = await readApiResponse(response);

        if (!response.ok) {
          if (isBannedError(response.status, data)) {
            handleAccessSuspended(
              data.reason,
              data.user || null
            );
            return false;
          }

          throw new Error(
            data.message || "Failed to send private message"
          );
        }

        const createdMessage =
          data?.data ||
          data?.messageData ||
          (data?._id ? data : null);

        if (createdMessage) {
          const formattedMessage = formatMessage(createdMessage);

          if (formattedMessage.id) {
            dispatch(addPrivateMessage(formattedMessage));
          }
        }

        setInputText("");
        setShowEmojiPicker(false);

        return true;
      }

      // SEND GROUP MESSAGE

      const response = await fetch(`${API_URL}/group`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        if (isBannedError(response.status, data)) {
          handleAccessSuspended(
            data.reason,
            data.user || null
          );
          return false;
        }

        throw new Error(
          data.message || "Failed to send group message"
        );
      }

      const createdMessage =
        data?.data ||
        data?.messageData ||
        (data?._id ? data : null);

      if (createdMessage) {
        const formattedMessage = formatMessage(createdMessage);

        if (formattedMessage.id) {
          dispatch(addGroupMessage(formattedMessage));
        }
      }

      setInputText("");
      setShowEmojiPicker(false);

      return true;
    } catch (error) {
      console.error("Send/update message error:", error);

      alert(error.message || "Failed to send message.");

      return false;
    } finally {
      setSending(false);
    }
  };

  // ----------------------------------------------------------
  // START EDIT
  // ----------------------------------------------------------

  const handleStartEdit = (message) => {
    if (accessSuspended || !message?.id) return;

    setEditingMessageId(message.id);
    setInputText(message.text || "");
    setShowEmojiPicker(false);
  };

  // ----------------------------------------------------------
  // DELETE MESSAGE
  // ----------------------------------------------------------

  const handleDeleteMessage = async (messageId) => {
    if (accessSuspended) {
      alert("Your Community X access has been suspended.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this message?"
    );

    if (!confirmed) return;

    if (!token) {
      alert(
        "Your session has expired. Please login again."
      );
      return;
    }

    try {
      setDeletingMessageId(messageId);

      const isPrivateChat = activeTab === "admin";

      const endpoint = isPrivateChat
        ? `${API_URL}/private/${messageId}`
        : `${API_URL}/group/${messageId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        if (isBannedError(response.status, data)) {
          handleAccessSuspended(
            data.reason,
            data.user || null
          );
          return;
        }

        throw new Error(
          data.message || "Failed to delete message"
        );
      }

      if (isPrivateChat) {
        dispatch(deletePrivateMessage(String(messageId)));
      } else {
        dispatch(deleteGroupMessage(String(messageId)));
      }

      if (String(editingMessageId) === String(messageId)) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error("Delete message error:", error);

      alert(error.message || "Failed to delete message.");
    } finally {
      setDeletingMessageId(null);
    }
  };

  // ----------------------------------------------------------
  // EMOJI
  // ----------------------------------------------------------

  const addEmoji = (emoji) => {
    if (accessSuspended) return;

    setInputText((previous) => `${previous}${emoji}`);
    setShowEmojiPicker(false);
  };

  // ----------------------------------------------------------
  // RETRY ANNOUNCEMENTS
  // ----------------------------------------------------------

  const retryAnnouncements = () => {
    if (accessSuspended) return;

    setAnnouncementRetry((previous) => previous + 1);
  };

  // ----------------------------------------------------------
  // AUTO SCROLL
  // ----------------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [groupMessages, privateMessages, activeTab]);

  // ----------------------------------------------------------
  // BANNED MEMBER SCREEN
  // ----------------------------------------------------------

  if (accessSuspended) {
    const bannedMemberName =
      savedProfile?.fullName?.trim() ||
      savedProfile?.username?.trim() ||
      reduxUser?.fullName?.trim() ||
      reduxUser?.username?.trim() ||
      communityUserFromState?.fullName?.trim() ||
      communityUserFromState?.username?.trim() ||
      "";

    return (
      <div className="cxchat-chat-app">
        <div className="cxchat-ambient-background">
          <div className="cxchat-ambient-light cxchat-ambient-light-one" />
          <div className="cxchat-ambient-light cxchat-ambient-light-two" />
          <div className="cxchat-ambient-light cxchat-ambient-light-three" />
        </div>

        <main
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minHeight: "100dvh",
            padding: "24px",
          }}
        >
          <section
            role="alert"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "36px 28px",
              textAlign: "center",
              color: "#ffffff",
              background: "rgba(18, 18, 30, 0.96)",
              border: "1px solid rgba(255, 90, 120, 0.35)",
              borderRadius: "20px",
              boxShadow: "0 20px 70px rgba(0, 0, 0, 0.35)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "64px",
                height: "64px",
                marginBottom: "20px",
                borderRadius: "50%",
                color: "#ff8fa3",
                background: "rgba(255, 90, 120, 0.12)",
                fontSize: "30px",
              }}
            >
              !
            </div>

            <h1
              style={{
                margin: "0 0 14px",
                fontSize: "clamp(22px, 4vw, 30px)",
                lineHeight: 1.25,
              }}
            >
              Community X Access Suspended
            </h1>

            {bannedMemberName && (
              <p
                style={{
                  margin: "0 0 18px",
                  color: "#ffffff",
                  fontWeight: 600,
                  overflowWrap: "anywhere",
                }}
              >
                Account: {bannedMemberName}
              </p>
            )}

            <p
              style={{
                margin: "0 0 20px",
                color: "#c6c6d4",
                lineHeight: 1.7,
              }}
            >
              Your access to the Community X platform
              has been suspended by an administrator.
            </p>

            {banReason && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "14px 16px",
                  textAlign: "left",
                  overflowWrap: "anywhere",
                  color: "#ffe0e6",
                  background: "rgba(255, 90, 120, 0.08)",
                  border: "1px solid rgba(255, 90, 120, 0.2)",
                  borderRadius: "12px",
                }}
              >
                <strong>Reason</strong>

                <p
                  style={{
                    margin: "6px 0 0",
                    lineHeight: 1.6,
                  }}
                >
                  {banReason}
                </p>
              </div>
            )}

            <p
              style={{
                margin: 0,
                color: "#a8a8ba",
                fontSize: "14px",
                lineHeight: 1.7,
              }}
            >
              If you believe this action was taken in error,
              please contact the Community X administrator.
            </p>
          </section>
        </main>
      </div>
    );
  }

  // ----------------------------------------------------------
  // SHARED CONTEXT VALUE
  // ----------------------------------------------------------

  const contextValue = {
    activeTab,

    currentUser,
    currentWallet,
    token,

    groupMessages,
    privateMessages,
    groupLoading,
    privateLoading,

    announcements,
    announcementsLoading,
    announcementsError,
    retryAnnouncements,

    unreadCounts,

    inputText,
    setInputText,

    showEmojiPicker,
    setShowEmojiPicker,

    sending,
    editingMessageId,
    deletingMessageId,

    messagesEndRef,

    handleSendMessage,
    handleStartEdit,
    handleCancelEdit,
    handleDeleteMessage,
    addEmoji,
  };

  // ----------------------------------------------------------
  // SHARED LAYOUT
  // ----------------------------------------------------------

  return (
    <CommunityChatContext.Provider value={contextValue}>
      <div className="cxchat-chat-app">
        <div className="cxchat-ambient-background">
          <div className="cxchat-ambient-light cxchat-ambient-light-one" />
          <div className="cxchat-ambient-light cxchat-ambient-light-two" />
          <div className="cxchat-ambient-light cxchat-ambient-light-three" />
        </div>

        {mobileMenuOpen && (
          <div
            className="cxchat-mobile-backdrop"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <ChatSidebar
          activeTab={activeTab}
          setActiveTab={handleTabNavigation}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentUser={currentUser}
          groupUnreadCount={unreadCounts?.group ?? 0}
          adminUnreadCount={unreadCounts?.admin ?? 0}
          announcementUnreadCount={
            unreadCounts?.announcements ?? 0
          }
        />

        <main className="cxchat-chat-main">
          <div className="cxchat-chat-card">
            <ChatHeader
              activeTab={activeTab}
              setActiveTab={handleTabNavigation}
              setMobileMenuOpen={setMobileMenuOpen}
              hasNewAnnouncements={
                (unreadCounts?.announcements ?? 0) > 0
              }
            />

            <Outlet />
          </div>
        </main>
      </div>
    </CommunityChatContext.Provider>
  );
};

export default CommunityLayout;