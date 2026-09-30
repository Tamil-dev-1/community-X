import React, {
  useState,
  useEffect,
  useRef,
} from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { io } from "socket.io-client";

import "./adminChat.css";

// ============================================================
// API / SOCKET CONFIG
// ============================================================

const API_URL =
  "http://localhost:5000/api/messages";

const SOCKET_URL =
  "http://localhost:5000";

// ============================================================
// ADMIN USER
// ============================================================

const getAdminWallet = () => {
  return (
    localStorage.getItem("communityXWallet") || ""
  ).toLowerCase();
};

// ============================================================
// NAVIGATION
// ============================================================

const NAV_ITEMS = [
  {
    key: "group",
    label: "Group Chat",
    icon: "bi-chat-dots-fill",
  },
  {
    key: "private",
    label: "Private Messages",
    icon: "bi-envelope-fill",
  },
  {
    key: "members",
    label: "Member List",
    icon: "bi-people-fill",
  },
  {
    key: "auth",
    label: "LogIn/Logout",
    icon: "bi-box-arrow-in-right",
  },
];

// ============================================================
// TEMPORARY MEMBER DATA
// ============================================================
// We will replace this with real Community X members
// from MongoDB in the next step.
//
// This wallet is the Wallet 2 that you already tested
// successfully with your private-message API.
// ============================================================

const members = [
  {
    id: "u_tamil",

    walletAddress:
      "0x2db4d6fa605a41B6953A28C7a2E6a312Da336EC1",

    name: "Tamil",

    status: "online",

    avatar: "",
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function AdminChat() {
  // ==========================================================
  // AUTH
  // ==========================================================

  const token =
    localStorage.getItem(
      "communityXToken"
    );

  const adminWallet =
    getAdminWallet();

  const adminUser = {
    id:
      adminWallet || "u_admin",

    walletAddress:
      adminWallet,

    name: "Admin",

    isAdmin: true,

    avatar: "",
  };

  // ==========================================================
  // STATE
  // ==========================================================

  const [activeNav, setActiveNav] =
    useState("private");

  const [memberList] =
    useState(members);

  const [activeMemberId, setActiveMemberId] =
    useState("u_tamil");

  const [conversations, setConversations] =
    useState({});

  const [search, setSearch] =
    useState("");

  const [draft, setDraft] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [navOpen, setNavOpen] =
    useState(false);

  const [listOpen, setListOpen] =
    useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  const bottomRef =
    useRef(null);

  const socketRef =
    useRef(null);

  // ==========================================================
  // ACTIVE MEMBER
  // ==========================================================

  const activeMember =
    memberList.find(
      (member) =>
        member.id === activeMemberId
    );

  const activeMessages =
    conversations[
      activeMemberId
    ] || [];

  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredMembers =
    memberList.filter((member) =>
      member.name
        .toLowerCase()
        .includes(
          search
            .trim()
            .toLowerCase()
        )
    );

  // ==========================================================
  // SCROLL TO BOTTOM
  // ==========================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [
    activeMessages.length,
    activeMemberId,
  ]);

  // ==========================================================
  // SOCKET.IO CONNECTION
  // ==========================================================

  useEffect(() => {
    if (!token) {
      console.error(
        "Community X JWT token not found."
      );

      return;
    }

    const socket =
      io(SOCKET_URL);

    socketRef.current =
      socket;

    // --------------------------------------------------------
    // CONNECT
    // --------------------------------------------------------

    socket.on(
      "connect",
      () => {
        console.log(
          "Admin private socket connected:",
          socket.id
        );

        // Authenticate socket using JWT
        socket.emit(
          "authenticate-socket",
          token
        );
      }
    );

    // --------------------------------------------------------
    // SOCKET AUTHENTICATED
    // --------------------------------------------------------

    socket.on(
      "socket-authenticated",
      (data) => {
        console.log(
          "Private socket authenticated:",
          data
        );
      }
    );

    // --------------------------------------------------------
    // SOCKET AUTH ERROR
    // --------------------------------------------------------

    socket.on(
      "socket-auth-error",
      (data) => {
        console.error(
          "Private socket authentication failed:",
          data.message
        );
      }
    );

    // --------------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------------

    socket.on(
      "disconnect",
      () => {
        console.log(
          "Admin private socket disconnected"
        );
      }
    );

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    return () => {
      socket.disconnect();

      socketRef.current =
        null;
    };
  }, [token]);

  // ==========================================================
  // RECEIVE PRIVATE MESSAGE
  // ==========================================================

  useEffect(() => {
    const socket =
      socketRef.current;

    if (!socket) {
      return;
    }

    const handleNewPrivateMessage =
      (newMessage) => {
        if (!activeMember) {
          return;
        }

        if (
          !newMessage?.senderWallet ||
          !newMessage?.receiverWallet
        ) {
          return;
        }

        const senderWallet =
          newMessage.senderWallet.toLowerCase();

        const receiverWallet =
          newMessage.receiverWallet.toLowerCase();

        const selectedMemberWallet =
          activeMember.walletAddress.toLowerCase();

        // ----------------------------------------------------
        // Check whether this message belongs to
        // the currently selected member conversation.
        // ----------------------------------------------------

        const belongsToConversation =
          senderWallet ===
            selectedMemberWallet ||
          receiverWallet ===
            selectedMemberWallet;

        if (
          !belongsToConversation
        ) {
          return;
        }

        // ----------------------------------------------------
        // Check whether sender is admin
        // ----------------------------------------------------

        const isAdmin =
          senderWallet ===
          adminWallet;

        // ----------------------------------------------------
        // Format message for UI
        // ----------------------------------------------------

        const formattedMessage = {
          id:
            newMessage._id,

          senderId:
            newMessage.senderWallet,

          senderName:
            newMessage.senderName,

          senderAvatar:
            newMessage.senderAvatar ||
            "",

          isAdmin,

          text:
            newMessage.message,

          time: new Date(
            newMessage.createdAt
          ).toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute:
                "2-digit",
            }
          ),
        };

        // ----------------------------------------------------
        // Prevent duplicate message
        // ----------------------------------------------------

        setConversations(
          (prev) => {
            const existingMessages =
              prev[
                activeMemberId
              ] || [];

            const alreadyExists =
              existingMessages.some(
                (msg) =>
                  msg.id ===
                  formattedMessage.id
              );

            if (
              alreadyExists
            ) {
              return prev;
            }

            return {
              ...prev,

              [activeMemberId]: [
                ...existingMessages,
                formattedMessage,
              ],
            };
          }
        );
      };

    socket.on(
      "new-private-message",
      handleNewPrivateMessage
    );

    return () => {
      socket.off(
        "new-private-message",
        handleNewPrivateMessage
      );
    };
  }, [
    activeMemberId,
    activeMember,
    adminWallet,
  ]);

  // ==========================================================
  // FETCH PRIVATE MESSAGE HISTORY
  // ==========================================================

  useEffect(() => {
    const fetchPrivateMessages =
      async () => {
        if (!token) {
          console.error(
            "Community X JWT token not found."
          );

          return;
        }

        if (!activeMember) {
          return;
        }

        try {
          setLoading(true);

          const response =
            await fetch(
              `${API_URL}/private/${activeMember.walletAddress}`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          // --------------------------------------------------
          // JWT ERROR
          // --------------------------------------------------

          if (
            response.status ===
            401
          ) {
            throw new Error(
              "Authentication failed. Please connect your wallet again."
            );
          }

          // --------------------------------------------------
          // OTHER ERROR
          // --------------------------------------------------

          if (
            !response.ok
          ) {
            throw new Error(
              "Failed to fetch private messages"
            );
          }

          const data =
            await response.json();

          // --------------------------------------------------
          // SUCCESS
          // --------------------------------------------------

          if (
            data.success
          ) {
            const formattedMessages =
              data.messages.map(
                (msg) => {
                  const senderWallet =
                    msg.senderWallet.toLowerCase();

                  const isAdmin =
                    senderWallet ===
                    adminWallet;

                  return {
                    id:
                      msg._id,

                    senderId:
                      msg.senderWallet,

                    senderName:
                      msg.senderName,

                    senderAvatar:
                      msg.senderAvatar ||
                      "",

                    isAdmin,

                    text:
                      msg.message,

                    time:
                      new Date(
                        msg.createdAt
                      ).toLocaleTimeString(
                        [],
                        {
                          hour:
                            "2-digit",
                          minute:
                            "2-digit",
                        }
                      ),
                  };
                }
              );

            setConversations(
              (prev) => ({
                ...prev,

                [activeMemberId]:
                  formattedMessages,
              })
            );
          }
        } catch (error) {
          console.error(
            "Fetch Private Messages Error:",
            error
          );

          if (
            error.message.includes(
              "Authentication failed"
            )
          ) {
            alert(
              error.message
            );
          }
        } finally {
          setLoading(false);
        }
      };

    fetchPrivateMessages();
  }, [
    activeMemberId,
    activeMember,
    token,
    adminWallet,
  ]);

  // ==========================================================
  // SEND PRIVATE MESSAGE
  // ==========================================================

  const handleSend =
    async (e) => {
      e.preventDefault();

      const text =
        draft.trim();

      if (!text) {
        return;
      }

      if (sending) {
        return;
      }

      if (!token) {
        alert(
          "Authentication token not found. Please connect your wallet again."
        );

        return;
      }

      if (!activeMember) {
        alert(
          "Please select a member."
        );

        return;
      }

      try {
        setSending(true);

        const response =
          await fetch(
            `${API_URL}/private/${activeMember.walletAddress}`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                senderName:
                  adminUser.name,

                senderAvatar:
                  adminUser.avatar,

                message:
                  text,
              }),
            }
          );

        // ----------------------------------------------------
        // AUTH ERROR
        // ----------------------------------------------------

        if (
          response.status ===
          401
        ) {
          throw new Error(
            "Authentication failed. Please connect your wallet again."
          );
        }

        // ----------------------------------------------------
        // OTHER ERROR
        // ----------------------------------------------------

        if (
          !response.ok
        ) {
          throw new Error(
            "Failed to send private message"
          );
        }

        const data =
          await response.json();

        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        if (
          data.success
        ) {
          // IMPORTANT:
          //
          // Do NOT add the message manually.
          //
          // Backend saves the message.
          // Socket.IO sends the saved message
          // back to Admin + Member.
          //
          // This prevents duplicate messages.

          setDraft("");
        } else {
          console.error(
            "Send private message failed:",
            data.message
          );
        }
      } catch (error) {
        console.error(
          "Send Private Message Error:",
          error
        );

        alert(
          error.message ||
            "Failed to send private message."
        );
      } finally {
        setSending(false);
      }
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="admin-chat-app">

      {/* ================================================== */}
      {/* MOBILE BACKDROP */}
      {/* ================================================== */}

      {(navOpen ||
        listOpen) && (
        <div
          className="panel-backdrop d-lg-none"
          onClick={() => {
            setNavOpen(false);
            setListOpen(false);
          }}
        />
      )}

      {/* ================================================== */}
      {/* COLUMN 1 - ADMIN PANEL */}
      {/* ================================================== */}

      <aside
        className={`admin-nav-panel ${
          navOpen
            ? "is-open"
            : ""
        }`}
      >

        {/* BRAND */}

        <div className="admin-brand">

          <span className="brand-badge">
            A
          </span>

          <span className="brand-name">
            Admin Panel
          </span>

        </div>

        {/* NAVIGATION */}

        <nav className="admin-nav">

          {NAV_ITEMS.map(
            (item) => (
              <button
                key={
                  item.key
                }
                type="button"
                className={`admin-nav-item ${
                  activeNav ===
                  item.key
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setActiveNav(
                    item.key
                  );

                  setNavOpen(
                    false
                  );
                }}
              >

                <span className="nav-icon">

                  <i
                    className={`bi ${item.icon}`}
                  />

                </span>

                <span>
                  {item.label}
                </span>

              </button>
            )
          )}

        </nav>

        <div
          className="circuit-decor"
          aria-hidden="true"
        />

      </aside>

      {/* ================================================== */}
      {/* COLUMN 2 - MEMBER LIST */}
      {/* ================================================== */}

      <section
        className={`member-panel ${
          listOpen
            ? "is-open"
            : ""
        }`}
      >

        {/* HEADER */}

        <div className="member-panel-header">

          <button
            type="button"
            className="panel-toggle-btn d-lg-none"
            onClick={() =>
              setNavOpen(true)
            }
            aria-label="Open admin menu"
          >
            <i className="bi bi-list" />
          </button>

          <h2 className="member-panel-title">
            Admin Messages
          </h2>

        </div>

        {/* SEARCH */}

        <div className="member-search">

          <i className="bi bi-search" />

          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>

        {/* MEMBER LIST */}

        <ul className="member-list">

          {filteredMembers.map(
            (member) => (
              <li
                key={
                  member.id
                }
              >

                <button
                  type="button"
                  className={`member-row ${
                    member.id ===
                    activeMemberId
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setActiveMemberId(
                      member.id
                    );

                    setListOpen(
                      false
                    );
                  }}
                >

                  {/* AVATAR */}

                  <span
                    className={`avatar-circle avatar-${member.id}`}
                  >

                    {member.avatar ? (
                      <img
                        src={
                          member.avatar
                        }
                        alt={
                          member.name
                        }
                      />
                    ) : (
                      member.name.charAt(
                        0
                      )
                    )}

                  </span>

                  {/* MEMBER DETAILS */}

                  <span className="member-row-text">

                    <span className="member-row-name">
                      {member.name}
                    </span>

                    <span className="member-row-status">

                      <span
                        className={`status-dot ${
                          member.status ===
                          "online"
                            ? "status-online"
                            : "status-offline"
                        }`}
                      />

                      {member.status ===
                      "online"
                        ? "Online"
                        : "Offline"}

                    </span>

                  </span>

                </button>

              </li>
            )
          )}

        </ul>

      </section>

      {/* ================================================== */}
      {/* COLUMN 3 - PRIVATE CHAT */}
      {/* ================================================== */}

      <main className="chat-main">

        {/* ================================================= */}
        {/* CHAT HEADER */}
        {/* ================================================= */}

        <header className="chat-header">

          {/* MOBILE MEMBER LIST */}

          <button
            type="button"
            className="panel-toggle-btn d-lg-none"
            onClick={() =>
              setListOpen(true)
            }
            aria-label="Open member list"
          >
            <i className="bi bi-people" />
          </button>

          {/* ACTIVE MEMBER */}

          {activeMember && (
            <div className="chat-header-title">

              <span
                className={`avatar-circle avatar-${activeMember.id}`}
              >

                {activeMember.avatar ? (
                  <img
                    src={
                      activeMember.avatar
                    }
                    alt={
                      activeMember.name
                    }
                  />
                ) : (
                  activeMember.name.charAt(
                    0
                  )
                )}

              </span>

              <div>

                <h1 className="chat-header-name">
                  {activeMember.name}
                </h1>

                <span className="chat-header-status">

                  <span
                    className={`status-dot ${
                      activeMember.status ===
                      "online"
                        ? "status-online"
                        : "status-offline"
                    }`}
                  />

                  {activeMember.status ===
                  "online"
                    ? "Online"
                    : "Offline"}

                </span>

              </div>

            </div>
          )}

          {/* MORE */}

          <button
            type="button"
            className="icon-btn ms-auto"
            aria-label="More options"
          >
            <i className="bi bi-three-dots-vertical" />
          </button>

        </header>

        {/* ================================================= */}
        {/* CHAT MESSAGES */}
        {/* ================================================= */}

        <div className="chat-messages-wrapper">

          {/* GLOW EFFECTS */}

          <div className="glow-orb glow-orb-1" />

          <div className="glow-orb glow-orb-2" />

          <div className="glow-orb glow-orb-3" />

          <div className="sparkle-layer" />

          {/* MESSAGE AREA */}

          <div className="chat-messages">

            {/* LOADING */}

            {loading && (
              <div className="text-center py-4">

                <span className="text-light">
                  Loading messages...
                </span>

              </div>
            )}

            {/* EMPTY */}

            {!loading &&
              activeMessages.length ===
                0 && (
                <div className="text-center py-4">

                  <span className="text-light">
                    No messages yet.
                  </span>

                </div>
              )}

            {/* MESSAGE LIST */}

            {activeMessages.map(
              (msg) => {

                const isOwn =
                  msg.isAdmin;

                return (
                  <div
                    key={
                      msg.id
                    }
                    className={`message-row ${
                      isOwn
                        ? "message-row-own"
                        : ""
                    } ${
                      msg.isAdmin
                        ? "message-row-admin"
                        : ""
                    }`}
                  >

                    {/* MESSAGE AVATAR */}

                    <span
                      className={`avatar-circle ${
                        msg.isAdmin
                          ? "avatar-admin"
                          : `avatar-${activeMember?.id}`
                      }`}
                    >

                      {msg.isAdmin ? (
                        <i className="bi bi-star-fill" />
                      ) : msg.senderAvatar ? (
                        <img
                          src={
                            msg.senderAvatar
                          }
                          alt={
                            msg.senderName
                          }
                        />
                      ) : (
                        msg.senderName?.charAt(
                          0
                        )
                      )}

                    </span>

                    {/* MESSAGE */}

                    <div className="message-bubble">

                      <div className="message-meta">

                        <span className="message-sender">
                          {msg.senderName}
                        </span>

                      </div>

                      <p className="message-text">
                        {msg.text}
                      </p>

                      <span className="message-time">
                        {msg.time}
                      </span>

                    </div>

                  </div>
                );
              }
            )}

            {/* SCROLL TARGET */}

            <div
              ref={
                bottomRef
              }
            />

          </div>

        </div>

        {/* ================================================= */}
        {/* MESSAGE INPUT */}
        {/* ================================================= */}

        <form
          className="message-input-bar"
          onSubmit={
            handleSend
          }
        >

          {/* ATTACHMENT */}

          <button
            type="button"
            className="icon-btn"
            aria-label="Attach file"
          >
            <i className="bi bi-paperclip" />
          </button>

          {/* INPUT */}

          <input
            type="text"
            className="message-input"
            placeholder="Type a message..."
            value={draft}
            onChange={(e) =>
              setDraft(
                e.target.value
              )
            }
            disabled={
              sending
            }
          />

          {/* EMOJI */}

          <button
            type="button"
            className="icon-btn"
            aria-label="Add emoji"
          >
            <i className="bi bi-emoji-smile" />
          </button>

          {/* SEND */}

          <button
            type="submit"
            className="send-btn"
            aria-label="Send message"
            disabled={
              sending
            }
          >

            <i className="bi bi-send-fill" />

          </button>

        </form>

      </main>

    </div>
  );
}