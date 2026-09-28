import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./adminChat.css";

// ============================================================
// MOCK DATA
// Replace this block with data fetched from your backend /
// pushed over Socket.IO. Shapes match what "chat:message" /
// "presence:update" events would carry, so swapping the source
// later doesn't require touching the JSX — see the SOCKET.IO
// INTEGRATION comment further down for exactly what to change.
// ============================================================

const adminUser = { id: "u_admin", name: "Admin", isAdmin: true };

const NAV_ITEMS = [
  { key: "group", label: "Group Chat", icon: "bi-chat-dots-fill" },
  { key: "private", label: "Private Messages", icon: "bi-envelope-fill" },
  { key: "members", label: "Member List", icon: "bi-people-fill" },
  { key: "auth", label: "LogIn/Logout", icon: "bi-box-arrow-in-right" },
];

const members = [
  { id: "u_tamil", name: "Tamil", status: "online" },
  { id: "u_arun", name: "Arun", status: "offline" },
  { id: "u_priya", name: "Priya", status: "offline" },
  { id: "u_kumar", name: "Kumar", status: "offline" },
  { id: "u_suresh", name: "Suresh", status: "offline" },
  { id: "u_meenakshi", name: "Meenakshi", status: "offline" },
  { id: "u_ravi", name: "Ravi", status: "offline" },
  { id: "u_deepa", name: "Deepa", status: "offline" },
];

// Private conversations, keyed by member id — mirrors a
// `GET /messages/:memberId` response / a per-room socket.io feed.
const initialConversations = {
  u_tamil: [
    {
      id: "c1",
      senderId: "u_admin",
      senderName: "Admin",
      isAdmin: true,
      text: "Hi Tamil, I wanted to discuss something with you. Can you please check your email regarding the update?",
      time: "10:15 AM",
    },
    {
      id: "c2",
      senderId: "u_tamil",
      senderName: "Tamil",
      text: "Sure admin, I'll check it now.",
      time: "10:18 AM",
    },
    {
      id: "c3",
      senderId: "u_admin",
      senderName: "Admin",
      isAdmin: true,
      text: "Thanks! Let me know if you have any questions.",
      time: "10:30 AM",
    },
  ],
};

// ============================================================
// COMPONENT
// ============================================================
export default function AdminChat() {
  const [activeNav, setActiveNav] = useState("private");
  const [memberList] = useState(members);
  const [activeMemberId, setActiveMemberId] = useState("u_tamil");
  const [conversations, setConversations] = useState(initialConversations);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const [navOpen, setNavOpen] = useState(false); // mobile: Admin Panel drawer
  const [listOpen, setListOpen] = useState(false); // mobile: member list drawer

  const bottomRef = useRef(null);
  const activeMember = memberList.find((m) => m.id === activeMemberId);
  const activeMessages = conversations[activeMemberId] || [];

  const filteredMembers = memberList.filter((m) =>
    m.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [activeMessages.length, activeMemberId]);

  // --------------------------------------------------------
  // SOCKET.IO INTEGRATION (for later)
  // --------------------------------------------------------
  // 1. npm install socket.io-client
  // 2. import { io } from "socket.io-client";
  //    const socket = io(process.env.REACT_APP_SOCKET_URL);
  // 3. useEffect(() => {
  //      socket.on("dm:message", ({ withUserId, message }) => {
  //        setConversations((prev) => ({
  //          ...prev,
  //          [withUserId]: [...(prev[withUserId] || []), message],
  //        }));
  //      });
  //      socket.on("presence:update", (updatedMembers) => setMemberList(updatedMembers));
  //      return () => { socket.off("dm:message"); socket.off("presence:update"); };
  //    }, []);
  // 4. In handleSend, replace the local setConversations call with:
  //      socket.emit("dm:message", { toUserId: activeMemberId, text });
  //    and let the "dm:message" listener above append it for both sides.
  // 5. When switching members, optionally fetch history:
  //      fetch(`/api/messages/${memberId}`).then(...).then(setConversations)
  // --------------------------------------------------------

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const payload = {
      id: `local_${Date.now()}`, // server assigns the real id later
      senderId: adminUser.id,
      senderName: adminUser.name,
      isAdmin: true,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Local-only for now. Replace with:
    // socket.emit("dm:message", { toUserId: activeMemberId, text });
    setConversations((prev) => ({
      ...prev,
      [activeMemberId]: [...(prev[activeMemberId] || []), payload],
    }));
    setDraft("");
  };

  return (
    <div className="admin-chat-app">
      {/* ---------------- Mobile backdrops ---------------- */}
      {(navOpen || listOpen) && (
        <div
          className="panel-backdrop d-lg-none"
          onClick={() => {
            setNavOpen(false);
            setListOpen(false);
          }}
        />
      )}

      {/* ---------------- Column 1: Admin Panel nav ---------------- */}
      <aside className={`admin-nav-panel ${navOpen ? "is-open" : ""}`}>
        <div className="admin-brand">
          <span className="brand-badge">A</span>
          <span className="brand-name">Admin Panel</span>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin-nav-item ${activeNav === item.key ? "active" : ""}`}
              onClick={() => {
                setActiveNav(item.key);
                setNavOpen(false);
              }}
            >
              <span className="nav-icon">
                <i className={`bi ${item.icon}`} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="circuit-decor" aria-hidden="true" />
      </aside>

      {/* ---------------- Column 2: member list ---------------- */}
      <section className={`member-panel ${listOpen ? "is-open" : ""}`}>
        <div className="member-panel-header">
          <button
            type="button"
            className="panel-toggle-btn d-lg-none"
            onClick={() => setNavOpen(true)}
            aria-label="Open admin menu"
          >
            <i className="bi bi-list" />
          </button>
          <h2 className="member-panel-title">Admin Messages</h2>
        </div>

        <div className="member-search">
          <i className="bi bi-search" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ul className="member-list">
          {filteredMembers.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                className={`member-row ${member.id === activeMemberId ? "active" : ""}`}
                onClick={() => {
                  setActiveMemberId(member.id);
                  setListOpen(false);
                }}
              >
                <span className={`avatar-circle avatar-${member.id}`}>
                  {member.name.charAt(0)}
                </span>
                <span className="member-row-text">
                  <span className="member-row-name">{member.name}</span>
                  <span className="member-row-status">
                    <span
                      className={`status-dot ${
                        member.status === "online" ? "status-online" : "status-offline"
                      }`}
                    />
                    {member.status === "online" ? "Online" : "Offline"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- Column 3: private chat ---------------- */}
      <main className="chat-main">
        <header className="chat-header">
          <button
            type="button"
            className="panel-toggle-btn d-lg-none"
            onClick={() => setListOpen(true)}
            aria-label="Open member list"
          >
            <i className="bi bi-people" />
          </button>

          {activeMember && (
            <div className="chat-header-title">
              <span className={`avatar-circle avatar-${activeMember.id}`}>
                {activeMember.name.charAt(0)}
              </span>
              <div>
                <h1 className="chat-header-name">{activeMember.name}</h1>
                <span className="chat-header-status">
                  <span
                    className={`status-dot ${
                      activeMember.status === "online" ? "status-online" : "status-offline"
                    }`}
                  />
                  {activeMember.status === "online" ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          )}

          <button type="button" className="icon-btn ms-auto" aria-label="More options">
            <i className="bi bi-three-dots-vertical" />
          </button>
        </header>

        <div className="chat-messages-wrapper">
          <div className="glow-orb glow-orb-1" />
          <div className="glow-orb glow-orb-2" />
          <div className="glow-orb glow-orb-3" />
          <div className="sparkle-layer" />

          <div className="chat-messages">
            {activeMessages.map((msg) => {
              const isOwn = msg.senderId === adminUser.id;
              return (
                <div
                  key={msg.id}
                  className={`message-row ${isOwn ? "message-row-own" : ""} ${
                    msg.isAdmin ? "message-row-admin" : ""
                  }`}
                >
                  <span className={`avatar-circle avatar-${msg.senderId}`}>
                    {msg.isAdmin ? <i className="bi bi-star-fill" /> : msg.senderName.charAt(0)}
                  </span>
                  <div className="message-bubble">
                    <div className="message-meta">
                      <span className="message-sender">{msg.senderName}</span>
                    </div>
                    <p className="message-text">{msg.text}</p>
                    <span className="message-time">{msg.time}</span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <form className="message-input-bar" onSubmit={handleSend}>
          <button type="button" className="icon-btn" aria-label="Attach file">
            <i className="bi bi-paperclip" />
          </button>

          <input
            type="text"
            className="message-input"
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />

          <button type="button" className="icon-btn" aria-label="Add emoji">
            <i className="bi bi-emoji-smile" />
          </button>

          <button type="submit" className="send-btn" aria-label="Send message">
            <i className="bi bi-send-fill" />
          </button>
        </form>
      </main>
    </div>
  );
}
