import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";

import ChatSidebar from "../../components/community-chat/ChatSidebar";
import ChatHeader from "../../components/community-chat/ChatHeader";
import ChatMessages from "../../components/community-chat/ChatMessages";
import ChatInput from "../../components/community-chat/ChatInput";

import "./CommunityChat.css";

const API_URL = "http://localhost:5000/api/messages";
const SOCKET_URL = "http://localhost:5000";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

const CommunityChat = () => {
  const location = useLocation();

  const communityUser =
    location.state?.communityUser;

  const walletAddressFromState =
    location.state?.walletAddress;

  const currentUser = {
    walletAddress:
      communityUser?.walletAddress ||
      walletAddressFromState ||
      "",

    name:
      communityUser?.fullName ||
      communityUser?.username ||
      "Community Member",

    username:
      communityUser?.username || "",

    avatar:
      communityUser?.profileImage ||
      DEFAULT_AVATAR,

    isAdmin: false,
  };

  const token =
    localStorage.getItem("communityXToken");

  /* ----------------------------- */
  /* State */
  /* ----------------------------- */

  const [activeTab, setActiveTab] =
    useState("group");

  const [messages, setMessages] =
    useState([]);

  const [adminMessages, setAdminMessages] =
    useState([]);

  const [inputText, setInputText] =
    useState("");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [editingMessageId, setEditingMessageId] =
    useState(null);

  const [editingText, setEditingText] =
    useState("");

  const [updatingMessage, setUpdatingMessage] =
    useState(false);

  const [deletingMessageId, setDeletingMessageId] =
    useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  /* ----------------------------- */
  /* Socket.IO */
  /* ----------------------------- */

  useEffect(() => {
    if (!token) {
      console.warn(
        "Community X token not found."
      );

      return;
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

      socket.emit("authenticate-socket", {
        token,
      });
    });

    socket.on(
      "socket-authenticated",
      (data) => {
        console.log(
          "Socket authenticated:",
          data
        );
      }
    );

    socket.on(
      "socket-auth-error",
      (error) => {
        console.error(
          "Socket authentication error:",
          error
        );
      }
    );

    socket.on("disconnect", () => {
      console.log(
        "Community X socket disconnected"
      );
    });

    /* New group message */
    socket.on(
      "new-group-message",
      (newMessage) => {
        const formattedMessage = {
          id:
            newMessage._id ||
            newMessage.id,

          senderId:
            newMessage.senderWallet,

          senderWallet:
            newMessage.senderWallet,

          senderName:
            newMessage.senderName ||
            "Community Member",

          avatar:
            newMessage.senderAvatar ||
            DEFAULT_AVATAR,

          isAdmin:
            newMessage.isAdmin || false,

          text:
            newMessage.message || "",

          time: new Date(
            newMessage.createdAt ||
              Date.now()
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => {
          const exists = prev.some(
            (message) =>
              message.id ===
              formattedMessage.id
          );

          if (exists) {
            return prev;
          }

          return [
            ...prev,
            formattedMessage,
          ];
        });
      }
    );

    /* Updated message */
    socket.on(
      "message-updated",
      (updatedMessage) => {
        setMessages((prev) =>
          prev.map((message) => {
            if (
              message.id ===
              (updatedMessage._id ||
                updatedMessage.id)
            ) {
              return {
                ...message,
                text:
                  updatedMessage.message,
              };
            }

            return message;
          })
        );
      }
    );

    /* Deleted message */
    socket.on(
      "message-deleted",
      (deletedMessage) => {
        const deletedId =
          deletedMessage._id ||
          deletedMessage.id ||
          deletedMessage.messageId;

        setMessages((prev) =>
          prev.filter(
            (message) =>
              message.id !== deletedId
          )
        );
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  /* ----------------------------- */
  /* Auto Scroll */
  /* ----------------------------- */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    messages,
    adminMessages,
    activeTab,
  ]);

  /* ----------------------------- */
  /* Fetch Group Messages */
  /* ----------------------------- */

  useEffect(() => {
    const fetchGroupMessages = async () => {
      try {
        setLoading(true);

        if (!token) {
          console.warn(
            "No Community X token found."
          );

          setMessages([]);
          return;
        }

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
          console.error(
            "Community X token expired or invalid."
          );

          setMessages([]);
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to fetch messages"
          );
        }

        const serverMessages =
          Array.isArray(data)
            ? data
            : data.messages || [];

        const formattedMessages =
          serverMessages.map(
            (message) => ({
              id:
                message._id ||
                message.id,

              senderId:
                message.senderWallet,

              senderWallet:
                message.senderWallet,

              senderName:
                message.senderName ||
                "Community Member",

              avatar:
                message.senderAvatar ||
                DEFAULT_AVATAR,

              isAdmin:
                message.isAdmin || false,

              text:
                message.message || "",

              time: new Date(
                message.createdAt ||
                  Date.now()
              ).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              ),
            })
          );

        setMessages(
          formattedMessages
        );
      } catch (error) {
        console.error(
          "Fetch group messages error:",
          error
        );

        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupMessages();
  }, [token]);

  /* ----------------------------- */
  /* Send Message */
  /* ----------------------------- */

  const handleSendMessage = async (event) => {
    event?.preventDefault();

    const trimmedText =
      inputText.trim();

    if (!trimmedText) {
      return;
    }

    if (!currentUser.walletAddress) {
      alert(
        "Wallet information is missing. Please connect your wallet again."
      );

      return;
    }

    if (!token) {
      alert(
        "Your Community X session has expired. Please login again."
      );

      return;
    }

    try {
      setSending(true);

      /* ----------------------------- */
      /* Admin tab - local message */
      /* ----------------------------- */

      if (activeTab !== "group") {
        const newAdminMessage = {
          id: `local_${Date.now()}`,

          senderId:
            currentUser.walletAddress,

          senderWallet:
            currentUser.walletAddress,

          senderName:
            currentUser.name,

          avatar:
            currentUser.avatar,

          isAdmin: false,

          text: trimmedText,

          time: new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
        };

        setAdminMessages((prev) => [
          ...prev,
          newAdminMessage,
        ]);

        setInputText("");
        setShowEmojiPicker(false);

        return;
      }

      /* ----------------------------- */
      /* Group message */
      /* ----------------------------- */

      const response = await fetch(
        `${API_URL}/group`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            senderName:
              currentUser.name,

            senderAvatar:
              currentUser.avatar,

            message: trimmedText,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to send message"
        );
      }

      setInputText("");
      setShowEmojiPicker(false);

      /*
       * Socket.IO will normally send the
       * new message back to the clients.
       * We don't manually add it here to
       * prevent duplicate messages.
       */
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      alert(
        error.message ||
          "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  };

  /* ----------------------------- */
  /* Start Edit */
  /* ----------------------------- */

  const handleStartEdit = (message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text);
  };

  /* ----------------------------- */
  /* Cancel Edit */
  /* ----------------------------- */

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  /* ----------------------------- */
  /* Update Message */
  /* ----------------------------- */

  const handleUpdateMessage = async (
    messageId
  ) => {
    const trimmedText =
      editingText.trim();

    if (!trimmedText) {
      return;
    }

    if (!token) {
      alert(
        "Your session has expired. Please login again."
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

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            message: trimmedText,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update message"
        );
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                text: trimmedText,
              }
            : message
        )
      );

      handleCancelEdit();
    } catch (error) {
      console.error(
        "Update message error:",
        error
      );

      alert(
        error.message ||
          "Failed to update message."
      );
    } finally {
      setUpdatingMessage(false);
    }
  };

  /* ----------------------------- */
  /* Delete Message */
  /* ----------------------------- */

  const handleDeleteMessage = async (
    messageId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this message?"
    );

    if (!confirmed) {
      return;
    }

    if (!token) {
      alert(
        "Your session has expired. Please login again."
      );

      return;
    }

    try {
      setDeletingMessageId(messageId);

      const response = await fetch(
        `${API_URL}/group/${messageId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete message"
        );
      }

      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== messageId
        )
      );
    } catch (error) {
      console.error(
        "Delete message error:",
        error
      );

      alert(
        error.message ||
          "Failed to delete message."
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  /* ----------------------------- */
  /* Emoji */
  /* ----------------------------- */

  const addEmoji = (emoji) => {
    setInputText(
      (prev) => `${prev}${emoji}`
    );

    setShowEmojiPicker(false);
  };

  /* ----------------------------- */
  /* Current Messages */
  /* ----------------------------- */

  const currentMessages =
    activeTab === "group"
      ? messages
      : adminMessages;

  /* ----------------------------- */
  /* JSX */
  /* ----------------------------- */

  return (
    <div className="cxchat-chat-app">
      {/* Ambient Background */}
      <div className="cxchat-ambient-background">
        <div className="cxchat-ambient-light cxchat-ambient-light-one" />
        <div className="cxchat-ambient-light cxchat-ambient-light-two" />
        <div className="cxchat-ambient-light cxchat-ambient-light-three" />
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

      {/* Sidebar */}
      <ChatSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={
          setMobileMenuOpen
        }
        currentUser={currentUser}
      />

      {/* Main Chat */}
      <main className="cxchat-chat-main">
        <div className="cxchat-chat-card">
          {/* Header */}
          <ChatHeader
            activeTab={activeTab}
            setMobileMenuOpen={
              setMobileMenuOpen
            }
          />

          {/* Messages */}
          <ChatMessages
            messages={currentMessages}
            loading={loading}
            activeTab={activeTab}
            currentUser={currentUser}
            editingMessageId={
              editingMessageId
            }
            editingText={editingText}
            setEditingText={
              setEditingText
            }
            handleStartEdit={
              handleStartEdit
            }
            handleCancelEdit={
              handleCancelEdit
            }
            handleUpdateMessage={
              handleUpdateMessage
            }
            updatingMessage={
              updatingMessage
            }
            handleDeleteMessage={
              handleDeleteMessage
            }
            deletingMessageId={
              deletingMessageId
            }
            messagesEndRef={
              messagesEndRef
            }
          />

          {/* Input */}
          <ChatInput
            inputText={inputText}
            setInputText={setInputText}
            showEmojiPicker={
              showEmojiPicker
            }
            setShowEmojiPicker={
              setShowEmojiPicker
            }
            addEmoji={addEmoji}
            handleSendMessage={
              handleSendMessage
            }
            sending={sending}
          />
        </div>
      </main>
    </div>
  );
};

export default CommunityChat;