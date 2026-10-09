
import React, { useEffect, useRef, useState } from "react";
import "./ChatMessages.css";

import {
  Crown,
  CheckCheck,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  ExternalLink,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

const ChatMessages = ({
  messages = [],
  loading,
  activeTab,
  currentUser,
  editingMessageId,
  handleStartEdit,
  handleCancelEdit,
  handleDeleteMessage,
  deletingMessageId,
  messagesEndRef,
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // Close menu when switching tabs
  useEffect(() => {
    setOpenMenuId(null);
  }, [activeTab]);

  // Date helpers
  const getDateKey = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  };

  const isToday = (dateValue) => {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    const today = new Date();

    if (Number.isNaN(date.getTime())) return false;

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isYesterday = (dateValue) => {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    const yesterday = new Date();

    if (Number.isNaN(date.getTime())) return false;

    yesterday.setDate(yesterday.getDate() - 1);

    return (
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()
    );
  };

  const formatDateSeparator = (dateValue) => {
    if (!dateValue) return "";

    if (isToday(dateValue)) return "Today";
    if (isYesterday(dateValue)) return "Yesterday";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Check whether this message belongs to the current user
  const isOwnMessage = (message) => {
    if (!message || !currentUser) return false;

    const messageWallet =
      message.senderWallet?.toLowerCase?.() || "";

    const userWallet =
      currentUser.walletAddress?.toLowerCase?.() || "";

    return Boolean(
      messageWallet &&
      userWallet &&
      messageWallet === userWallet
    );
  };

  // Support backend attachment URLs such as /uploads/document.pdf
  // and absolute URLs if the backend returns them.
  const getAttachmentUrl = (attachment) => {
    if (!attachment?.url) return "";

    if (/^https?:\/\//i.test(attachment.url)) {
      return attachment.url;
    }

    return `${API_BASE_URL}${
      attachment.url.startsWith("/")
        ? attachment.url
        : `/${attachment.url}`
    }`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="cxchat-messages-container">
        <div className="cxchat-loading-state">
          <div className="cxchat-loading-spinner" />
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!messages.length) {
    return (
      <div className="cxchat-messages-container">
        <div className="cxchat-empty-state">
          <div className="cxchat-empty-icon">
            <Crown size={26} />
          </div>

          <h3>
            {activeTab === "group"
              ? "No messages yet"
              : "No admin messages yet"}
          </h3>

          <p>
            {activeTab === "group"
              ? "Be the first person to start the conversation."
              : "Admin announcements will appear here."}
          </p>
        </div>

        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Message list
  return (
    <div className="cxchat-messages-container">
      <div className="cxchat-messages-list">
        {messages.map((message, index) => {
          const isSelf = isOwnMessage(message);
          const isAdminMessage = message.isAdmin === true;

          const isEditing =
            editingMessageId === message.id;

          const attachment = message.attachment;
          const attachmentUrl = getAttachmentUrl(attachment);

          const currentDateKey = getDateKey(
            message.createdAt
          );

          const previousDateKey =
            index > 0
              ? getDateKey(messages[index - 1]?.createdAt)
              : "";

          const showDateSeparator =
            index === 0 ||
            currentDateKey !== previousDateKey;

          return (
            <React.Fragment key={message.id || index}>
              {/* Date separator */}
              {showDateSeparator && message.createdAt && (
                <div className="cxchat-date-separator">
                  <span>
                    {formatDateSeparator(message.createdAt)}
                  </span>
                </div>
              )}

              {/* Message row */}
              <div
                className={`cxchat-message-row ${
                  isSelf
                    ? "cxchat-message-row-self"
                    : "cxchat-message-row-other"
                }`}
              >
                {/* Avatar */}
                <div className="cxchat-message-avatar-wrapper">
                  <img
                    src={message.avatar || DEFAULT_AVATAR}
                    alt={message.senderName || "Member"}
                    className="cxchat-message-avatar"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = DEFAULT_AVATAR;
                    }}
                  />

                  {isAdminMessage && (
                    <span className="cxchat-message-admin-crown">
                      <Crown size={9} />
                    </span>
                  )}
                </div>

                {/* Message wrapper */}
                <div
                  className={`cxchat-msg-wrapper ${
                    isSelf
                      ? "cxchat-msg-wrapper-self"
                      : "cxchat-msg-wrapper-other"
                  }`}
                >
                  {/* Sender name */}
                  <div
                    className={`cxchat-sender-name ${
                      isSelf
                        ? "cxchat-sender-name-self"
                        : "cxchat-sender-name-other"
                    }`}
                  >
                    <span>
                      {message.senderName || "Community Member"}
                    </span>

                    {isAdminMessage && (
                      <span className="cxchat-admin-label">
                        ADMIN
                      </span>
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`cxchat-message-bubble ${
                      isSelf
                        ? "cxchat-message-bubble-self"
                        : "cxchat-message-bubble-other"
                    } ${
                      isEditing
                        ? "cxchat-message-bubble-editing"
                        : ""
                    }`}
                  >
                    {/* Message text */}
                    {message.text && (
                      <div className="cxchat-message-text">
                        {message.text}
                      </div>
                    )}

                    {/* File attachment */}
                    {attachmentUrl && (
                      <a
                        className="cxchat-attachment-link"
                        href={attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open ${
                          attachment.originalName || "attachment"
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <FileText
                          size={19}
                          aria-hidden="true"
                        />

                        <span>
                          {attachment.originalName ||
                            "Open attachment"}
                        </span>

                        <ExternalLink
                          size={14}
                          aria-hidden="true"
                        />
                      </a>
                    )}

                    {/* Message metadata */}
                    <div className="cxchat-message-meta">
                      <span className="cxchat-message-time">
                        {message.time}
                      </span>

                      {message.isEdited && (
                        <span className="cxchat-edited-label">
                          (edited)
                        </span>
                      )}

                      {isSelf && (
                        <CheckCheck
                          size={15}
                          className="cxchat-message-check"
                        />
                      )}
                    </div>

                    {/* Three-dot menu: own non-admin messages only */}
                    {isSelf &&
                      !isAdminMessage &&
                      !isEditing && (
                        <div
                          className="cxchat-message-menu-wrapper"
                          ref={
                            openMenuId === message.id
                              ? menuRef
                              : null
                          }
                        >
                          <button
                            type="button"
                            className="cxchat-message-menu-button"
                            title="Message options"
                            aria-label="Message options"
                            aria-expanded={
                              openMenuId === message.id
                            }
                            onClick={(event) => {
                              event.stopPropagation();

                              setOpenMenuId((currentId) =>
                                currentId === message.id
                                  ? null
                                  : message.id
                              );
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === message.id && (
                            <div className="cxchat-message-menu">
                              {/* Edit */}
                              <button
                                type="button"
                                className="cxchat-message-menu-item"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleStartEdit(message);
                                }}
                                disabled={
                                  deletingMessageId === message.id
                                }
                              >
                                <Pencil size={14} />
                                <span>Edit</span>
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                className="cxchat-message-menu-item cxchat-message-menu-delete"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleDeleteMessage(message.id);
                                }}
                                disabled={
                                  deletingMessageId === message.id
                                }
                              >
                                {deletingMessageId === message.id ? (
                                  <span className="cxchat-menu-spinner" />
                                ) : (
                                  <Trash2 size={14} />
                                )}

                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Editing status */}
                  {isEditing && (
                    <div className="cxchat-editing-message-hint">
                      Editing this message
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Auto-scroll target */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;