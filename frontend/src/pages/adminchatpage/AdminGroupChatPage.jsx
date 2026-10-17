import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useDispatch, useSelector } from "react-redux";

import {
  setAdminGroupMessages,
  setAdminGroupLoading,
} from "../../features/chat/chatSlice";

import { useAdminChat } from "../../context/AdminChatProvider";

import "../adminpage/AdminChat.css";
import "./AdminGroupChatPage.css";

const API_URL = "http://localhost:5000/api/admin";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

/* ------------------------------------------------------------
   Document sharing settings
   ------------------------------------------------------------ */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_FILES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.png,.jpg,.jpeg,.webp";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
})();

const getFileExtension = (name = "") => {
  const parts = String(name).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!size || size < 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

// Accepts several possible shapes coming back from the backend
const getAttachment = (message) => {
  const raw =
    message?.attachment ||
    message?.document ||
    (message?.fileUrl || message?.documentUrl
      ? {
          url: message.fileUrl || message.documentUrl,
          name: message.fileName || message.documentName,
          size: message.fileSize,
          type: message.fileType || message.mimeType,
        }
      : null);

  if (!raw) return null;

  const rawUrl = raw.url || raw.path || "";
  if (!rawUrl) return null;

  const url = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `${API_ORIGIN}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

  const name = raw.name || raw.originalName || raw.fileName || "Document";
  const extension = getFileExtension(name);
  const type = raw.type || raw.mimeType || "";

  return {
    url,
    name,
    size: raw.size,
    type,
    extension,
    isImage:
      String(type).startsWith("image/") ||
      IMAGE_EXTENSIONS.includes(extension),
  };
};

/* ------------------------------------------------------------
   Inline SVG icons (no dependency on bootstrap-icons being loaded)
   ------------------------------------------------------------ */
const ICON_PATHS = {
  send: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  refresh: (
    <>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="5" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="12" cy="19" r="1.2" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  chat: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  paperclip: (
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5M12 15V3" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
};

function Icon({ name }) {
  return (
    <svg
      className="gc-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

const getMessageId = (message) =>
  String(message?._id || message?.id || message?.messageId || "");

const getToken = () => localStorage.getItem("adminToken") || "";

const getStoredAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem("adminUser") || "null");
  } catch {
    return null;
  }
};

const normalizeMessage = (message) => {
  const senderWallet = String(
    message?.senderWallet || message?.senderId || ""
  ).trim();

  return {
    ...message,
    id: getMessageId(message),
    senderWallet,
    senderName: message?.senderName || "Community Member",
    senderAvatar: message?.senderAvatar || "",
    message: message?.message ?? message?.text ?? "",
    isEdited: Boolean(message?.isEdited),
    isAdmin:
      Boolean(message?.isAdmin) ||
      senderWallet.toLowerCase().startsWith("admin:"),
  };
};

const getDateLabel = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getTimeLabel = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const mergeMessages = (current, incoming) => {
  const map = new Map();

  [...current, ...incoming]
    .map(normalizeMessage)
    .forEach((message, index) => {
      const key = message.id || `temporary-${index}`;
      map.set(key, {
        ...(map.get(key) || {}),
        ...message,
      });
    });

  return [...map.values()].sort(
    (a, b) =>
      new Date(a.createdAt || 0).getTime() -
      new Date(b.createdAt || 0).getTime()
  );
};

export default function AdminGroupChatPage() {
  const dispatch = useDispatch();

  const {
    adminVerified,
    adminLoading,
    adminError,
    socket,
    adminSocketAuthenticated,
  } = useAdminChat();

  const reduxMessages = useSelector(
    (state) => state.chat.adminGroupMessages || []
  );

  const reduxLoading = useSelector(
    (state) => Boolean(state.chat.adminGroupLoading)
  );

  const reduxAdmin = useSelector(
    (state) => state.auth.adminUser
  );

  const storedAdmin = useMemo(getStoredAdmin, []);

  const admin = reduxAdmin || storedAdmin || {};

  const adminId = String(
    admin.id || admin.adminId || admin._id || "ADM-001"
  );

  const adminIdentifier = `admin:${adminId}`.toLowerCase();

  const adminName =
    admin.name ||
    admin.fullName ||
    admin.username ||
    "Community X Admin";

  const adminAvatar =
    admin.avatar ||
    admin.profileImage ||
    DEFAULT_AVATAR;

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pageError, setPageError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [menuMessageId, setMenuMessageId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const initialLoadRef = useRef(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isEditing = Boolean(editingId);

  const editingMessage = useMemo(
    () =>
      isEditing
        ? reduxMessages.find(
            (message) => getMessageId(message) === editingId
          )
        : null,
    [isEditing, editingId, reduxMessages]
  );

  const request = useCallback(async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Admin token is missing. Please sign in again.");
    }

    // For file uploads the browser must set the multipart boundary itself
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message || `Request failed (${response.status}).`
      );
    }

    return data;
  }, []);

  const loadGroupMessages = useCallback(async () => {
    if (!adminVerified) return;

    dispatch(setAdminGroupLoading(true));
    setPageError("");

    try {
      const data = await request("/messages/group");

      const received = Array.isArray(data)
        ? data
        : data.messages || data.data?.messages || [];

      dispatch(
        setAdminGroupMessages(
          received.map(normalizeMessage)
        )
      );
    } catch (error) {
      setPageError(error.message || "Could not load group messages.");
    } finally {
      dispatch(setAdminGroupLoading(false));
    }
  }, [adminVerified, dispatch, request]);

  useEffect(() => {
    if (!adminVerified || initialLoadRef.current) return;

    initialLoadRef.current = true;
    loadGroupMessages();
  }, [adminVerified, loadGroupMessages]);

  // Use the socket provided by AdminChatProvider.
  // Do not create or disconnect a second socket in this page.
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload) => {
      const raw = payload?.message || payload;
      if (!raw) return;

      if (raw.chatType && raw.chatType !== "GROUP") return;

      const incoming = normalizeMessage(raw);

      if (!incoming.id) {
        loadGroupMessages();
        return;
      }

      dispatch(
        setAdminGroupMessages(
          mergeMessages(reduxMessages, [incoming])
        )
      );
    };

    const handleMessageUpdated = (payload) => {
      const raw = payload?.message || payload;
      if (!raw) return;

      const updated = normalizeMessage({
        ...raw,
        isEdited: true,
      });

      if (!updated.id) return;

      dispatch(
        setAdminGroupMessages(
          reduxMessages.map((message) =>
            getMessageId(message) === updated.id
              ? { ...message, ...updated, isEdited: true }
              : message
          )
        )
      );
    };

    const handleMessageDeleted = (payload) => {
      const id = getMessageId(payload?.message || payload) ||
        String(payload?.messageId || payload?.id || "");

      if (!id) return;

      dispatch(
        setAdminGroupMessages(
          reduxMessages.filter(
            (message) => getMessageId(message) !== id
          )
        )
      );

      // The message being edited was deleted elsewhere
      if (id === editingId) {
        setEditingId("");
        setDraft("");
      }
    };

    socket.on("new-group-message", handleNewMessage);
    socket.on("message-updated", handleMessageUpdated);
    socket.on("message-deleted", handleMessageDeleted);

    return () => {
      socket.off("new-group-message", handleNewMessage);
      socket.off("message-updated", handleMessageUpdated);
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [socket, dispatch, reduxMessages, loadGroupMessages, editingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [reduxMessages.length]);

  /* ---------------- Documents ---------------- */

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setPageError(
        `"${file.name}" is too large. Maximum size is ${formatFileSize(
          MAX_FILE_SIZE
        )}.`
      );
      return;
    }

    setPageError("");
    setSelectedFile(file);
    inputRef.current?.focus();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  /* ---------------- Send / edit ---------------- */

  const sendMessage = async (event) => {
    event.preventDefault();

    // In edit mode the same input saves the edit
    if (isEditing) {
      await saveEdit();
      return;
    }

    const text = draft.trim();
    if ((!text && !selectedFile) || sending) return;

    setSending(true);
    setPageError("");

    try {
      let body;

      if (selectedFile) {
        body = new FormData();
        body.append("senderName", adminName);
        body.append("senderAvatar", adminAvatar);
        body.append("message", text);
        body.append("file", selectedFile);
      } else {
        body = JSON.stringify({
          senderName: adminName,
          senderAvatar: adminAvatar,
          message: text,
        });
      }

      const data = await request("/messages/group", {
        method: "POST",
        body,
      });

      const raw = data.message || data.data?.message;

      if (raw) {
        const message = normalizeMessage({
          ...raw,
          senderWallet: raw.senderWallet || adminIdentifier,
          senderName: raw.senderName || adminName,
          senderAvatar: raw.senderAvatar || adminAvatar,
          isAdmin: true,
        });

        dispatch(
          setAdminGroupMessages(
            mergeMessages(reduxMessages, [message])
          )
        );
      } else {
        await loadGroupMessages();
      }

      setDraft("");
      setSelectedFile(null);
    } catch (error) {
      setPageError(error.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  // Edit now happens in the main input bar
  const startEditing = (message) => {
    setEditingId(getMessageId(message));
    setDraft(message.message || "");
    setSelectedFile(null);
    setMenuMessageId("");
    setPageError("");

    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setEditingId("");
    setDraft("");
  };

  const saveEdit = async () => {
    const id = editingId;
    const text = draft.trim();

    if (!id || !text || sending) return;

    setSending(true);
    setPageError("");

    try {
      const data = await request(`/messages/group/${id}`, {
        method: "PUT",
        body: JSON.stringify({ message: text }),
      });

      const raw = data.message || data.data?.message;

      dispatch(
        setAdminGroupMessages(
          reduxMessages.map((item) =>
            getMessageId(item) === id
              ? normalizeMessage({
                  ...item,
                  ...(raw || {}),
                  id,
                  message: raw?.message ?? text,
                  isEdited: true,
                })
              : item
          )
        )
      );

      setEditingId("");
      setDraft("");
    } catch (error) {
      setPageError(error.message || "Message could not be edited.");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (message) => {
    const id = getMessageId(message);
    if (!id) return;

    if (!window.confirm("Delete this group message?")) return;

    setPageError("");

    try {
      await request(`/messages/group/${id}`, {
        method: "DELETE",
      });

      dispatch(
        setAdminGroupMessages(
          reduxMessages.filter(
            (item) => getMessageId(item) !== id
          )
        )
      );

      if (id === editingId) {
        setEditingId("");
        setDraft("");
      }

      setMenuMessageId("");
    } catch (error) {
      setPageError(error.message || "Message could not be deleted.");
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Escape" && isEditing) {
      event.preventDefault();
      cancelEditing();
    }
  };

  if (adminLoading) {
    return (
      <div className="admin-group-page-state">
        <div className="admin-group-state-card">
          <span className="admin-group-spinner" />
          <p>Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (!adminVerified) {
    return (
      <div className="admin-group-page-state">
        <div className="admin-group-state-card">
          <Icon name="shield" />
          <h2>Admin access required</h2>
          <p>{adminError || "Please sign in with your admin account."}</p>
        </div>
      </div>
    );
  }

  let previousDateLabel = "";

  const canSend = isEditing
    ? Boolean(draft.trim())
    : Boolean(draft.trim() || selectedFile);

  return (
    <section className="admin-group-page">
      <section className="admin-group-chat-panel">
        {pageError && (
          <div className="admin-group-error" role="alert">
            <Icon name="alert" />
            <span>{pageError}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setPageError("")}
            >
              <Icon name="close" />
            </button>
          </div>
        )}

        <div
          className="admin-group-messages"
          ref={messagesContainerRef}
        >
          {reduxLoading && reduxMessages.length === 0 ? (
            <div className="admin-group-empty-state">
              <span className="admin-group-spinner" />
              <p>Loading group messages…</p>
            </div>
          ) : reduxMessages.length === 0 ? (
            <div className="admin-group-empty-state">
              <Icon name="chat" />
              <strong>No messages yet</strong>
              <p>Send the first message to the community.</p>
            </div>
          ) : (
            reduxMessages.map((originalMessage, index) => {
              const message = normalizeMessage(originalMessage);
              const id = getMessageId(message);
              const attachment = getAttachment(originalMessage);

              const dateLabel = getDateLabel(
                message.createdAt || message.updatedAt || Date.now()
              );

              const showDate = dateLabel !== previousDateLabel;
              previousDateLabel = dateLabel;

              const senderWallet = String(
                message.senderWallet || ""
              ).toLowerCase();

              const isOwnMessage =
                senderWallet === adminIdentifier ||
                senderWallet === adminId.toLowerCase();

              const isBeingEdited = isEditing && editingId === id;

              return (
                <React.Fragment key={id || `message-${index}`}>
                  {showDate && (
                    <div className="admin-group-date-divider">
                      <span>{dateLabel}</span>
                    </div>
                  )}

                  <article
                    className={`message-row ${
                      isOwnMessage ? "message-row-own" : ""
                    } ${isBeingEdited ? "message-row-editing" : ""}`}
                  >
                    <div
                      className={`avatar-circle ${
                        message.isAdmin ? "avatar-admin" : ""
                      }`}
                    >
                      <img
                        src={message.senderAvatar || DEFAULT_AVATAR}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                    </div>

                    <div className="message-bubble">
                      <div className="message-meta">
                        <span className="message-sender">
                          {message.senderName}
                          {message.isAdmin && (
                            <span className="admin-group-role-label">
                              ADMIN
                            </span>
                          )}
                        </span>

                        {isOwnMessage && (
                          <div className="admin-group-message-actions">
                            <button
                              type="button"
                              className="admin-group-menu-trigger"
                              aria-label="Message options"
                              onClick={() =>
                                setMenuMessageId(
                                  menuMessageId === id ? "" : id
                                )
                              }
                            >
                              <Icon name="more" />
                            </button>

                            {menuMessageId === id && (
                              <div className="admin-group-message-menu">
                                {message.message && (
                                  <button
                                    type="button"
                                    onClick={() => startEditing(message)}
                                  >
                                    <Icon name="edit" />
                                    Edit
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => deleteMessage(message)}
                                >
                                  <Icon name="trash" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {attachment &&
                        (attachment.isImage ? (
                          <a
                            className="admin-group-attachment-image"
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img src={attachment.url} alt={attachment.name} />
                          </a>
                        ) : (
                          <a
                            className="admin-group-attachment"
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={attachment.name}
                          >
                            <span className="admin-group-attachment-icon">
                              <Icon name="file" />
                            </span>
                            <span className="admin-group-attachment-info">
                              <strong title={attachment.name}>
                                {attachment.name}
                              </strong>
                              <small>
                                {[
                                  attachment.extension.toUpperCase(),
                                  formatFileSize(attachment.size),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </small>
                            </span>
                            <span className="admin-group-attachment-action">
                              <Icon name="download" />
                            </span>
                          </a>
                        ))}

                      {message.message && (
                        <p className="message-text">{message.message}</p>
                      )}

                      <div className="admin-group-message-footer">
                        {message.isEdited && (
                          <span className="admin-group-edited-label">
                            (edited)
                          </span>
                        )}
                        <time className="message-time">
                          {getTimeLabel(
                            message.createdAt || message.updatedAt
                          )}
                        </time>
                      </div>
                    </div>
                  </article>
                </React.Fragment>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="admin-group-composer">
          {isEditing && (
            <div className="admin-group-edit-banner">
              <span className="admin-group-edit-banner-icon">
                <Icon name="edit" />
              </span>
              <span className="admin-group-edit-banner-text">
                <strong>Editing message</strong>
                <small>
                  {editingMessage?.message || "Update your message below"}
                </small>
              </span>
              <button
                type="button"
                className="admin-group-edit-banner-close"
                aria-label="Cancel editing"
                title="Cancel (Esc)"
                onClick={cancelEditing}
              >
                <Icon name="close" />
              </button>
            </div>
          )}

          {selectedFile && !isEditing && (
            <div className="admin-group-file-chip">
              <span className="admin-group-attachment-icon">
                <Icon name="file" />
              </span>
              <span className="admin-group-attachment-info">
                <strong title={selectedFile.name}>{selectedFile.name}</strong>
                <small>
                  {[
                    getFileExtension(selectedFile.name).toUpperCase(),
                    formatFileSize(selectedFile.size),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>
              <button
                type="button"
                className="admin-group-edit-banner-close"
                aria-label="Remove attachment"
                onClick={removeSelectedFile}
                disabled={sending}
              >
                <Icon name="close" />
              </button>
            </div>
          )}

          <form
            className="message-input-bar admin-group-input-bar"
            onSubmit={sendMessage}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILES}
              onChange={handleFileChange}
              hidden
            />

            <button
              className="admin-group-attach-btn"
              type="button"
              aria-label="Attach a document"
              title="Attach a document"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || isEditing}
            >
              <Icon name="paperclip" />
            </button>

            <input
              ref={inputRef}
              className="message-input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={
                isEditing
                  ? "Edit your message…"
                  : selectedFile
                  ? "Add a caption (optional)…"
                  : "Write a message to the community…"
              }
              maxLength={5000}
              disabled={sending}
            />

            <button
              className="send-btn"
              type="submit"
              disabled={sending || !canSend}
              aria-label={isEditing ? "Save edit" : "Send message"}
              title={isEditing ? "Save edit" : "Send message"}
            >
              {sending ? (
                <span className="admin-group-button-spinner" />
              ) : (
                <Icon name={isEditing ? "check" : "send"} />
              )}
            </button>
          </form>
        </div>
      </section>
    </section>
  );
}
