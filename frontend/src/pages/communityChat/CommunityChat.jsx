
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";

import {
  Users,
  Megaphone,
  Paperclip,
  Smile,
  Send,
  Crown,
  Menu,
  X,
  Shield,
  ChevronRight,
  Flame,
  CheckCheck,
  Pencil,
  Trash2,
  Check,
  XCircle,
} from "lucide-react";

import "./CommunityChat.css";

// ============================================================
// API URL
// ============================================================

const API_URL = "http://localhost:5000/api/messages";

// ============================================================
// SOCKET URL
// ============================================================

const SOCKET_URL = "http://localhost:5000";

// ============================================================
// DEFAULT AVATAR
// ============================================================

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

// ============================================================
// COMPONENT
// ============================================================

export default function CommunityChat() {
  const socketRef = useRef(null);
  const location = useLocation();

  // ============================================================
  // CURRENT USER
  // ============================================================

  const communityUser = location.state?.communityUser;
  const walletAddressFromState = location.state?.walletAddress;

  const CURRENT_USER = {
    walletAddress:
      communityUser?.walletAddress ||
      walletAddressFromState ||
      "",

    name:
      communityUser?.fullName ||
      communityUser?.username ||
      "Community Member",

    username: communityUser?.username || "",

    avatar:
      communityUser?.profileImage ||
      DEFAULT_AVATAR,

    isAdmin: false,
  };

  // ============================================================
  // JWT TOKEN
  // ============================================================

  const token = localStorage.getItem("communityXToken");

  // ============================================================
  // STATES
  // ============================================================

  const [activeTab, setActiveTab] = useState("group");

  // Backend group messages
  const [messages, setMessages] = useState([]);

  // Admin messages are local for now
  const [adminMessages, setAdminMessages] = useState([]);

  const [inputText, setInputText] = useState("");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [sending, setSending] = useState(false);

  // ============================================================
  // EDIT STATE
  // ============================================================

  const [editingMessageId, setEditingMessageId] =
    useState(null);

  const [editingText, setEditingText] =
    useState("");

  const [updatingMessage, setUpdatingMessage] =
    useState(false);

  const [deletingMessageId, setDeletingMessageId] =
    useState(null);

  const messagesEndRef = useRef(null);

  // ============================================================
  // SOCKET.IO CONNECTION
  // ============================================================

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        "Socket connected:",
        socket.id
      );
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ============================================================
  // RECEIVE REAL-TIME GROUP MESSAGES
  // ============================================================

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    const handleNewGroupMessage = (newMessage) => {
      console.log(
        "New real-time message:",
        newMessage
      );

      const formattedMessage = {
        id: newMessage._id,

        senderId:
          newMessage.senderWallet,

        senderName:
          newMessage.senderName,

        avatar:
          newMessage.senderAvatar || null,

        isAdmin: false,

        text:
          newMessage.message,

        time: new Date(
          newMessage.createdAt
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prevMessages) => {
        // Prevent duplicate message
        const alreadyExists =
          prevMessages.some(
            (msg) =>
              msg.id ===
              formattedMessage.id
          );

        if (alreadyExists) {
          return prevMessages;
        }

        return [
          ...prevMessages,
          formattedMessage,
        ];
      });
    };

    socket.on(
      "new-group-message",
      handleNewGroupMessage
    );

    return () => {
      socket.off(
        "new-group-message",
        handleNewGroupMessage
      );
    };
  }, []);

  // ============================================================
  // SCROLL TO BOTTOM
  // ============================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [
    messages,
    adminMessages,
    activeTab,
  ]);

  // ============================================================
  // GET GROUP MESSAGES
  // ============================================================

  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!token) {
        console.error(
          "Community X JWT token not found."
        );

        alert(
          "Authentication expired. Please connect your wallet again."
        );

        return;
      }

      try {
        setLoading(true);

        const response = await fetch(
          `${API_URL}/group`,
          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          throw new Error(
            "Authentication failed. Please connect your wallet again."
          );
        }

        if (!response.ok) {
          throw new Error(
            "Failed to fetch group messages"
          );
        }

        const data =
          await response.json();

        if (data.success) {
          const formattedMessages =
            data.messages.map((msg) => ({
              id: msg._id,

              // Wallet address acts as sender ID
              senderId:
                msg.senderWallet,

              senderName:
                msg.senderName,

              avatar:
                msg.senderAvatar ||
                null,

              isAdmin: false,

              text: msg.message,

              time: new Date(
                msg.createdAt
              ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }));

          setMessages(
            formattedMessages
          );
        }
      } catch (error) {
        console.error(
          "Fetch Group Messages Error:",
          error
        );

        if (
          error.message.includes(
            "Authentication failed"
          )
        ) {
          alert(error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroupMessages();
  }, [token]);

  // ============================================================
  // SEND GROUP MESSAGE
  // ============================================================

  const handleSendMessage = async (e) => {
    e?.preventDefault();

    const text = inputText.trim();

    if (!text || sending) {
      return;
    }

    // ============================================================
    // MAKE SURE CURRENT USER EXISTS
    // ============================================================

    if (!CURRENT_USER.walletAddress) {
      alert(
        "User information not found. Please connect your wallet again."
      );

      return;
    }

    // ============================================================
    // MAKE SURE JWT EXISTS
    // ============================================================

    if (!token) {
      alert(
        "Authentication token not found. Please connect your wallet again."
      );

      return;
    }

    // ============================================================
    // ADMIN TAB
    // ============================================================

    if (activeTab !== "group") {
      const localAdminMessage = {
        id: `local_${Date.now()}`,

        senderId:
          CURRENT_USER.walletAddress,

        senderName:
          CURRENT_USER.name,

        avatar:
          CURRENT_USER.avatar,

        isAdmin:
          CURRENT_USER.isAdmin,

        text,

        time:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
      };

      setAdminMessages((prev) => [
        ...prev,
        localAdminMessage,
      ]);

      setInputText("");
      setShowEmojiPicker(false);

      return;
    }

    // ============================================================
    // GROUP MESSAGE
    // ============================================================

    try {
      setSending(true);

      const response = await fetch(
        `${API_URL}/group`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            // JWT authentication
            Authorization: `Bearer ${token}`,
          },

          // IMPORTANT:
          // senderWallet is NOT sent.
          // Backend gets walletAddress from JWT.
          body: JSON.stringify({
            senderName:
              CURRENT_USER.name,

            senderAvatar:
              CURRENT_USER.avatar,

            message: text,
          }),
        }
      );

      if (response.status === 401) {
        throw new Error(
          "Authentication failed. Please connect your wallet again."
        );
      }

      if (!response.ok) {
        throw new Error(
          "Failed to send group message"
        );
      }

      const data =
        await response.json();

      if (data.success) {
        /*
          IMPORTANT:

          Do NOT add the message to state here.

          Backend already emits:
          "new-group-message"

          Socket.IO listener above will receive
          the saved MongoDB message and add it
          to the messages state.

          This prevents duplicate messages
          in the sender's own tab.
        */

        setInputText("");

        setShowEmojiPicker(false);
      } else {
        console.error(
          "Send message failed:",
          data.message
        );
      }
    } catch (error) {
      console.error(
        "Send Group Message Error:",
        error
      );

      alert(
        error.message ||
          "Failed to send message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // START EDIT MESSAGE
  // ============================================================

  const handleStartEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  };

  // ============================================================
  // CANCEL EDIT
  // ============================================================

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  // ============================================================
  // UPDATE MESSAGE
  // ============================================================

  const handleUpdateMessage = async (
    messageId
  ) => {
    const updatedText =
      editingText.trim();

    if (!updatedText) {
      alert(
        "Message cannot be empty."
      );

      return;
    }

    if (updatingMessage) {
      return;
    }

    // JWT check
    if (!token) {
      alert(
        "Authentication token not found. Please connect your wallet again."
      );

      return;
    }

    try {
      setUpdatingMessage(true);

      const response = await fetch(
        `${API_URL}/group/${messageId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            // JWT authentication
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            message: updatedText,
          }),
        }
      );

      if (response.status === 401) {
        throw new Error(
          "Authentication failed. Please connect your wallet again."
        );
      }

      if (!response.ok) {
        throw new Error(
          "Failed to update message"
        );
      }

      const data =
        await response.json();

      if (!data.success) {
        throw new Error(
          data.message ||
            "Failed to update message"
        );
      }

      setMessages(
        (prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  text: updatedText,
                }
              : msg
          )
      );

      setEditingMessageId(null);
      setEditingText("");
    } catch (error) {
      console.error(
        "Update Group Message Error:",
        error
      );

      alert(
        error.message ||
          "Failed to update message. Please try again."
      );
    } finally {
      setUpdatingMessage(false);
    }
  };

  // ============================================================
  // DELETE MESSAGE
  // ============================================================

  const handleDeleteMessage = async (
    messageId
  ) => {
    if (deletingMessageId) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this message?"
      );

    if (!confirmed) {
      return;
    }

    // JWT check
    if (!token) {
      alert(
        "Authentication token not found. Please connect your wallet again."
      );

      return;
    }

    try {
      setDeletingMessageId(
        messageId
      );

      const response = await fetch(
        `${API_URL}/group/${messageId}`,
        {
          method: "DELETE",

          headers: {
            // JWT authentication
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error(
          "Authentication failed. Please connect your wallet again."
        );
      }

      if (!response.ok) {
        throw new Error(
          "Failed to delete message"
        );
      }

      const data =
        await response.json();

      if (!data.success) {
        throw new Error(
          data.message ||
            "Failed to delete message"
        );
      }

      setMessages(
        (prevMessages) =>
          prevMessages.filter(
            (msg) =>
              msg.id !== messageId
          )
      );
    } catch (error) {
      console.error(
        "Delete Group Message Error:",
        error
      );

      alert(
        error.message ||
          "Failed to delete message. Please try again."
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  // ============================================================
  // EMOJI
  // ============================================================

  const addEmoji = (emoji) => {
    setInputText(
      (prev) => prev + emoji
    );
  };

  // ============================================================
  // CURRENT MESSAGES
  // ============================================================

  const currentMessages =
    activeTab === "group"
      ? messages
      : adminMessages;

  // ============================================================
  // JSX
  // ============================================================

  return (
    <div className="cxchat-chat-app">

      {/* Background Ambient Glows */}

      <div className="cxchat-ambient-bg-layer">
        <div className="cxchat-ambient-light-1" />
        <div className="cxchat-ambient-light-2" />
        <div className="cxchat-ambient-light-3" />
      </div>

      {/* Mobile Backdrop */}

      {mobileMenuOpen && (
        <div
          className="cxchat-mobile-backdrop"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        />
      )}

      {/* ========================================================
          SIDEBAR
      ======================================================== */}

      <aside
        className={`cxchat-chat-sidebar ${
          mobileMenuOpen
            ? "cxchat-sidebar-visible"
            : "cxchat-sidebar-hidden"
        }`}
      >
        <div>

          {/* Sidebar Header */}

          <div className="cxchat-sidebar-header">
            <div className="cxchat-sidebar-brand">

              <div className="cxchat-brand-icon">
                <Users size={22} />
              </div>

              <div className="cxchat-brand-info">
                <span className="cxchat-brand-name">
                  Community X
                </span>

                <span className="cxchat-brand-tag">
                  EXECUTIVE HUB
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                setMobileMenuOpen(false)
              }
              className="cxchat-sidebar-close-btn"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}

          <nav className="cxchat-sidebar-nav">

            <div className="cxchat-nav-section-title">
              Channels
            </div>

            {/* Group Chat */}

            <button
              onClick={() => {
                setActiveTab("group");
                setMobileMenuOpen(false);
              }}
              className={`cxchat-nav-item ${
                activeTab === "group"
                  ? "cxchat-nav-item-active"
                  : "cxchat-nav-item-inactive"
              }`}
            >
              <div className="cxchat-nav-item-left">
                <Users size={18} />

                <span>
                  Group Chat
                </span>
              </div>

              {activeTab === "group" && (
                <ChevronRight size={16} />
              )}
            </button>

            {/* Admin Messages */}

            <button
              onClick={() => {
                setActiveTab("admin");
                setMobileMenuOpen(false);
              }}
              className={`cxchat-nav-item ${
                activeTab === "admin"
                  ? "cxchat-nav-item-active"
                  : "cxchat-nav-item-inactive"
              }`}
            >
              <div className="cxchat-nav-item-left">
                <Megaphone size={18} />

                <span>
                  Admin Messages
                </span>
              </div>

              {activeTab === "admin" && (
                <ChevronRight size={16} />
              )}
            </button>

          </nav>
        </div>

        {/* ====================================================
            DYNAMIC CURRENT USER
        ==================================================== */}

        <div className="cxchat-sidebar-user">

          <div className="cxchat-user-card">

            <div className="cxchat-nav-item-left">

              <div className="cxchat-user-avatar-wrapper">

                <img
                  src={CURRENT_USER.avatar}
                  alt={CURRENT_USER.name}
                  className="cxchat-user-avatar"
                />

                <span className="cxchat-user-online-dot" />

              </div>

              <div className="cxchat-user-details">

                <span className="cxchat-user-name">
                  {CURRENT_USER.name}
                </span>

                <span className="cxchat-user-role">
                  {CURRENT_USER.isAdmin
                    ? "Administrator"
                    : "Member"}
                </span>

              </div>

            </div>

            <Flame
              size={16}
              style={{
                color: "#f472b6",
              }}
            />

          </div>

        </div>
      </aside>

      {/* ========================================================
          MAIN CHAT
      ======================================================== */}

      <main className="cxchat-chat-main">

        <div className="cxchat-chat-card">

          {/* Chat Header */}

          <header className="cxchat-chat-header">

            <div className="cxchat-header-left">

              {/* Mobile Menu */}

              <button
                onClick={() =>
                  setMobileMenuOpen(true)
                }
                className="cxchat-mobile-menu-btn"
              >
                <Menu size={22} />
              </button>

              {/* Header Icon */}

              <div className="cxchat-header-icon">

                {activeTab === "group" ? (
                  <Users size={18} />
                ) : (
                  <Shield size={18} />
                )}

              </div>

              {/* Header Title */}

              <div className="cxchat-header-title-box">

                <h1>
                  {activeTab === "group"
                    ? "Group Chat - Community X"
                    : "Admin Announcements"}
                </h1>

                <p className="cxchat-header-subtitle">

                  <span>
                    360 Members
                  </span>

                  <span>•</span>

                  <span className="cxchat-admin-dot-badge">

                    <span className="cxchat-dot-indicator" />

                    Admin

                  </span>

                </p>

              </div>
            </div>

            {/* Access Badge */}

            <div className="cxchat-access-badge">

              <Crown size={12} />

              Executive Access

            </div>

          </header>

          {/* ====================================================
              MESSAGES
          ==================================================== */}

          <div className="cxchat-messages-container">

            <div className="cxchat-messages-glow-1" />
            <div className="cxchat-messages-glow-2" />

            {/* Loading */}

            {loading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  opacity: 0.7,
                }}
              >
                Loading messages...
              </div>
            )}

            {/* Empty State */}

            {!loading &&
              currentMessages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    opacity: 0.6,
                  }}
                >
                  No messages yet.
                </div>
              )}

            {/* Message List */}

            {currentMessages.map((msg) => {

              const isSelf =
                msg.senderId?.toLowerCase() ===
                CURRENT_USER.walletAddress?.toLowerCase();

              const isEditing =
                editingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`cxchat-message-row ${
                    isSelf
                      ? "cxchat-message-row-self"
                      : ""
                  }`}
                >

                  {/* Avatar */}

                  <div className="cxchat-avatar-container">

                    {msg.isAdmin &&
                    !msg.avatar ? (
                      <div className="cxchat-msg-admin-avatar">

                        <Crown
                          size={18}
                          style={{
                            color: "#fef08a",
                          }}
                        />

                      </div>
                    ) : (
                      <img
                        src={
                          msg.avatar ||
                          DEFAULT_AVATAR
                        }
                        alt={msg.senderName}
                        className="cxchat-msg-avatar"
                      />
                    )}

                  </div>

                  {/* Message */}

                  <div
                    className={`cxchat-msg-wrapper ${
                      isSelf
                        ? "cxchat-msg-wrapper-self"
                        : "cxchat-msg-wrapper-other"
                    }`}
                  >

                    <div
                      className={`cxchat-message-bubble ${
                        isSelf
                          ? "cxchat-bubble-self"
                          : "cxchat-bubble-other"
                      }`}
                    >

                      {/* Message Header */}

                      <div className="cxchat-msg-header-info">

                        <span
                          className={
                            isSelf
                              ? "sender-name-self"
                              : "sender-name-other"
                          }
                        >
                          {msg.senderName}
                        </span>

                        {msg.isAdmin && (
                          <span className="cxchat-admin-tag">
                            ADMIN
                          </span>
                        )}

                      </div>

                      {/* EDIT MODE */}

                      {isEditing ? (

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            marginTop: "6px",
                          }}
                        >

                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) =>
                              setEditingText(
                                e.target.value
                              )
                            }
                            autoFocus
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border:
                                "1px solid rgba(244, 114, 182, 0.5)",
                              background:
                                "rgba(0, 0, 0, 0.35)",
                              color: "inherit",
                              outline: "none",
                            }}
                            onKeyDown={(e) => {

                              if (
                                e.key ===
                                "Enter"
                              ) {
                                handleUpdateMessage(
                                  msg.id
                                );
                              }

                              if (
                                e.key ===
                                "Escape"
                              ) {
                                handleCancelEdit();
                              }

                            }}
                          />

                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              justifyContent:
                                "flex-end",
                            }}
                          >

                            <button
                              type="button"
                              onClick={
                                handleCancelEdit
                              }
                              disabled={
                                updatingMessage
                              }
                              style={{
                                display: "flex",
                                alignItems:
                                  "center",
                                gap: "4px",
                                border: "none",
                                background:
                                  "transparent",
                                color:
                                  "#fca5a5",
                                cursor:
                                  "pointer",
                                fontSize: "12px",
                              }}
                            >
                              <XCircle size={14} />
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateMessage(
                                  msg.id
                                )
                              }
                              disabled={
                                updatingMessage
                              }
                              style={{
                                display: "flex",
                                alignItems:
                                  "center",
                                gap: "4px",
                                border: "none",
                                background:
                                  "transparent",
                                color:
                                  "#86efac",
                                cursor:
                                  "pointer",
                                fontSize: "12px",
                              }}
                            >
                              <Check size={14} />

                              {updatingMessage
                                ? "Saving..."
                                : "Save"}

                            </button>

                          </div>

                        </div>

                      ) : (

                        <p className="cxchat-msg-text">
                          {msg.text}
                        </p>

                      )}

                      {/* Message Footer */}

                      <div className="cxchat-msg-footer-info">

                        <span>
                          {msg.time}
                        </span>

                        {isSelf && (
                          <CheckCheck
                            size={13}
                            style={{
                              color:
                                "#fbcfe8",
                            }}
                          />
                        )}

                      </div>

                    </div>

                    {/* EDIT / DELETE BUTTONS */}

                    {isSelf &&
                      activeTab ===
                        "group" &&
                      !isEditing && (

                        <div
                          style={{
                            display: "flex",
                            gap: "5px",
                            marginTop: "5px",
                            justifyContent:
                              "flex-end",
                          }}
                        >

                          {/* Edit */}

                          <button
                            type="button"
                            onClick={() =>
                              handleStartEdit(
                                msg
                              )
                            }
                            title="Edit message"
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              width: "28px",
                              height: "28px",
                              borderRadius:
                                "7px",
                              border:
                                "1px solid rgba(244, 114, 182, 0.25)",
                              background:
                                "rgba(244, 114, 182, 0.08)",
                              color:
                                "#f9a8d4",
                              cursor:
                                "pointer",
                            }}
                          >
                            <Pencil size={13} />
                          </button>

                          {/* Delete */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMessage(
                                msg.id
                              )
                            }
                            disabled={
                              deletingMessageId ===
                              msg.id
                            }
                            title="Delete message"
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              width: "28px",
                              height: "28px",
                              borderRadius:
                                "7px",
                              border:
                                "1px solid rgba(248, 113, 113, 0.25)",
                              background:
                                "rgba(248, 113, 113, 0.08)",
                              color:
                                "#fca5a5",
                              cursor:
                                "pointer",
                              opacity:
                                deletingMessageId ===
                                msg.id
                                  ? 0.5
                                  : 1,
                            }}
                          >
                            <Trash2 size={13} />
                          </button>

                        </div>

                      )}

                  </div>

                </div>
              );
            })}

            <div ref={messagesEndRef} />

          </div>

          {/* ====================================================
              INPUT
          ==================================================== */}

          <footer className="cxchat-chat-footer">

            {/* Emoji Picker */}

            {showEmojiPicker && (

              <div className="cxchat-emoji-picker-popup">

                {[
                  "👍",
                  "🎉",
                  "👏",
                  "❤️",
                  "🔥",
                  "🚀",
                  "😊",
                  "🙌",
                ].map((emoji) => (

                  <button
                    key={emoji}
                    onClick={() =>
                      addEmoji(emoji)
                    }
                    className="cxchat-emoji-btn"
                    type="button"
                  >
                    {emoji}
                  </button>

                ))}

              </div>

            )}

            {/* Message Form */}

            <form
              onSubmit={handleSendMessage}
              className="cxchat-chat-input-form"
            >

              {/* Input */}

              <div className="cxchat-input-field-wrapper">

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) =>
                    setInputText(
                      e.target.value
                    )
                  }
                  placeholder="Type a message..."
                  className="cxchat-chat-text-input"
                />

                {/* Emoji Button */}

                <button
                  type="button"
                  onClick={() =>
                    setShowEmojiPicker(
                      !showEmojiPicker
                    )
                  }
                  className="cxchat-input-icon-btn"
                  title="Add emoji"
                >
                  <Smile size={20} />
                </button>

              </div>

              {/* Attachment */}

              <button
                type="button"
                className="cxchat-action-icon-btn"
                title="Attach file"
              >
                <Paperclip size={20} />
              </button>

              {/* Send */}

              <button
                type="submit"
                disabled={
                  !inputText.trim() ||
                  sending
                }
                className="cxchat-send-submit-btn"
              >
                <Send size={18} />
              </button>

            </form>

          </footer>

        </div>

      </main>

    </div>
  );
}

