
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

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
  setAnnouncements,
  setAnnouncementsLoading,
  setAnnouncementsError,

  incrementUnread,
  clearUnread,
} from "../../features/chat/chatSlice";

import ChatSidebar from "../../components/community-chat/ChatSidebar";
import ChatHeader from "../../components/community-chat/ChatHeader";
import ChatMessages from "../../components/community-chat/ChatMessages";
import ChatInput from "../../components/community-chat/ChatInput";

import "./CommunityChat.css";

// ============================================================
// API CONFIGURATION
// ============================================================

const API_URL = "http://localhost:5000/api/messages";
const SOCKET_URL = "http://localhost:5000";
const ANNOUNCEMENTS_URL = "http://localhost:5000/api/announcements";

const ADMIN_IDENTIFIER = "admin:adm-001";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

// ============================================================
// MESSAGE HELPERS
// ============================================================

const getMessageId = (message) =>
  message?._id ||
  message?.id ||
  message?.messageId ||
  null;

const getAnnouncementCategory = (priority) => {
  switch (String(priority || "").toUpperCase()) {
    case "URGENT":
      return { label: "CRITICAL UPDATE", icon: "🚨" };

    case "IMPORTANT":
      return { label: "PRODUCT FEATURE", icon: "✨" };

    default:
      return { label: "OFFICIAL UPDATE", icon: "📢" };
  }
};

const formatAnnouncementDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ============================================================
// ANNOUNCEMENT PANEL
// ============================================================

const AnnouncementPanel = ({
  announcements,
  loading,
  error,
  onRetry,
}) => {
  return (
    <section className="cxchat-announcements">
      <div className="cxchat-announcements-banner">
        <div className="cxchat-announcements-banner-icon">
          <span role="img" aria-label="Announcement">
            📣
          </span>
        </div>

        <div>
          <div className="cxchat-announcements-eyebrow">
            COMMUNITY X · OFFICIAL
          </div>

          <h2>Announcements</h2>

          <p>
            Important updates and news from your community admin.
          </p>
        </div>
      </div>

      <div className="cxchat-announcements-section-heading">
        <div>
          <h3>Community Updates</h3>
          <p>Stay informed about what's happening.</p>
        </div>
      </div>

      <div className="cxchat-announcements-list">
        {loading ? (
          <div className="cxchat-announcements-state">
            <p>Loading community announcements...</p>
          </div>
        ) : error ? (
          <div className="cxchat-announcements-state">
            <p>{error}</p>

            <button type="button" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="cxchat-announcements-state">
            <p>No published announcements yet.</p>
          </div>
        ) : (
          announcements.map((announcement) => {
            const category = getAnnouncementCategory(
              announcement.priority
            );

            return (
              <article
                className="cxchat-announcement-card"
                key={
                  announcement._id ||
                  announcement.id ||
                  announcement.announcementId
                }
              >
                <div className="cxchat-announcement-card-icon">
                  <span role="img" aria-label={category.label}>
                    {category.icon}
                  </span>
                </div>

                <div className="cxchat-announcement-card-content">
                  <span className="cxchat-announcement-category">
                    {category.label}
                  </span>

                  <h4>{announcement.title}</h4>
                  <p>{announcement.content}</p>

                  {announcement.info && (
                    <p className="cxchat-announcement-info">
                      {announcement.info}
                    </p>
                  )}

                  <span className="cxchat-announcement-date">
                    {formatAnnouncementDate(announcement.createdAt)}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>

      {!loading && !error && announcements.length > 0 && (
        <div className="cxchat-announcements-footer">
          <span>✦</span>
          You're all caught up on these updates.
        </div>
      )}
    </section>
  );
};

// ============================================================
// COMMUNITY CHAT
// ============================================================

const CommunityChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ==========================================================
  // ACTIVE ROUTE
  // ==========================================================

  const activeTab =
    location.pathname === "/private-chat"
      ? "admin"
      : location.pathname === "/announcements"
        ? "announcements"
        : "group";

  // ==========================================================
  // REDUX STATE
  // ==========================================================

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

  // ==========================================================
  // AUTHENTICATION AND CURRENT USER
  // ==========================================================

  const communityUser = location.state?.communityUser;
  const walletAddressFromState = location.state?.walletAddress;

  const storedWallet = localStorage.getItem("communityXWallet");
  const token = localStorage.getItem("communityXToken");

  const currentUser = {
    walletAddress:
      communityUser?.walletAddress ||
      walletAddressFromState ||
      storedWallet ||
      "",

    name:
      communityUser?.fullName ||
      communityUser?.username ||
      "Community Member",

    username: communityUser?.username || "",

    avatar: communityUser?.profileImage || DEFAULT_AVATAR,

    isAdmin: false,
  };

  const currentWallet = String(
    currentUser.walletAddress || ""
  )
    .toLowerCase()
    .trim();

  const adminIdentifier = ADMIN_IDENTIFIER.toLowerCase();

  // ==========================================================
  // LOCAL UI STATE
  // ==========================================================

  const [inputText, setInputText] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  const [announcementRetry, setAnnouncementRetry] = useState(0);

  // ==========================================================
  // REFS
  // ==========================================================

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Track the latest route without reconnecting the socket.
  const activeTabRef = useRef(activeTab);

  // Track delivered events so duplicate socket events do not
  // repeatedly increment unread counts.
  const seenUnreadEventsRef = useRef(new Set());

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // ==========================================================
  // UNREAD EVENT HELPER
  // ==========================================================

  const rememberUnreadEvent = (channel, eventId) => {
    if (!eventId) return false;

    const key = `${channel}:${String(eventId)}`;
    const seen = seenUnreadEventsRef.current;

    if (seen.has(key)) return false;

    seen.add(key);

    // Keep the in-memory deduplication set bounded.
    if (seen.size > 2000) {
      const recentKeys = Array.from(seen).slice(-1000);

      seen.clear();

      recentKeys.forEach((recentKey) => {
        seen.add(recentKey);
      });

      seen.add(key);
    }

    return true;
  };

  // ==========================================================
  // MESSAGE FORMATTER
  // ==========================================================

  const formatMessage = (message) => {
    const createdAt = message?.createdAt || null;

    const senderWallet = String(
      message?.senderWallet || ""
    );

    return {
      id: String(getMessageId(message) || ""),

      senderId: senderWallet,
      senderWallet,

      receiverWallet: message?.receiverWallet || null,

      senderName:
        message?.senderName || "Community Member",

      avatar:
        message?.senderAvatar || DEFAULT_AVATAR,

      isAdmin:
        senderWallet.toLowerCase() === adminIdentifier,

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

  // ==========================================================
  // PARTIAL MESSAGE UPDATE
  // ==========================================================

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

  // ==========================================================
  // PRIVATE ADMIN CONVERSATION CHECK
  // ==========================================================

  const belongsToAdminConversation = (message) => {
    const senderWallet = String(
      message?.senderWallet || ""
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

  // ==========================================================
  // CANCEL EDIT
  // Declared before navigation so the handler is available.
  // ==========================================================

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setInputText("");
    setShowEmojiPicker(false);
  };

  // ==========================================================
  // ROUTE NAVIGATION AND CLEAR UNREAD
  // ==========================================================

  const handleTabNavigation = (tab) => {
    handleCancelEdit();

    const routes = {
      group: "/community-chat",
      admin: "/private-chat",
      announcements: "/announcements",
    };

    // Update immediately, before the route effect runs.
    activeTabRef.current = tab;

    dispatch(clearUnread(tab));

    navigate(routes[tab] || "/community-chat");

    setMobileMenuOpen(false);
  };

  // ==========================================================
  // SOCKET.IO
  // ==========================================================

  useEffect(() => {
    if (!token) {
      console.warn("Community X token not found.");
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // --------------------------------------------------------
    // SOCKET AUTHENTICATION
    // --------------------------------------------------------

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
    });

    // --------------------------------------------------------
    // ANNOUNCEMENT: NEW
    // --------------------------------------------------------

    socket.on("announcement:new", (incomingAnnouncement) => {
      if (!incomingAnnouncement) return;

      const isPublished =
        incomingAnnouncement.isPublished === true ||
        String(incomingAnnouncement.status || "")
          .toLowerCase() === "published";

      if (!isPublished) return;

      const announcementId =
        incomingAnnouncement._id ||
        incomingAnnouncement.id ||
        incomingAnnouncement.announcementId;

      const isFirstDelivery = rememberUnreadEvent(
        "announcements",
        announcementId
      );

      dispatch(addAnnouncement(incomingAnnouncement));
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

    // --------------------------------------------------------
    // GROUP: NEW MESSAGE
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // GROUP: MESSAGE UPDATED
    // --------------------------------------------------------

    socket.on("message-updated", (updatedMessage) => {
      const updatedId = getMessageId(updatedMessage);

      if (!updatedId) return;

      dispatch(
        updateGroupMessage(
          buildMessageUpdate(updatedMessage, updatedId)
        )
      );
    });

    // --------------------------------------------------------
    // GROUP: MESSAGE DELETED
    // --------------------------------------------------------

    socket.on("message-deleted", (deletedMessage) => {
      const deletedId = getMessageId(deletedMessage);

      if (!deletedId) return;

      dispatch(deleteGroupMessage(String(deletedId)));
    });

    // --------------------------------------------------------
    // PRIVATE: NEW MESSAGE
    // --------------------------------------------------------

    socket.on("new-private-message", (newMessage) => {
      if (!newMessage) return;

      if (!belongsToAdminConversation(newMessage)) return;

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

    // --------------------------------------------------------
    // PRIVATE: MESSAGE UPDATED
    // --------------------------------------------------------

    socket.on("private-message-updated", (updatedMessage) => {
      const updatedId = getMessageId(updatedMessage);

      if (!updatedId) return;

      if (!belongsToAdminConversation(updatedMessage)) return;

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
    });

    // --------------------------------------------------------
    // PRIVATE: MESSAGE DELETED
    // --------------------------------------------------------

    socket.on("private-message-deleted", (deletedMessage) => {
      const deletedId = getMessageId(deletedMessage);

      if (!deletedId) return;

      dispatch(deletePrivateMessage(String(deletedId)));
    });

    // --------------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------------

    socket.on("disconnect", () => {
      console.log("Community X socket disconnected");
    });

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    return () => {
      socket.removeAllListeners();
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [token, currentWallet, dispatch]);

  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [groupMessages, privateMessages, activeTab]);

  // ==========================================================
  // FETCH GROUP MESSAGES
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const fetchGroupMessages = async () => {
      dispatch(setGroupLoading(true));

      if (!token) {
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

        const data = await response.json();

        if (!response.ok) {
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
        console.error(
          "Fetch group messages error:",
          error
        );

        if (!cancelled) {
          dispatch(setGroupMessages([]));
        }
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
  }, [token, dispatch]);

  // ==========================================================
  // FETCH PRIVATE MESSAGES
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const fetchPrivateMessages = async () => {
      dispatch(setPrivateLoading(true));

      if (!token || !currentWallet) {
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

        const data = await response.json();

        if (!response.ok) {
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
        console.error(
          "Fetch private messages error:",
          error
        );

        if (!cancelled) {
          dispatch(setPrivateMessages([]));
        }
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
  }, [token, currentWallet, dispatch]);

  // ==========================================================
  // FETCH PUBLISHED ANNOUNCEMENTS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const fetchAnnouncements = async () => {
      dispatch(setAnnouncementsLoading(true));
      dispatch(setAnnouncementsError(""));

      try {
        const response = await fetch(ANNOUNCEMENTS_URL, {
          method: "GET",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || "Failed to load announcements."
          );
        }

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.announcements)
            ? data.announcements
            : Array.isArray(data?.data)
              ? data.data
              : [];

        const publishedItems = items.filter(
          (item) =>
            item.isPublished === true ||
            String(item.status || "").toLowerCase() ===
            "published"
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
        console.error(
          "Fetch community announcements error:",
          error
        );

        if (!cancelled) {
          dispatch(setAnnouncements([]));

          dispatch(
            setAnnouncementsError(
              error.message ||
              "Unable to load announcements. Please try again."
            )
          );
        }
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
  }, [announcementRetry, dispatch]);

  // ==========================================================
  // SEND / EDIT MESSAGE
  // ==========================================================


  const readApiResponse = async (response) => {
  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(
      `The server returned an unexpected response (${response.status}). Check the backend terminal.`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
};


  const handleSendMessage = async (
    event,
    selectedFile = null
  ) => {
    event?.preventDefault();

    const trimmedText = inputText.trim();

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

    setSending(true);

    try {
      // --------------------------------------------------------
      // EDIT EXISTING MESSAGE
      // --------------------------------------------------------

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
          throw new Error(
            data.message || "Failed to update message"
          );
        }

        const updatedMessage =
          data?.data ||
          data?.messageData ||
          null;

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

      // --------------------------------------------------------
      // CREATE FORM DATA
      // --------------------------------------------------------

      // --------------------------------------------------------
      // CREATE FORM DATA
      // --------------------------------------------------------

      const formData = new FormData();

      formData.append("senderName", currentUser.name);

      // Base64 images are too large for Multer text fields.
      // Only send normal avatar URLs through this request.
      const avatar = currentUser.avatar || "";

      const avatarForMessage = avatar.startsWith("data:")
        ? DEFAULT_AVATAR
        : avatar;

      formData.append("senderAvatar", avatarForMessage);
      formData.append("message", trimmedText);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      // --------------------------------------------------------
      // PRIVATE ADMIN CHAT
      // --------------------------------------------------------

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

        const data = await response.json();

        if (!response.ok) {
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

      // --------------------------------------------------------
      // GROUP CHAT
      // --------------------------------------------------------

      const response = await fetch(`${API_URL}/group`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
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

  // ==========================================================
  // START EDIT
  // ==========================================================

  const handleStartEdit = (message) => {
    if (!message?.id) return;

    setEditingMessageId(message.id);
    setInputText(message.text || "");
    setShowEmojiPicker(false);
  };

  // ==========================================================
  // DELETE MESSAGE
  // ==========================================================

  const handleDeleteMessage = async (messageId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this message?"
    );

    if (!confirmed) return;

    if (!token) {
      alert("Your session has expired. Please login again.");
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

      const data = await response.json();

      if (!response.ok) {
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

  // ==========================================================
  // EMOJI
  // ==========================================================

  const addEmoji = (emoji) => {
    setInputText((previous) => `${previous}${emoji}`);
    setShowEmojiPicker(false);
  };

  // ==========================================================
  // CURRENT CHAT DATA
  // ==========================================================

  const isAnnouncementsTab = activeTab === "announcements";

  const currentMessages =
    activeTab === "group"
      ? groupMessages
      : privateMessages;

  const currentLoading =
    activeTab === "group"
      ? groupLoading
      : privateLoading;

  // ==========================================================
  // JSX
  // ==========================================================

  return (
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

          {isAnnouncementsTab ? (
            <AnnouncementPanel
              announcements={announcements}
              loading={announcementsLoading}
              error={announcementsError}
              onRetry={() =>
                setAnnouncementRetry((previous) => previous + 1)
              }
            />
          ) : (
            <>
              <ChatMessages
                messages={currentMessages}
                loading={currentLoading}
                activeTab={activeTab}
                currentUser={currentUser}
                editingMessageId={editingMessageId}
                handleStartEdit={handleStartEdit}
                handleCancelEdit={handleCancelEdit}
                handleDeleteMessage={handleDeleteMessage}
                deletingMessageId={deletingMessageId}
                messagesEndRef={messagesEndRef}
              />

              <ChatInput
                inputText={inputText}
                setInputText={setInputText}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                addEmoji={addEmoji}
                handleSendMessage={handleSendMessage}
                sending={sending}
                editingMessageId={editingMessageId}
                onCancelEdit={handleCancelEdit}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default CommunityChat;
