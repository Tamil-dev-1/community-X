
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAdminChat } from "../../context/AdminChatProvider";
import {
  setAdminMembers,
  setAdminMembersLoading,
  setAdminPrivateMessages,
  addAdminPrivateMessage,
  updateAdminPrivateMessage,
  deleteAdminPrivateMessage,
  setActiveAdminMemberWallet,
  
} from "../../features/chat/chatSlice";
import "./AdminPrivateChat.css";

const API_URL = "http://localhost:5000/api/admin";

const getToken = () => localStorage.getItem("adminToken") || "";

const normalizeWallet = (value) =>
  String(value || "").trim().toLowerCase();

const getMemberWallet = (member) =>
  normalizeWallet(
    member?.walletAddress ||
      member?.wallet ||
      member?.address ||
      member?.memberWallet
  );

const getMessageId = (message) =>
  String(message?.id || message?._id || message?.messageId || "");

const getMessageText = (message) =>
  String(
    message?.message ??
      message?.text ??
      message?.content ??
      ""
  );

const getDisplayName = (member) =>
  member?.fullName ||
  member?.name ||
  member?.username ||
  member?.displayName ||
  "Community Member";

const getAvatar = (person) =>
  person?.profileImage ||
  person?.avatar ||
  person?.senderAvatar ||
  person?.image ||
  "";

const extractArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.messages)) return data.messages;

  return [];
};

const extractMessage = (payload) => {
  if (!payload) return null;

  if (payload.message && typeof payload.message === "object") {
    return payload.message;
  }

  if (payload.data && typeof payload.data === "object") {
    if (payload.data.message && typeof payload.data.message === "object") {
      return payload.data.message;
    }

    return payload.data;
  }

  return payload;
};

const getConversationWallet = (message, adminIdentifier) => {
  const sender = normalizeWallet(
    message?.senderWallet ||
      message?.sender?.walletAddress ||
      message?.sender?.wallet
  );

  const receiver = normalizeWallet(
    message?.receiverWallet ||
      message?.recipientWallet ||
      message?.receiver?.walletAddress ||
      message?.receiver?.wallet
  );

  if (sender && sender !== adminIdentifier && !sender.startsWith("admin:")) {
    return sender;
  }

  if (
    receiver &&
    receiver !== adminIdentifier &&
    !receiver.startsWith("admin:")
  ) {
    return receiver;
  }

  return normalizeWallet(
    message?.memberWallet || message?.wallet || message?.walletAddress
  );
};

const sortMessages = (messages) =>
  [...messages].sort(
    (a, b) =>
      new Date(a.createdAt || a.updatedAt || 0).getTime() -
      new Date(b.createdAt || b.updatedAt || 0).getTime()
  );

const formatTime = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateLabel = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

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

const AdminPrivateChatPage = () => {
  const dispatch = useDispatch();

  const {
    adminVerified,
    adminLoading,
    adminError,
    socket,
  } = useAdminChat();

  const {
    adminMembers,
    adminConversations,
    activeAdminMemberWallet,
    adminMembersLoading,
  } = useSelector((state) => state.chat);

  const reduxAdmin = useSelector((state) => state.auth?.adminUser);

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingDraft, setEditingDraft] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [sending, setSending] = useState(false);
  const [pageError, setPageError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const historyRequestRef = useRef(0);

  const storedAdmin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("adminUser") || "null");
    } catch {
      return null;
    }
  }, []);

  const adminUser = reduxAdmin || storedAdmin || {};

  const adminId = String(
    adminUser.id || adminUser.adminId || adminUser._id || "ADM-001"
  );

  const adminIdentifier = normalizeWallet(`admin:${adminId}`);

  const selectedWallet = normalizeWallet(activeAdminMemberWallet);

  const selectedMember = useMemo(
    () =>
      adminMembers.find(
        (member) => getMemberWallet(member) === selectedWallet
      ) || null,
    [adminMembers, selectedWallet]
  );

  const messages = useMemo(
    () => adminConversations[selectedWallet] || [],
    [adminConversations, selectedWallet]
  );

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...adminMembers]
      .filter((member) => {
        if (!query) return true;

        const searchable = [
          getDisplayName(member),
          member?.username,
          member?.email,
          getMemberWallet(member),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) =>
        getDisplayName(a).localeCompare(getDisplayName(b))
      );
  }, [adminMembers, search]);

  const isAdminMessage = useCallback(
    (message) => {
      const sender = normalizeWallet(
        message?.senderWallet ||
          message?.sender?.walletAddress ||
          message?.sender?.wallet
      );

      return (
        sender === adminIdentifier ||
        sender.startsWith("admin:")
      );
    },
    [adminIdentifier]
  );

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `Request failed (${response.status})`
      );
    }

    return data;
  }, []);

  // Load members for the member selector.
  const loadMembers = useCallback(async () => {
    if (!adminVerified) return;

    dispatch(setAdminMembersLoading(true));

    try {
      const data = await request("/members");
      const members = extractArray(data, ["members", "results"]);

      dispatch(setAdminMembers(members));

      const savedWallet = normalizeWallet(
        localStorage.getItem("adminActiveMemberWallet")
      );

      const savedMemberExists = members.some(
        (member) => getMemberWallet(member) === savedWallet
      );

      const currentMemberExists = members.some(
        (member) => getMemberWallet(member) === selectedWallet
      );

      if (currentMemberExists) {
        // Keep the current selection.
      } else if (savedWallet && savedMemberExists) {
        dispatch(setActiveAdminMemberWallet(savedWallet));
      } else if (members.length > 0) {
        const firstWallet = getMemberWallet(members[0]);

        if (firstWallet) {
          dispatch(setActiveAdminMemberWallet(firstWallet));
          localStorage.setItem("adminActiveMemberWallet", firstWallet);
        }
      }
    } catch (error) {
      setPageError(error.message || "Unable to load community members.");
    } finally {
      dispatch(setAdminMembersLoading(false));
    }
  }, [adminVerified, dispatch, request, selectedWallet]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Load the selected member's private conversation.
  useEffect(() => {
    if (!adminVerified || !selectedWallet) return undefined;

    const requestId = ++historyRequestRef.current;
    let cancelled = false;

    const loadHistory = async () => {
      setLoadingHistory(true);
      setPageError("");

      try {
        const data = await request(
          `/messages/private/${encodeURIComponent(selectedWallet)}`
        );

        if (cancelled || requestId !== historyRequestRef.current) return;

        const history = extractArray(data, [
          "messages",
          "conversation",
          "results",
        ]);

        dispatch(
          setAdminPrivateMessages({
            wallet: selectedWallet,
            messages: sortMessages(history),
          })
        );
      } catch (error) {
        if (!cancelled) {
          setPageError(error.message || "Unable to load private messages.");
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [adminVerified, dispatch, request, selectedWallet]);

  // Subscribe to private-message events on the provider's shared socket.
  useEffect(() => {
    if (!socket || !adminVerified) return undefined;

    const handleNewPrivateMessage = (payload) => {
      const message = extractMessage(payload);
      if (!message) return;

      const wallet = getConversationWallet(message, adminIdentifier);
      if (!wallet) return;

      dispatch(
        // Redux ignores duplicate IDs.
        addAdminPrivateMessage({ wallet, message })
      );
    };

    const handlePrivateMessageUpdated = (payload) => {
      const message = extractMessage(payload);
      if (!message) return;

      const wallet = getConversationWallet(message, adminIdentifier);
      if (!wallet) return;

      dispatch(
        updateAdminPrivateMessage({
          wallet,
          message,
        })
      );
    };

    const handlePrivateMessageDeleted = (payload) => {
      const wallet = normalizeWallet(
        payload?.wallet ||
          payload?.memberWallet ||
          payload?.receiverWallet ||
          payload?.senderWallet ||
          payload?.data?.wallet
      );

      const messageId = String(
        payload?.messageId ||
          payload?.id ||
          payload?._id ||
          payload?.data?.messageId ||
          payload?.data?.id ||
          ""
      );

      if (!wallet || !messageId) return;

      dispatch(deleteAdminPrivateMessage({ wallet, messageId }));
    };

    const handlePresenceUpdate = (payload) => {
      const wallet = normalizeWallet(
        payload?.wallet ||
          payload?.walletAddress ||
          payload?.memberWallet ||
          payload?.address
      );

      if (!wallet) return;

      const isOnline =
        payload?.isOnline ??
        payload?.online ??
        payload?.status === "online";

      const lastSeen = payload?.lastSeen || payload?.lastSeenAt;

      const updatedMembers = adminMembers.map((member) =>
        getMemberWallet(member) === wallet
          ? {
              ...member,
              isOnline: Boolean(isOnline),
              online: Boolean(isOnline),
              ...(lastSeen ? { lastSeen } : {}),
            }
          : member
      );

      dispatch(setAdminMembers(updatedMembers));
    };

    socket.on("new-private-message", handleNewPrivateMessage);
    socket.on("private-message-updated", handlePrivateMessageUpdated);
    socket.on("private-message-deleted", handlePrivateMessageDeleted);
    socket.on("presence-update", handlePresenceUpdate);

    return () => {
      socket.off("new-private-message", handleNewPrivateMessage);
      socket.off("private-message-updated", handlePrivateMessageUpdated);
      socket.off("private-message-deleted", handlePrivateMessageDeleted);
      socket.off("presence-update", handlePresenceUpdate);
    };
  }, [socket, adminVerified, adminIdentifier, adminMembers, dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedWallet]);

  const selectMember = (member) => {
    const wallet = getMemberWallet(member);
    if (!wallet) return;

    dispatch(setActiveAdminMemberWallet(wallet));
    localStorage.setItem("adminActiveMemberWallet", wallet);

    setPageError("");
    setDraft("");
    setEditingMessageId("");
    setEditingDraft("");
    setOpenMenuId("");
  };

  const sendMessage = async (event) => {
    event.preventDefault();

    const text = draft.trim();

    if (!text || !selectedWallet || sending) return;

    setSending(true);
    setPageError("");

    try {
      const data = await request(
        `/messages/private/${encodeURIComponent(selectedWallet)}`,
        {
          method: "POST",
          body: JSON.stringify({
            senderWallet: adminIdentifier,
            senderName:
              adminUser.fullName || adminUser.username || "Admin",
            senderAvatar: adminUser.profileImage || adminUser.avatar || "",
            message: text,
          }),
        }
      );

      const returnedMessage = extractMessage(data);

      if (
        returnedMessage &&
        (getMessageId(returnedMessage) ||
          getMessageText(returnedMessage))
      ) {
        dispatch(
          addAdminPrivateMessage({
            wallet: selectedWallet,
            message: returnedMessage,
          })
        );
      }

      setDraft("");
      textareaRef.current?.focus();
    } catch (error) {
      setPageError(error.message || "Unable to send the message.");
    } finally {
      setSending(false);
    }
  };

  const beginEdit = (message) => {
    setEditingMessageId(getMessageId(message));
    setEditingDraft(getMessageText(message));
    setOpenMenuId("");
  };

  const saveEdit = async (message) => {
    const messageId = getMessageId(message);
    const text = editingDraft.trim();

    if (!messageId || !text) return;

    try {
      setPageError("");

      const data = await request(`/messages/private/${messageId}`, {
        method: "PUT",
        body: JSON.stringify({ message: text }),
      });

      const updatedMessage = extractMessage(data);

      dispatch(
        updateAdminPrivateMessage({
          wallet: selectedWallet,
          message: {
            ...message,
            ...(updatedMessage || {}),
            message: text,
            isEdited: true,
          },
        })
      );

      setEditingMessageId("");
      setEditingDraft("");
    } catch (error) {
      setPageError(error.message || "Unable to edit the message.");
    }
  };

  const removeMessage = async (message) => {
    const messageId = getMessageId(message);

    if (!messageId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this message?"
    );

    if (!confirmed) return;

    try {
      setPageError("");

      await request(`/messages/private/${messageId}`, {
        method: "DELETE",
      });

      dispatch(
        deleteAdminPrivateMessage({
          wallet: selectedWallet,
          messageId,
        })
      );

      setOpenMenuId("");
    } catch (error) {
      setPageError(error.message || "Unable to delete the message.");
    }
  };

  const handleMemberKeyDown = (event, member) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectMember(member);
    }
  };

  if (adminLoading) {
    return (
      <div className="cx-private-page-state">
        <span className="cx-private-spinner" />
        <p>Verifying administrator access…</p>
      </div>
    );
  }

  if (!adminVerified) {
    return (
      <div className="cx-private-page-state">
        <h2>Admin access unavailable</h2>
        <p>
          {adminError ||
            "Your administrator session could not be verified."}
        </p>
        <button
          type="button"
          className="cx-private-retry"
          onClick={() => window.location.assign("/admin-login")}
        >
          Return to admin login
        </button>
      </div>
    );
  }

  return (
    <section className="cx-private-page">
      {pageError && (
        <div className="cx-private-error" role="alert">
          <span>{pageError}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setPageError("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="cx-private-workspace">
        <aside className="cx-private-members-panel">
          <div className="cx-private-members-heading">
            <div>
              <h2>Members</h2>
              <span>{adminMembers.length} community members</span>
            </div>
          </div>

          <label className="cx-private-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members..."
              aria-label="Search community members"
            />
          </label>

          <div className="cx-private-member-list">
            {adminMembersLoading ? (
              <p className="cx-private-list-message">Loading members…</p>
            ) : filteredMembers.length === 0 ? (
              <p className="cx-private-list-message">
                {search ? "No members match your search." : "No members found."}
              </p>
            ) : (
              filteredMembers.map((member) => {
                const wallet = getMemberWallet(member);
                const active = wallet === selectedWallet;
                const online = Boolean(member.isOnline ?? member.online);
                const avatar = getAvatar(member);

                return (
                  <div
                    key={wallet || member._id || member.id}
                    className={`cx-private-member ${
                      active ? "is-active" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectMember(member)}
                    onKeyDown={(event) =>
                      handleMemberKeyDown(event, member)
                    }
                  >
                    <div className="cx-private-avatar-wrap">
                      {avatar ? (
                        <img
                          className="cx-private-avatar"
                          src={avatar}
                          alt=""
                        />
                      ) : (
                        <div className="cx-private-avatar cx-private-avatar-fallback">
                          {getDisplayName(member).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`cx-private-online-dot ${
                          online ? "is-online" : ""
                        }`}
                      />
                    </div>

                    <div className="cx-private-member-info">
                      <strong>{getDisplayName(member)}</strong>
                      <span>
                        {online
                          ? "Online"
                          : member.lastSeen
                            ? `Last seen ${formatTime(member.lastSeen)}`
                            : "Offline"}
                      </span>
                    </div>

                    {active && (
                      <span className="cx-private-active-indicator" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main className="cx-private-conversation">
          {selectedMember ? (
            <>
              <header className="cx-private-chat-header">
                <div className="cx-private-chat-person">
                  {getAvatar(selectedMember) ? (
                    <img
                      className="cx-private-avatar"
                      src={getAvatar(selectedMember)}
                      alt=""
                    />
                  ) : (
                    <div className="cx-private-avatar cx-private-avatar-fallback">
                      {getDisplayName(selectedMember)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h2>{getDisplayName(selectedMember)}</h2>
                    <span>
                      {Boolean(
                        selectedMember.isOnline ?? selectedMember.online
                      )
                        ? "Online"
                        : "Private conversation"}
                    </span>
                  </div>
                </div>

                <span className="cx-private-chat-label">DIRECT MESSAGE</span>
              </header>

              <div className="cx-private-messages">
                {loadingHistory ? (
                  <div className="cx-private-empty">
                    <span className="cx-private-spinner" />
                    <p>Loading conversation…</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="cx-private-empty">
                    <div className="cx-private-empty-icon">✉</div>
                    <h3>Start the conversation</h3>
                    <p>
                      Send a private message to{" "}
                      {getDisplayName(selectedMember)}.
                    </p>
                  </div>
                ) : (
                  sortMessages(messages).map((message, index, list) => {
                    const id = getMessageId(message);
                    const ownMessage = isAdminMessage(message);
                    const previous = list[index - 1];
                    const showDate =
                      !previous ||
                      formatDateLabel(previous.createdAt) !==
                        formatDateLabel(message.createdAt);

                    const attachment = message.attachment;
                    const attachmentUrl =
                      typeof attachment === "string"
                        ? attachment
                        : attachment?.url || attachment?.path || "";

                    const attachmentName =
                      attachment?.originalName ||
                      attachment?.filename ||
                      attachment?.name ||
                      "Open attachment";

                    return (
                      <React.Fragment key={id || `${message.createdAt}-${index}`}>
                        {showDate && (
                          <div className="cx-private-date-divider">
                            <span>
                              {formatDateLabel(message.createdAt)}
                            </span>
                          </div>
                        )}

                        <article
                          className={`cx-private-message-row ${
                            ownMessage ? "is-admin-message" : "is-member-message"
                          }`}
                        >
                          <div className="cx-private-message-bubble">
                            {!ownMessage && (
                              <span className="cx-private-sender-name">
                                {message.senderName ||
                                  message.sender?.name ||
                                  getDisplayName(selectedMember)}
                              </span>
                            )}

                            {editingMessageId === id ? (
                              <div className="cx-private-edit-form">
                                <textarea
                                  value={editingDraft}
                                  onChange={(event) =>
                                    setEditingDraft(event.target.value)
                                  }
                                  rows={2}
                                  autoFocus
                                />
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => saveEdit(message)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMessageId("");
                                      setEditingDraft("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {getMessageText(message) && (
                                  <p className="cx-private-message-text">
                                    {getMessageText(message)}
                                  </p>
                                )}

                                {attachmentUrl && (
                                  <a
                                    className="cx-private-attachment"
                                    href={attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <span aria-hidden="true">↗</span>
                                    {attachmentName}
                                  </a>
                                )}

                                <footer className="cx-private-message-meta">
                                  {message.isEdited && (
                                    <span className="cx-private-edited">
                                      (edited)
                                    </span>
                                  )}
                                  <time>
                                    {formatTime(
                                      message.createdAt || message.updatedAt
                                    )}
                                  </time>

                                  {ownMessage && id && (
                                    <div className="cx-private-message-actions">
                                      <button
                                        type="button"
                                        aria-label="Message actions"
                                        aria-expanded={openMenuId === id}
                                        onClick={() =>
                                          setOpenMenuId(
                                            openMenuId === id ? "" : id
                                          )
                                        }
                                      >
                                        ⋯
                                      </button>

                                      {openMenuId === id && (
                                        <div className="cx-private-message-menu">
                                          <button
                                            type="button"
                                            onClick={() => beginEdit(message)}
                                          >
                                            Edit message
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => removeMessage(message)}
                                          >
                                            Delete message
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </footer>
                              </>
                            )}
                          </div>
                        </article>
                      </React.Fragment>
                    );
                  })
                )}

                <div ref={bottomRef} />
              </div>

              <form className="cx-private-composer" onSubmit={sendMessage}>
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Message ${getDisplayName(selectedMember)}…`}
                  rows={1}
                  maxLength={5000}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />

                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label="Send message"
                >
                  <span className="cx-private-send-label">
                    {sending ? "Sending…" : "Send"}
                  </span>
                  <span aria-hidden="true">➤</span>
                </button>
              </form>
            </>
          ) : (
            <div className="cx-private-empty">
              <div className="cx-private-empty-icon">✉</div>
              <h3>Select a member</h3>
              <p>Choose a member from the list to view your conversation.</p>
            </div>
          )}
        </main>
      </div>
    </section>
  );
};

export default AdminPrivateChatPage;
