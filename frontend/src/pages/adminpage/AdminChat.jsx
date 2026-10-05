import React, {
  useState,
  useEffect,
  useRef,
} from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { io } from "socket.io-client";

import "./AdminChat.css";

// ============================================================
// API / SOCKET CONFIG
// ============================================================

const API_URL = "http://localhost:5000/api/messages";

const COMMUNITY_API_URL =
  "http://localhost:5000/api/community";

const SOCKET_URL = "http://localhost:5000";

// ============================================================
// DEFAULT AVATAR
// ============================================================

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

// ============================================================
// LOCAL STORAGE KEY
// ============================================================

const ADMIN_ACTIVE_MEMBER_KEY =
  "adminActiveMemberWallet";

// ============================================================
// GET ADMIN WALLET
// ============================================================

const getAdminWallet = () => {
  return (
    localStorage.getItem("communityXWallet") || ""
  )
    .toLowerCase()
    .trim();
};

// ============================================================
// NORMALIZE WALLET
// ============================================================

const normalizeWallet = (wallet) => {
  return (wallet || "").toLowerCase().trim();
};

// ============================================================
// ADMIN NAVIGATION
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
// MEMBERS DASHBOARD
// ============================================================

function MembersDashboard({
  memberList,
  filteredMembers,
  search,
  setSearch,
  loadingMembers,
  memberError,
  adminWallet,
  handleSelectMember,
  setActiveNav,
}) {
  const [memberFilter, setMemberFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const onlineMembers = memberList.filter(
    (member) => member.status === "online"
  );

  const offlineMembers = memberList.filter(
    (member) => member.status !== "online"
  );

  const visibleMembers = [...filteredMembers]
    .filter((member) => {
      if (memberFilter === "online") {
        return member.status === "online";
      }

      if (memberFilter === "offline") {
        return member.status !== "online";
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "status") {
        return Number(b.status === "online") - Number(a.status === "online");
      }

      if (sortBy === "username") {
        return (a.username || "").localeCompare(b.username || "");
      }

      return (a.name || "").localeCompare(b.name || "");
    });

  const copyWallet = async (wallet) => {
    try {
      await navigator.clipboard.writeText(wallet);
    } catch (error) {
      console.warn("Wallet copy failed:", error);
    }
  };

  return (
    <section className="members-dashboard">
      <div className="members-dashboard-header">
        <div>
          <div className="members-eyebrow">COMMUNITY X / ADMIN</div>
          <h1 className="members-dashboard-title">Member Management</h1>
          <p className="members-dashboard-subtitle">
            Monitor Community X members and open private conversations.
          </p>
        </div>

        <div className="members-header-badge">
          <i className="bi bi-shield-check" />
          <span>Admin Access</span>
        </div>
      </div>

      <div className="member-stat-grid">
        <div className="member-stat-card">
          <div className="member-stat-icon purple">
            <i className="bi bi-people" />
          </div>
          <div>
            <span className="member-stat-label">TOTAL MEMBERS</span>
            <strong className="member-stat-value">{memberList.length}</strong>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon green">
            <i className="bi bi-activity" />
          </div>
          <div>
            <span className="member-stat-label">ACTIVE ONLINE</span>
            <strong className="member-stat-value green-text">{onlineMembers.length}</strong>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon slate">
            <i className="bi bi-moon" />
          </div>
          <div>
            <span className="member-stat-label">OFFLINE</span>
            <strong className="member-stat-value">{offlineMembers.length}</strong>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon purple">
            <i className="bi bi-wallet2" />
          </div>
          <div>
            <span className="member-stat-label">TOTAL VOLUME</span>
            <strong className="member-stat-value">—</strong>
            <small className="member-stat-note">Balance API not connected</small>
          </div>
        </div>
      </div>

      <div className="members-toolbar">
        <div className="members-search-box">
          <i className="bi bi-search" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members by name, username, or wallet hash..."
          />
          {search && (
            <button
              type="button"
              className="members-clear-search"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <i className="bi bi-x" />
            </button>
          )}
        </div>

        <div className="members-filter-group" role="group" aria-label="Member status filter">
          {[
            ["all", "All"],
            ["online", "Online"],
            ["offline", "Offline"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`members-filter-btn ${memberFilter === key ? "active" : ""}`}
              onClick={() => setMemberFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="members-sort-box">
          <span>Sort by:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Name</option>
            <option value="username">Username</option>
            <option value="status">Status</option>
          </select>
          <i className="bi bi-chevron-down" />
        </label>
      </div>

      <div className="members-result-bar">
        <span>
          Showing <strong>{visibleMembers.length}</strong> of <strong>{memberList.length}</strong> members
        </span>
        <span className="members-result-live">
          <span className="live-dot" /> Live directory
        </span>
      </div>

      <div className="members-table-wrap">
        <div className="members-table-head">
          <span>MEMBER</span>
          <span>CONTACT / USERNAME</span>
          <span>WALLET ADDRESS</span>
          <span>STATUS</span>
          <span>ACTION</span>
        </div>

        {loadingMembers ? (
          <div className="members-empty-state">
            <div className="spinner-border spinner-border-sm" role="status" />
            <span>Loading members...</span>
          </div>
        ) : memberError ? (
          <div className="members-empty-state error">
            <i className="bi bi-exclamation-triangle" />
            <span>{memberError}</span>
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="members-empty-state">
            <i className="bi bi-person-x" />
            <span>No members match your search or filter.</span>
          </div>
        ) : (
          <div className="members-table-body">
            {visibleMembers.map((member) => {
              const isAdminMember =
                normalizeWallet(member.walletAddress) === normalizeWallet(adminWallet);

              return (
                <div className="member-management-row" key={member.id}>
                  <div className="member-primary-cell">
                    <div className={`member-large-avatar ${isAdminMember ? "admin" : ""}`}>
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} />
                      ) : (
                        member.name?.charAt(0).toUpperCase()
                      )}
                      <span className={`member-avatar-presence ${member.status === "online" ? "online" : "offline"}`} />
                    </div>

                    <div className="member-primary-copy">
                      <div className="member-name-line">
                        <strong>{member.name}</strong>
                        {isAdminMember && <span className="member-role-badge">ADMIN</span>}
                      </div>
                      <span className="member-role-text">
                        {isAdminMember ? "Community Administrator" : "Community Member"}
                      </span>
                    </div>
                  </div>

                  <div className="member-contact-cell">
                    <span className="member-username">@{member.username || "member"}</span>
                    <span className="member-contact-muted">Wallet verified</span>
                  </div>

                  <div className="member-wallet-cell">
                    <div className="wallet-chip">
                      <i className="bi bi-wallet2" />
                      <span>{member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-5).toUpperCase()}</span>
                      <button
                        type="button"
                        onClick={() => copyWallet(member.walletAddress)}
                        aria-label="Copy wallet address"
                        title="Copy wallet address"
                      >
                        <i className="bi bi-copy" />
                      </button>
                    </div>
                  </div>

                  <div className="member-status-cell">
                    <span className={`member-status-pill ${member.status === "online" ? "online" : "offline"}`}>
                      <span className="member-status-dot" />
                      {member.status === "online" ? "Online" : "Offline"}
                    </span>
                  </div>

                  <div className="member-action-cell">
                    {!isAdminMember ? (
                      <button
                        type="button"
                        className="member-message-btn"
                        onClick={() => {
                          handleSelectMember(member);
                          setActiveNav("private");
                        }}
                      >
                        <i className="bi bi-chat-square-dots" />
                        <span>Msg</span>
                      </button>
                    ) : (
                      <span className="member-admin-label">Current Admin</span>
                    )}

                    <button
                      type="button"
                      className="member-more-btn"
                      aria-label={`More options for ${member.name}`}
                    >
                      <i className="bi bi-three-dots-vertical" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export default function AdminChat() {
  // ==========================================================
  // AUTH
  // ==========================================================

  const token =
    localStorage.getItem("communityXToken");

  const adminWallet = getAdminWallet();

  const adminUser = {
    id: adminWallet || "u_admin",
    walletAddress: adminWallet,
    name: "Admin",
    isAdmin: true,
    avatar: DEFAULT_AVATAR,
  };

  // ==========================================================
  // STATE
  // ==========================================================

  const [activeNav, setActiveNav] =
    useState("private");

  const [memberList, setMemberList] =
    useState([]);

  const [activeMemberId, setActiveMemberId] =
    useState("");

  /*
    conversations are stored using wallet address:

    {
      "0x072271...": [
        message1,
        message2
      ]
    }
  */
  const [conversations, setConversations] =
    useState({});

  // GROUP CHAT
  const [groupMessages, setGroupMessages] =
    useState([]);

  const [groupLoading, setGroupLoading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [draft, setDraft] =
    useState("");

  const [loadingMembers, setLoadingMembers] =
    useState(false);

  const [memberError, setMemberError] =
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

  const bottomRef = useRef(null);

  const socketRef = useRef(null);

  // ==========================================================
  // ACTIVE MEMBER
  // ==========================================================

  const activeMember = memberList.find(
    (member) =>
      member.id === activeMemberId
  );

  // ==========================================================
  // ACTIVE MEMBER WALLET
  // ==========================================================

  const activeMemberWallet =
    normalizeWallet(
      activeMember?.walletAddress
    );

  // ==========================================================
  // ACTIVE MESSAGES
  // ==========================================================

  const activeMessages =
    conversations[activeMemberWallet] || [];

  // ==========================================================
  // SEARCH MEMBERS
  // ==========================================================

  const filteredMembers =
    memberList.filter((member) => {
      const searchText =
        search.trim().toLowerCase();

      if (!searchText) {
        return true;
      }

      return (
        member.name
          .toLowerCase()
          .includes(searchText) ||
        member.username
          .toLowerCase()
          .includes(searchText) ||
        member.walletAddress
          .toLowerCase()
          .includes(searchText)
      );
    });

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
    groupMessages.length,
    activeMemberId,
    activeNav,
  ]);

  // ==========================================================
  // FETCH COMMUNITY MEMBERS
  // ==========================================================

  useEffect(() => {
    const fetchCommunityMembers =
      async () => {
        if (!token) {
          console.error(
            "Community X JWT token not found."
          );

          setMemberError(
            "Authentication token not found."
          );

          return;
        }

        try {
          setLoadingMembers(true);

          setMemberError("");

          const response =
            await fetch(
              `${COMMUNITY_API_URL}/members`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          // ==================================================
          // JWT ERROR
          // ==================================================

          if (response.status === 401) {
            throw new Error(
              "Authentication failed. Please connect your wallet again."
            );
          }

          // ==================================================
          // OTHER ERROR
          // ==================================================

          if (!response.ok) {
            throw new Error(
              "Failed to fetch Community X members."
            );
          }

          const data =
            await response.json();

          // ==================================================
          // API ERROR
          // ==================================================

          if (!data.success) {
            throw new Error(
              data.message ||
                "Failed to fetch members."
            );
          }

          // ==================================================
          // FORMAT MEMBERS
          // ==================================================

          const formattedMembers =
            (data.members || [])
              .map((member) => ({
                id: member._id,

                walletAddress:
                  normalizeWallet(
                    member.walletAddress
                  ),

                name:
                  member.fullName ||
                  member.username ||
                  "Community Member",

                username:
                  member.username || "",

                status: "offline",

                avatar:
                  member.profileImage || "",
              }))
              .filter(
                (member) =>
                  member.walletAddress
              );

          console.log(
            "Community X members:",
            formattedMembers
          );

          setMemberList(
            formattedMembers
          );

          // ==================================================
          // RESTORE PREVIOUS MEMBER
          // ==================================================

          if (
            formattedMembers.length > 0
          ) {
            const savedWallet =
              normalizeWallet(
                localStorage.getItem(
                  ADMIN_ACTIVE_MEMBER_KEY
                )
              );

            const savedMember =
              formattedMembers.find(
                (member) =>
                  normalizeWallet(
                    member.walletAddress
                  ) === savedWallet
              );

            if (savedMember) {
              console.log(
                "Restoring previous member:",
                savedMember.name,
                savedMember.walletAddress
              );

              setActiveMemberId(
                savedMember.id
              );
            } else {
              console.log(
                "No saved member found. Selecting first member."
              );

              setActiveMemberId(
                formattedMembers[0].id
              );

              localStorage.setItem(
                ADMIN_ACTIVE_MEMBER_KEY,
                formattedMembers[0].walletAddress
              );
            }
          } else {
            setActiveMemberId("");
          }
        } catch (error) {
          console.error(
            "Fetch Community Members Error:",
            error
          );

          setMemberError(
            error.message ||
              "Failed to load members."
          );
        } finally {
          setLoadingMembers(false);
        }
      };

    fetchCommunityMembers();
  }, [token]);

  // ==========================================================
  // SAVE ACTIVE MEMBER
  // ==========================================================

  useEffect(() => {
    if (!activeMember?.walletAddress) {
      return;
    }

    const wallet =
      normalizeWallet(
        activeMember.walletAddress
      );

    localStorage.setItem(
      ADMIN_ACTIVE_MEMBER_KEY,
      wallet
    );

    console.log(
      "Active admin chat member saved:",
      wallet
    );
  }, [activeMember]);

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

    // ========================================================
    // CONNECT
    // ========================================================

    socket.on(
      "connect",
      () => {
        console.log(
          "Admin private socket connected:",
          socket.id
        );

        // Backend expects:
        // { token }

        socket.emit(
          "authenticate-socket",
          {
            token,
          }
        );
      }
    );

    // ========================================================
    // SOCKET AUTHENTICATED
    // ========================================================

    socket.on(
      "socket-authenticated",
      (data) => {
        console.log(
          "Private socket authenticated:",
          data
        );
      }
    );

    // ========================================================
    // SOCKET AUTH ERROR
    // ========================================================

    socket.on(
      "socket-auth-error",
      (data) => {
        console.error(
          "Private socket authentication failed:",
          data?.message
        );
      }
    );

    // ========================================================
    // DISCONNECT
    // ========================================================

    socket.on(
      "disconnect",
      () => {
        console.log(
          "Admin private socket disconnected"
        );
      }
    );

    // ========================================================
    // CLEANUP
    // ========================================================

    return () => {
      socket.disconnect();

      socketRef.current =
        null;
    };
  }, [token]);

  // ==========================================================
  // RECEIVE GROUP MESSAGE
  // ==========================================================

  useEffect(() => {
    const socket =
      socketRef.current;

    if (!socket) {
      return;
    }

    const handleNewGroupMessage =
      (newMessage) => {
        if (!newMessage) {
          return;
        }

        if (
          newMessage.chatType &&
          newMessage.chatType !== "GROUP"
        ) {
          return;
        }

        const messageId =
          newMessage._id ||
          newMessage.id;

        if (!messageId) {
          return;
        }

        const senderWallet =
          normalizeWallet(
            newMessage.senderWallet
          );

        const formattedMessage = {
          id: messageId,

          senderId:
            newMessage.senderWallet,

          senderWallet,

          receiverWallet: null,

          senderName:
            newMessage.senderName ||
            "Community Member",

          senderAvatar:
            newMessage.senderAvatar ||
            "",

          isAdmin:
            senderWallet ===
            normalizeWallet(adminWallet),

          text:
            newMessage.message ||
            "",

          time: new Date(
            newMessage.createdAt ||
              Date.now()
          ).toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
        };

        setGroupMessages(
          (prev) => {
            const exists =
              prev.some(
                (msg) =>
                  String(msg.id) ===
                  String(formattedMessage.id)
              );

            if (exists) {
              return prev;
            }

            return [
              ...prev,
              formattedMessage,
            ];
          }
        );

        console.log(
          "Admin group message received:",
          formattedMessage
        );
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
  }, [adminWallet]);

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
        if (
          !newMessage?.senderWallet ||
          !newMessage?.receiverWallet
        ) {
          console.warn(
            "Invalid private message received:",
            newMessage
          );

          return;
        }

        const senderWallet =
          normalizeWallet(
            newMessage.senderWallet
          );

        const receiverWallet =
          normalizeWallet(
            newMessage.receiverWallet
          );

        const currentAdminWallet =
          normalizeWallet(
            adminWallet
          );

        // ====================================================
        // VERIFY MESSAGE BELONGS TO ADMIN
        // ====================================================

        const isAdminSender =
          senderWallet ===
          currentAdminWallet;

        const isAdminReceiver =
          receiverWallet ===
          currentAdminWallet;

        if (
          !isAdminSender &&
          !isAdminReceiver
        ) {
          return;
        }

        // ====================================================
        // FIND MEMBER WALLET
        // ====================================================

        const memberWallet =
          isAdminSender
            ? receiverWallet
            : senderWallet;

        // ====================================================
        // FIND MEMBER
        // ====================================================

        const selectedMember =
          memberList.find(
            (member) =>
              normalizeWallet(
                member.walletAddress
              ) === memberWallet
          );

        if (!selectedMember) {
          console.warn(
            "Private message member not found:",
            memberWallet
          );

          return;
        }

        // ====================================================
        // MESSAGE ID
        // ====================================================

        const messageId =
          newMessage._id ||
          newMessage.id;

        if (!messageId) {
          return;
        }

        // ====================================================
        // FORMAT MESSAGE
        // ====================================================

        const formattedMessage = {
          id: messageId,

          senderId:
            newMessage.senderWallet,

          senderWallet:
            senderWallet,

          receiverWallet:
            receiverWallet,

          senderName:
            newMessage.senderName ||
            "Community Member",

          senderAvatar:
            newMessage.senderAvatar ||
            "",

          isAdmin:
            senderWallet ===
            currentAdminWallet,

          text:
            newMessage.message ||
            "",

          time: new Date(
            newMessage.createdAt ||
              Date.now()
          ).toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
        };

        // ====================================================
        // ADD TO WALLET-BASED CONVERSATION
        // ====================================================

        setConversations(
          (prev) => {
            const existingMessages =
              prev[memberWallet] ||
              [];

            const alreadyExists =
              existingMessages.some(
                (msg) =>
                  String(msg.id) ===
                  String(formattedMessage.id)
              );

            if (alreadyExists) {
              return prev;
            }

            return {
              ...prev,

              [memberWallet]: [
                ...existingMessages,
                formattedMessage,
              ],
            };
          }
        );

        console.log(
          "Private message received:",
          formattedMessage
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
    memberList,
    adminWallet,
  ]);

  // ==========================================================
  // FETCH GROUP MESSAGE HISTORY
  // ==========================================================

  useEffect(() => {
    const fetchGroupMessages =
      async () => {
        if (activeNav !== "group") {
          return;
        }

        if (!token) {
          console.error(
            "Community X JWT token not found."
          );

          setGroupMessages([]);
          return;
        }

        try {
          setGroupLoading(true);

          console.log(
            "FETCH GROUP CHAT HISTORY"
          );

          const response =
            await fetch(
              `${API_URL}/group`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (
            response.status === 401
          ) {
            throw new Error(
              "Authentication failed. Please connect your wallet again."
            );
          }

          if (!response.ok) {
            const errorData =
              await response
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              errorData.message ||
                "Failed to fetch group messages."
            );
          }

          const data =
            await response.json();

          const serverMessages =
            Array.isArray(data)
              ? data
              : data.messages || [];

          const formattedMessages =
            serverMessages
              .filter(
                (message) =>
                  !message.chatType ||
                  message.chatType ===
                    "GROUP"
              )
              .map((msg) => {
                const senderWallet =
                  normalizeWallet(
                    msg.senderWallet
                  );

                return {
                  id:
                    msg._id ||
                    msg.id,

                  senderId:
                    msg.senderWallet,

                  senderWallet,

                  receiverWallet:
                    null,

                  senderName:
                    msg.senderName ||
                    "Community Member",

                  senderAvatar:
                    msg.senderAvatar ||
                    "",

                  isAdmin:
                    senderWallet ===
                    normalizeWallet(
                      adminWallet
                    ),

                  text:
                    msg.message ||
                    "",

                  time: new Date(
                    msg.createdAt ||
                      Date.now()
                  ).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  ),
                };
              });

          console.log(
            "Group messages loaded from MongoDB:",
            formattedMessages.length
          );

          setGroupMessages(
            formattedMessages
          );
        } catch (error) {
          console.error(
            "Fetch Group Messages Error:",
            error
          );

          setGroupMessages([]);

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
          setGroupLoading(false);
        }
      };

    fetchGroupMessages();
  }, [
    activeNav,
    token,
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

        const memberWallet =
          normalizeWallet(
            activeMember.walletAddress
          );

        if (!memberWallet) {
          return;
        }

        try {
          setLoading(true);

          console.log(
            "======================================"
          );

          console.log(
            "FETCH PRIVATE CHAT HISTORY"
          );

          console.log(
            "Admin wallet:",
            adminWallet
          );

          console.log(
            "Member wallet:",
            memberWallet
          );

          console.log(
            "GET URL:",
            `${API_URL}/private/${memberWallet}`
          );

          console.log(
            "======================================"
          );

          const response =
            await fetch(
              `${API_URL}/private/${memberWallet}`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          // ==================================================
          // JWT ERROR
          // ==================================================

          if (
            response.status === 401
          ) {
            throw new Error(
              "Authentication failed. Please connect your wallet again."
            );
          }

          // ==================================================
          // OTHER ERROR
          // ==================================================

          if (!response.ok) {
            throw new Error(
              "Failed to fetch private messages."
            );
          }

          const data =
            await response.json();

          console.log(
            "Private history API response:",
            data
          );

          // ==================================================
          // SUCCESS
          // ==================================================

          if (data.success) {
            const formattedMessages =
              (data.messages || [])
                .map((msg) => {
                  const senderWallet =
                    normalizeWallet(
                      msg.senderWallet
                    );

                  const receiverWallet =
                    normalizeWallet(
                      msg.receiverWallet
                    );

                  const isAdmin =
                    senderWallet ===
                    adminWallet;

                  return {
                    id:
                      msg._id,

                    senderId:
                      msg.senderWallet,

                    senderWallet:
                      senderWallet,

                    receiverWallet:
                      receiverWallet,

                    senderName:
                      msg.senderName ||
                      "Community Member",

                    senderAvatar:
                      msg.senderAvatar ||
                      "",

                    isAdmin,

                    text:
                      msg.message ||
                      "",

                    time:
                      new Date(
                        msg.createdAt
                      ).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      ),
                  };
                });

            console.log(
              "Messages loaded from MongoDB:",
              formattedMessages.length
            );

            // =================================================
            // IMPORTANT
            // Store using wallet address
            // =================================================

            setConversations(
              (prev) => ({
                ...prev,

                [memberWallet]:
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

      try {
        setSending(true);

        // ======================================================
        // GROUP CHAT
        // ======================================================

        if (activeNav === "group") {
          const response =
            await fetch(
              `${API_URL}/group`,
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

          if (
            response.status === 401
          ) {
            throw new Error(
              "Authentication failed. Please connect your wallet again."
            );
          }

          if (!response.ok) {
            const errorData =
              await response
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              errorData.message ||
                "Failed to send group message."
            );
          }

          const data =
            await response.json();

          console.log(
            "Send group message response:",
            data
          );

          // Backend saves the message and emits
          // new-group-message through Socket.IO.
          // The socket listener adds it to the UI,
          // so we do not add it manually here.

          if (data.success) {
            setDraft("");
          } else {
            throw new Error(
              data.message ||
                "Failed to send group message."
            );
          }

          return;
        }

        // ======================================================
        // PRIVATE CHAT
        // ======================================================

        if (!activeMember) {
          alert(
            "Please select a member."
          );

          return;
        }

        const memberWallet =
          normalizeWallet(
            activeMember.walletAddress
          );

        if (!memberWallet) {
          alert(
            "Member wallet address is missing."
          );

          return;
        }

        console.log(
          "Sending private message to:",
          memberWallet
        );

        const response =
          await fetch(
            `${API_URL}/private/${memberWallet}`,
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

        if (
          response.status === 401
        ) {
          throw new Error(
            "Authentication failed. Please connect your wallet again."
          );
        }

        if (!response.ok) {
          const errorData =
            await response
              .json()
              .catch(
                () => ({})
              );

          throw new Error(
            errorData.message ||
              "Failed to send private message."
          );
        }

        const data =
          await response.json();

        console.log(
          "Send private message response:",
          data
        );

        if (data.success) {
          // Backend saves the message and emits
          // new-private-message. Socket listener
          // adds it to the UI.
          setDraft("");
        } else {
          throw new Error(
            data.message ||
              "Failed to send private message."
          );
        }
      } catch (error) {
        console.error(
          "Send Message Error:",
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

  // ==========================================================
  // SELECT MEMBER
  // ==========================================================

  const handleSelectMember =
    (member) => {
      setActiveMemberId(
        member.id
      );

      const wallet =
        normalizeWallet(
          member.walletAddress
        );

      if (wallet) {
        localStorage.setItem(
          ADMIN_ACTIVE_MEMBER_KEY,
          wallet
        );

        console.log(
          "Selected member saved:",
          wallet
        );
      }

      setListOpen(false);

      setDraft("");
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className={`admin-chat-app ${activeNav === "private" ? "private-layout" : "single-content-layout"}`}>

      {/* ==================================================
          MOBILE BACKDROP
      ================================================== */}

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

      {/* ==================================================
          COLUMN 1 - ADMIN PANEL
      ================================================== */}

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
                key={item.key}
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

                  setListOpen(false);
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

      {/* ==================================================
          COLUMN 2 - MEMBER LIST
          Visible ONLY for Private Messages
      ================================================== */}

      {activeNav === "private" && (
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

          {/* LOADING */}

          {loadingMembers && (
            <li className="member-list-state">
              <div className="text-center py-4">

                <div
                  className="spinner-border spinner-border-sm"
                  role="status"
                />

                <span className="ms-2">
                  Loading members...
                </span>

              </div>
            </li>
          )}

          {/* ERROR */}

          {!loadingMembers &&
            memberError && (
              <li className="member-list-state">

                <div className="text-center py-4">

                  <i className="bi bi-exclamation-triangle" />

                  <p className="mt-2 mb-0">
                    {memberError}
                  </p>

                </div>

              </li>
            )}

          {/* EMPTY */}

          {!loadingMembers &&
            !memberError &&
            filteredMembers.length ===
              0 && (
              <li className="member-list-state">

                <div className="text-center py-4">

                  <i className="bi bi-person-x" />

                  <p className="mt-2 mb-0">
                    No members found.
                  </p>

                </div>

              </li>
            )}

          {/* MEMBERS */}

          {!loadingMembers &&
            !memberError &&
            filteredMembers.map(
              (member) => (
                <li
                  key={member.id}
                >

                  <button
                    type="button"
                    className={`member-row ${
                      member.id ===
                      activeMemberId
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      handleSelectMember(
                        member
                      )
                    }
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
                        member.name
                          .charAt(0)
                          .toUpperCase()
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
      )}

      {/* ==================================================
          COLUMN 3 - PRIVATE CHAT / MAIN CONTENT
      ================================================== */}

      <main className={`chat-main ${activeNav === "members" ? "members-mode" : ""}`}>

        {/* =================================================
            CHAT HEADER
        ================================================= */}

        <header className="chat-header">

          {/* MOBILE ADMIN NAVIGATION */}

          <button
            type="button"
            className="mobile-admin-menu-btn d-lg-none"
            onClick={() => setNavOpen(true)}
            aria-label="Open admin navigation"
          >
            <i className="bi bi-list" />
          </button>

          {/* MOBILE MEMBER LIST - PRIVATE CHAT ONLY */}

          {activeNav === "private" && (
            <button
              type="button"
              className="mobile-member-menu-btn d-lg-none"
              onClick={() => setListOpen(true)}
              aria-label="Open member list"
            >
              <i className="bi bi-people" />
            </button>
          )}

          {/* ACTIVE CHAT */}

          {activeNav === "group" ? (
            <div className="chat-header-title">

              <span className="avatar-circle avatar-admin">
                <i className="bi bi-globe2" />
              </span>

              <div>
                <h1 className="chat-header-name">
                  Community Group
                </h1>

                <span className="chat-header-status">
                  Admin • All Members
                </span>
              </div>

            </div>
          ) : activeMember ? (
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
                  activeMember.name
                    .charAt(0)
                    .toUpperCase()
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
          ) : (
            <div className="chat-header-title">

              <div>

                <h1 className="chat-header-name">
                  Private Messages
                </h1>

                <span className="chat-header-status">
                  Select a member
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

        {/* =================================================
            CHAT MESSAGES
        ================================================= */}

        <div className="chat-messages-wrapper">

          {/* GLOW EFFECTS */}

          <div className="glow-orb glow-orb-1" />
          <div className="glow-orb glow-orb-2" />
          <div className="glow-orb glow-orb-3" />

          <div className="sparkle-layer" />

          {/* MESSAGE AREA */}

          <div className="chat-messages chat-messages-scroll">

            {/* GROUP CHAT */}

            {activeNav === "group" && (
              <>
                {groupLoading && (
                  <div className="text-center py-4">
                    <div
                      className="spinner-border spinner-border-sm"
                      role="status"
                    />

                    <span className="text-light ms-2">
                      Loading group messages...
                    </span>
                  </div>
                )}

                {!groupLoading &&
                  groupMessages.length ===
                    0 && (
                    <div className="text-center py-5">
                      <i className="bi bi-chat-dots fs-1 text-light opacity-50" />

                      <p className="text-light mt-3">
                        No group messages yet.
                      </p>

                      <p className="text-light opacity-50 small">
                        Send the first message to all Community X members.
                      </p>
                    </div>
                  )}

                {!groupLoading &&
                  groupMessages.map(
                    (msg) => (
                      <div
                        key={msg.id}
                        className={`message-row ${
                          msg.isAdmin
                            ? "message-row-own"
                            : ""
                        } ${
                          msg.isAdmin
                            ? "message-row-admin"
                            : ""
                        }`}
                      >
                        <span
                          className={`avatar-circle ${
                            msg.isAdmin
                              ? "avatar-admin"
                              : "avatar-member"
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
                            msg.senderName
                              ?.charAt(0)
                              .toUpperCase()
                          )}
                        </span>

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
                    )
                  )}
              </>
            )}

            {/* PRIVATE CHAT */}

            {activeNav === "private" && (
              <>
                {!activeMember && (
                  <div className="text-center py-5">
                    <i className="bi bi-chat-square-text fs-1 text-light opacity-50" />

                    <p className="text-light mt-3">
                      Select a member to start
                      a private conversation.
                    </p>
                  </div>
                )}

                {activeMember &&
                  loading && (
                    <div className="text-center py-4">
                      <div
                        className="spinner-border spinner-border-sm"
                        role="status"
                      />

                      <span className="text-light ms-2">
                        Loading messages...
                      </span>
                    </div>
                  )}

                {activeMember &&
                  !loading &&
                  activeMessages.length ===
                    0 && (
                    <div className="text-center py-4">
                      <span className="text-light opacity-75">
                        No messages yet.
                      </span>

                      <p className="text-light opacity-50 small mt-2">
                        Send a message to{" "}
                        {activeMember.name}.
                      </p>
                    </div>
                  )}

                {activeMember &&
                  activeMessages.map(
                    (msg) => {
                      const isOwn =
                        msg.isAdmin;

                      return (
                        <div
                          key={msg.id}
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
                          <span
                            className={`avatar-circle ${
                              msg.isAdmin
                                ? "avatar-admin"
                                : `avatar-${activeMember.id}`
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
                              msg.senderName
                                ?.charAt(0)
                                .toUpperCase()
                            )}
                          </span>

                          <div className="message-bubble">
                            <div className="message-meta">
                              <span className="message-sender">
                                {
                                  msg.senderName
                                }
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
              </>
            )}

            {/* MEMBER MANAGEMENT */}

            {activeNav === "members" && (
              <MembersDashboard
                memberList={memberList}
                filteredMembers={filteredMembers}
                search={search}
                setSearch={setSearch}
                loadingMembers={loadingMembers}
                memberError={memberError}
                adminWallet={adminWallet}
                handleSelectMember={handleSelectMember}
                setActiveNav={setActiveNav}
              />
            )}

            {activeNav === "auth" && (
              <div className="text-center py-5">
                <i className="bi bi-person-check fs-1 text-light opacity-50" />

                <p className="text-light mt-3">
                  Admin authentication is active.
                </p>
              </div>
            )}

            {/* SCROLL TARGET */}

            <div
              ref={bottomRef}
            />

          </div>
        </div>

        {/* =================================================
            MESSAGE INPUT
        ================================================= */}

        <form
          className="message-input-bar"
          onSubmit={handleSend}
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
            placeholder={
              activeNav === "group"
                ? "Message all Community X members..."
                : activeMember
                  ? `Message ${activeMember.name}...`
                  : "Select a member..."
            }
            value={draft}
            onChange={(e) =>
              setDraft(
                e.target.value
              )
            }
            disabled={
              sending ||
              (
                activeNav !== "group" &&
                !activeMember
              )
            }
          />

          {/* EMOJI */}

          <button
            type="button"
            className="icon-btn"
            aria-label="Add emoji"
            disabled={
              activeNav !== "group" &&
              !activeMember
            }
          >
            <i className="bi bi-emoji-smile" />
          </button>

          {/* SEND */}

          <button
            type="submit"
            className="send-btn"
            aria-label="Send message"
            disabled={
              sending ||
              (
                activeNav !== "group" &&
                !activeMember
              ) ||
              !draft.trim()
            }
          >

            {sending ? (
              <span
                className="spinner-border spinner-border-sm"
                role="status"
              />
            ) : (
              <i className="bi bi-send-fill" />
            )}

          </button>

        </form>

      </main>

    </div>
  );
}