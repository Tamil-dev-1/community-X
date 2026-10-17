
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAdminChat } from "../../context/AdminChatProvider";
import {
  setAdminMembers,
  setAdminMembersLoading,
  setActiveAdminMemberWallet,
} from "../../features/chat/chatSlice";
import "./AdminMembersPage.css";

const ADMIN_API_URL = "http://localhost:5000/api/admin";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const extractMembers = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.members)) return data.members;
  if (Array.isArray(data?.data?.members)) return data.data.members;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getWallet = (member) =>
  String(
    member?.walletAddress ||
      member?.wallet ||
      member?.address ||
      member?.memberWallet ||
      ""
  ).toLowerCase();

const getName = (member) =>
  member?.fullName ||
  member?.name ||
  member?.username ||
  member?.displayName ||
  "Community Member";

const getAvatar = (member) =>
  member?.profileImage || member?.avatar || member?.image || "";

const getOnlineStatus = (member) =>
  Boolean(
    member?.isOnline ??
      member?.online ??
      member?.isConnected ??
      false
  );

const getLastSeen = (member) =>
  member?.lastSeen || member?.lastSeenAt || null;

const formatLastSeen = (value) => {
  if (!value) return "Offline";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Offline";

  return `Last seen ${date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatWallet = (wallet) => {
  if (!wallet) return "Wallet unavailable";
  if (wallet.length <= 18) return wallet;

  return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
};

const mergePresence = (members, currentMembers) =>
  members.map((member) => {
    const wallet = getWallet(member);

    const existingMember = currentMembers.find(
      (item) => getWallet(item) === wallet
    );

    if (!existingMember) return member;

    return {
      ...member,
      isOnline:
        existingMember.isOnline ??
        existingMember.online ??
        getOnlineStatus(member),
      online:
        existingMember.online ??
        existingMember.isOnline ??
        getOnlineStatus(member),
      lastSeen:
        existingMember.lastSeen ??
        existingMember.lastSeenAt ??
        getLastSeen(member),
      lastSeenAt:
        existingMember.lastSeenAt ??
        existingMember.lastSeen ??
        getLastSeen(member),
    };
  });

const sortMembers = (members, sortBy) => {
  const result = [...members];

  result.sort((a, b) => {
    if (sortBy === "name") {
      return getName(a).localeCompare(getName(b));
    }

    if (sortBy === "status") {
      return Number(getOnlineStatus(b)) - Number(getOnlineStatus(a));
    }

    if (sortBy === "recent") {
      const aTime = getLastSeen(a)
        ? new Date(getLastSeen(a)).getTime()
        : 0;

      const bTime = getLastSeen(b)
        ? new Date(getLastSeen(b)).getTime()
        : 0;

      return bTime - aTime;
    }

    return 0;
  });

  return result;
};

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

const AdminMembersPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    adminVerified,
    adminLoading,
    adminError,
    socket,
    adminSocketAuthenticated,
  } = useAdminChat();

  const adminMembers = useSelector(
    (state) => state.chat.adminMembers || []
  );

  const adminMembersLoading = useSelector(
    (state) => state.chat.adminMembersLoading
  );

  const [bannedMembers, setBannedMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  // Ban form state
  const [memberToBan, setMemberToBan] = useState(null);
  const [banReasonDraft, setBanReasonDraft] = useState("");
  const [actionLoadingWallet, setActionLoadingWallet] = useState("");
  const [actionError, setActionError] = useState("");

  const latestMembersRef = useRef(adminMembers);
  const latestBannedMembersRef = useRef(bannedMembers);

  useEffect(() => {
    latestMembersRef.current = adminMembers;
  }, [adminMembers]);

  useEffect(() => {
    latestBannedMembersRef.current = bannedMembers;
  }, [bannedMembers]);

  // --------------------------------------------------
  // API HELPER
  // --------------------------------------------------

  const adminRequest = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      throw new Error("Admin session not found. Please log in again.");
    }

    const response = await fetch(`${ADMIN_API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(
        data?.message ||
          data?.error ||
          "The request could not be completed."
      );
    }

    return data;
  }, []);

  // --------------------------------------------------
  // LOAD MEMBERS + BANNED MEMBERS
  // --------------------------------------------------

  const loadMembers = useCallback(
    async (showRefresh = false) => {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        setPageError("Admin session not found. Please log in again.");
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        dispatch(setAdminMembersLoading(true));
      }

      setPageError("");

      try {
        const [membersData, bannedData] = await Promise.all([
          adminRequest("/members"),
          adminRequest("/banned-members"),
        ]);

        const members = extractMembers(membersData);
        const banned = extractMembers(bannedData);

        const mergedMembers = mergePresence(
          members,
          latestMembersRef.current
        );

        const mergedBannedMembers = mergePresence(
          banned,
          [
            ...latestMembersRef.current,
            ...latestBannedMembersRef.current,
          ]
        );

        dispatch(setAdminMembers(mergedMembers));
        setBannedMembers(mergedBannedMembers);
      } catch (error) {
        console.error("Admin members error:", error);

        setPageError(
          error.message ||
            "Unable to connect to the server. Please try again."
        );
      } finally {
        dispatch(setAdminMembersLoading(false));
        setRefreshing(false);
      }
    },
    [adminRequest, dispatch]
  );

  useEffect(() => {
    if (adminVerified) {
      loadMembers();
    }
  }, [adminVerified, loadMembers]);

  // --------------------------------------------------
  // SOCKET.IO PRESENCE
  // Reuse the shared AdminChatProvider socket.
  // --------------------------------------------------

  useEffect(() => {
    if (!socket || !adminVerified) return;

    const applyPresence = (payload) => {
      if (!payload) return;

      const wallet = getWallet({
        walletAddress:
          payload.walletAddress ||
          payload.wallet ||
          payload.memberWallet ||
          payload.address ||
          payload.user?.walletAddress ||
          payload.member?.walletAddress,
      });

      if (!wallet) return;

      const onlineValue =
        payload.isOnline ??
        payload.online ??
        (payload.status === "online");

      const lastSeenValue =
        payload.lastSeen ??
        payload.lastSeenAt ??
        null;

      const updatePresence = (members) =>
        members.map((member) => {
          if (getWallet(member) !== wallet) return member;

          return {
            ...member,
            isOnline: Boolean(onlineValue),
            online: Boolean(onlineValue),
            lastSeen: lastSeenValue || getLastSeen(member),
            lastSeenAt:
              lastSeenValue || member.lastSeenAt || null,
          };
        });

      dispatch(
        setAdminMembers(
          updatePresence(latestMembersRef.current)
        )
      );

      setBannedMembers(
        updatePresence(latestBannedMembersRef.current)
      );
    };

    const handleSnapshot = (payload) => {
      let presenceList = [];

      if (Array.isArray(payload)) {
        presenceList = payload;
      } else if (Array.isArray(payload?.members)) {
        presenceList = payload.members;
      } else if (Array.isArray(payload?.presence)) {
        presenceList = payload.presence;
      } else if (payload && typeof payload === "object") {
        presenceList = Object.entries(payload).map(
          ([walletAddress, value]) => {
            if (typeof value === "boolean") {
              return { walletAddress, isOnline: value };
            }

            return {
              walletAddress,
              ...(value || {}),
            };
          }
        );
      }

      presenceList.forEach(applyPresence);
    };

    socket.on("presence-update", applyPresence);
    socket.on("presence-snapshot", handleSnapshot);

    if (adminSocketAuthenticated) {
      socket.emit("get-presence-snapshot");
    }

    return () => {
      socket.off("presence-update", applyPresence);
      socket.off("presence-snapshot", handleSnapshot);
    };
  }, [
    socket,
    adminVerified,
    adminSocketAuthenticated,
    dispatch,
  ]);

  // --------------------------------------------------
  // BAN MEMBER
  // --------------------------------------------------

  const openBanForm = (member) => {
    setActionError("");
    setBanReasonDraft("");
    setMemberToBan(member);
  };

  const closeBanForm = () => {
    if (actionLoadingWallet) return;

    setMemberToBan(null);
    setBanReasonDraft("");
    setActionError("");
  };

  const handleBanMember = async (event) => {
    event.preventDefault();

    if (!memberToBan) return;

    const wallet = getWallet(memberToBan);
    const reason = banReasonDraft.trim();

    if (!wallet) {
      setActionError("This member does not have a wallet address.");
      return;
    }

    if (!reason) {
      setActionError("Please enter a reason for banning this member.");
      return;
    }

    if (reason.length > 500) {
      setActionError("The ban reason cannot exceed 500 characters.");
      return;
    }

    setActionLoadingWallet(wallet);
    setActionError("");
    setPageError("");

    try {
      await adminRequest(
        `/members/${encodeURIComponent(wallet)}/ban`,
        {
          method: "PUT",
          body: JSON.stringify({ reason }),
        }
      );

      setMemberToBan(null);
      setBanReasonDraft("");

      await loadMembers(true);
    } catch (error) {
      console.error("Ban member error:", error);
      setActionError(
        error.message || "Unable to ban this member."
      );
    } finally {
      setActionLoadingWallet("");
    }
  };

  // --------------------------------------------------
  // UNBAN MEMBER
  // --------------------------------------------------

  const handleUnbanMember = async (member) => {
    const wallet = getWallet(member);

    if (!wallet) {
      setPageError("This member does not have a wallet address.");
      return;
    }

    const confirmed = window.confirm(
      `Unban ${getName(member)}?\n\nThis will restore their community access.`
    );

    if (!confirmed) return;

    setActionLoadingWallet(wallet);
    setPageError("");
    setActionError("");

    try {
      await adminRequest(
        `/members/${encodeURIComponent(wallet)}/unban`,
        { method: "PUT" }
      );

      await loadMembers(true);
    } catch (error) {
      console.error("Unban member error:", error);
      setPageError(
        error.message || "Unable to unban this member."
      );
    } finally {
      setActionLoadingWallet("");
    }
  };

  // --------------------------------------------------
  // FILTER + SORT
  // --------------------------------------------------

  const filteredMembers = useMemo(() => {
    const sourceMembers =
      statusFilter === "banned"
        ? bannedMembers
        : adminMembers;

    let result = [...sourceMembers];

    const searchValue = search.trim().toLowerCase();

    if (searchValue) {
      result = result.filter((member) => {
        const name = getName(member).toLowerCase();
        const email = String(member?.email || "").toLowerCase();
        const wallet = getWallet(member);
        const reason = String(member?.banReason || "").toLowerCase();

        return (
          name.includes(searchValue) ||
          email.includes(searchValue) ||
          wallet.includes(searchValue) ||
          reason.includes(searchValue)
        );
      });
    }

    if (statusFilter === "online") {
      result = result.filter(
        (member) => !member.isBanned && getOnlineStatus(member)
      );
    } else if (statusFilter === "offline") {
      result = result.filter(
        (member) => !member.isBanned && !getOnlineStatus(member)
      );
    } else if (statusFilter === "all") {
      result = result.filter((member) => !member.isBanned);
    }

    return sortMembers(result, sortBy);
  }, [
    adminMembers,
    bannedMembers,
    search,
    statusFilter,
    sortBy,
  ]);

  const onlineCount = adminMembers.filter(
    (member) => !member.isBanned && getOnlineStatus(member)
  ).length;

  const totalCount = adminMembers.filter(
    (member) => !member.isBanned
  ).length;

  const offlineCount = totalCount - onlineCount;
  const bannedCount = bannedMembers.length;

  // --------------------------------------------------
  // OPEN PRIVATE CHAT
  // --------------------------------------------------

  const openPrivateChat = (member) => {
    if (member?.isBanned) {
      setPageError(
        "This member is banned. Unban the member before opening a private chat."
      );
      return;
    }

    const wallet = getWallet(member);

    if (!wallet) {
      setPageError("This member does not have a wallet address.");
      return;
    }

    dispatch(setActiveAdminMemberWallet(wallet));
    localStorage.setItem("adminActiveMemberWallet", wallet);

    navigate("/admin-private-chat");
  };

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  if (adminLoading) {
    return (
      <div className="cxmembers-page">
        <div className="cxmembers-state">
          <div className="cxmembers-spinner" />
          <h3>Verifying admin access</h3>
          <p>Please wait...</p>
        </div>
      </div>
    );
  }

  if (!adminVerified) {
    return (
      <div className="cxmembers-page">
        <div className="cxmembers-state">
          <h3>Admin access required</h3>
          <p>
            {adminError ||
              "Your admin session could not be verified."}
          </p>
          <button
            className="cxmembers-primary-btn"
            onClick={() => navigate("/admin-login")}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MEMBER ACTIONS
  // --------------------------------------------------

  const renderMemberActions = (member) => {
    const wallet = getWallet(member);
    const isBanned = Boolean(member?.isBanned);
    const isBusy = actionLoadingWallet === wallet;

    return (
      <div className="cxmembers-actions">
        {!isBanned && (
          <button
            type="button"
            className="cxmembers-message-btn"
            onClick={() => openPrivateChat(member)}
            disabled={!wallet || Boolean(actionLoadingWallet)}
          >
            <i className="bi bi-chat-dots" />
            Message
          </button>
        )}

        {isBanned ? (
          <button
            type="button"
            className="cxmembers-unban-btn"
            onClick={() => handleUnbanMember(member)}
            disabled={!wallet || Boolean(actionLoadingWallet)}
          >
            <i
              className={`bi ${
                isBusy ? "bi-arrow-repeat" : "bi-shield-check"
              }`}
            />
            {isBusy ? "Processing..." : "Unban"}
          </button>
        ) : (
          <button
            type="button"
            className="cxmembers-ban-btn"
            onClick={() => openBanForm(member)}
            disabled={!wallet || Boolean(actionLoadingWallet)}
          >
            <i className="bi bi-shield-lock" />
            Ban
          </button>
        )}
      </div>
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="cxmembers-page">
      <div className="cxmembers-heading">
        <div>
          <span className="cxmembers-eyebrow">
            EXECUTIVE HUB / COMMUNITY
          </span>
          <h1>Member Management</h1>
          <p>
            Manage community members, connection status, and access.
          </p>
        </div>

        <button
          className="cxmembers-primary-btn"
          onClick={() => loadMembers(true)}
          disabled={refreshing || adminMembersLoading}
        >
          <i
            className={`bi ${
              refreshing ? "bi-arrow-repeat" : "bi-arrow-clockwise"
            }`}
          />
          {refreshing ? "Refreshing..." : "Refresh Members"}
        </button>
      </div>

      {pageError && (
        <div className="cxmembers-error" role="alert">
          <i className="bi bi-exclamation-circle" />
          <span>{pageError}</span>
          <button
            type="button"
            onClick={() => setPageError("")}
            aria-label="Dismiss error"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}

      <div className="cxmembers-stats">
        <div className="cxmembers-stat-card">
          <div className="cxmembers-stat-icon total">
            <i className="bi bi-people" />
          </div>
          <div>
            <span>Active Members</span>
            <strong>{totalCount}</strong>
          </div>
        </div>

        <div className="cxmembers-stat-card">
          <div className="cxmembers-stat-icon online">
            <i className="bi bi-broadcast" />
          </div>
          <div>
            <span>Online Now</span>
            <strong>{onlineCount}</strong>
          </div>
        </div>

        <div className="cxmembers-stat-card">
          <div className="cxmembers-stat-icon offline">
            <i className="bi bi-clock-history" />
          </div>
          <div>
            <span>Offline</span>
            <strong>{offlineCount}</strong>
          </div>
        </div>

        <div className="cxmembers-stat-card">
          <div className="cxmembers-stat-icon banned">
            <i className="bi bi-shield-lock" />
          </div>
          <div>
            <span>Banned Members</span>
            <strong>{bannedCount}</strong>
          </div>
        </div>
      </div>

      <section className="cxmembers-panel">
        <div className="cxmembers-panel-heading">
          <div>
            <h2>
              {statusFilter === "banned"
                ? "Banned Members"
                : "Community Members"}
            </h2>
            <p>
              {filteredMembers.length} members shown
            </p>
          </div>

          <span className="cxmembers-live-indicator">
            <span />
            {adminSocketAuthenticated
              ? "Live connection"
              : "Connecting"}
          </span>
        </div>

        <div className="cxmembers-toolbar">
          <div className="cxmembers-search">
            <i className="bi bi-search" />
            <input
              type="search"
              placeholder="Search name, email, wallet or ban reason..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <i className="bi bi-x-lg" />
              </button>
            )}
          </div>

          <div className="cxmembers-filters">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter members"
            >
              <option value="all">Active Members</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="banned">Banned Members</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort members"
            >
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
              <option value="recent">Sort by Last Seen</option>
            </select>
          </div>
        </div>

        {adminMembersLoading && adminMembers.length === 0 ? (
          <div className="cxmembers-state compact">
            <div className="cxmembers-spinner" />
            <p>Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="cxmembers-empty">
            <i
              className={`bi ${
                statusFilter === "banned"
                  ? "bi-shield-check"
                  : "bi-people"
              }`}
            />
            <h3>
              {statusFilter === "banned"
                ? "No banned members"
                : "No members found"}
            </h3>
            <p>
              {search || statusFilter !== "all"
                ? "Try changing your search or filters."
                : "Members will appear here when available."}
            </p>
          </div>
        ) : (
          <>
            <div className="cxmembers-table-wrap">
              <table className="cxmembers-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Wallet Address</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    <th>Access / Ban Details</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMembers.map((member, index) => {
                    const wallet = getWallet(member);
                    const online = getOnlineStatus(member);
                    const avatar = getAvatar(member);
                    const isBanned = Boolean(member?.isBanned);

                    return (
                      <tr key={wallet || member?._id || index}>
                        <td>
                          <div className="cxmembers-person">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt=""
                                className="cxmembers-avatar"
                              />
                            ) : (
                              <div className="cxmembers-avatar cxmembers-avatar-fallback">
                                {getName(member).charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="cxmembers-person-info">
                              <strong>{getName(member)}</strong>
                              <span>
                                {member?.email || "No email provided"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className="cxmembers-wallet"
                            title={wallet}
                          >
                            {formatWallet(wallet)}
                          </span>
                        </td>

                        <td>
                          {isBanned ? (
                            <span className="cxmembers-status is-banned">
                              <span />
                              Banned
                            </span>
                          ) : (
                            <span
                              className={`cxmembers-status ${
                                online ? "is-online" : "is-offline"
                              }`}
                            >
                              <span />
                              {online ? "Online" : "Offline"}
                            </span>
                          )}
                        </td>

                        <td className="cxmembers-last-seen">
                          {online && !isBanned
                            ? "Active now"
                            : formatLastSeen(getLastSeen(member))}
                        </td>

                        <td>
                          {isBanned ? (
                            <div className="cxmembers-ban-details">
                              <strong>
                                {member?.banReason || "No reason provided"}
                              </strong>
                              <span>
                                {formatDate(member?.bannedAt)}
                              </span>
                            </div>
                          ) : (
                            <span className="cxmembers-access-label">
                              Community access
                            </span>
                          )}
                        </td>

                        <td>{renderMemberActions(member)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="cxmembers-mobile-list">
              {filteredMembers.map((member, index) => {
                const wallet = getWallet(member);
                const online = getOnlineStatus(member);
                const avatar = getAvatar(member);
                const isBanned = Boolean(member?.isBanned);

                return (
                  <article
                    className="cxmembers-mobile-card"
                    key={wallet || member?._id || index}
                  >
                    <div className="cxmembers-mobile-person">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          className="cxmembers-avatar"
                        />
                      ) : (
                        <div className="cxmembers-avatar cxmembers-avatar-fallback">
                          {getName(member).charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="cxmembers-person-info">
                        <strong>{getName(member)}</strong>
                        <span>
                          {member?.email || "No email provided"}
                        </span>
                      </div>

                      <span
                        className={`cxmembers-status ${
                          isBanned
                            ? "is-banned"
                            : online
                              ? "is-online"
                              : "is-offline"
                        }`}
                      >
                        <span />
                        {isBanned
                          ? "Banned"
                          : online
                            ? "Online"
                            : "Offline"}
                      </span>
                    </div>

                    <div className="cxmembers-mobile-wallet">
                      <span>Wallet</span>
                      <strong title={wallet}>
                        {formatWallet(wallet)}
                      </strong>
                    </div>

                    {isBanned && (
                      <div className="cxmembers-mobile-ban-details">
                        <span>Ban reason</span>
                        <strong>
                          {member?.banReason || "No reason provided"}
                        </strong>
                        <small>
                          Banned on {formatDate(member?.bannedAt)}
                        </small>
                      </div>
                    )}

                    <div className="cxmembers-mobile-footer">
                      <span>
                        {online && !isBanned
                          ? "Active now"
                          : formatLastSeen(getLastSeen(member))}
                      </span>

                      {renderMemberActions(member)}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* BAN MEMBER FORM */}
      {memberToBan && (
        <div
          className="cxmembers-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBanForm();
            }
          }}
        >
          <section
            className="cxmembers-ban-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cxmembers-ban-title"
          >
            <div className="cxmembers-modal-heading">
              <div className="cxmembers-modal-icon">
                <i className="bi bi-shield-lock" />
              </div>

              <button
                type="button"
                className="cxmembers-modal-close"
                onClick={closeBanForm}
                disabled={Boolean(actionLoadingWallet)}
                aria-label="Close ban form"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <h2 id="cxmembers-ban-title">Ban Community Member</h2>

            <p className="cxmembers-modal-description">
              You are about to restrict community access for{" "}
              <strong>{getName(memberToBan)}</strong>.
              Provide a clear reason before confirming.
            </p>

            <form onSubmit={handleBanMember}>
              <label
                className="cxmembers-ban-label"
                htmlFor="cxmembers-ban-reason"
              >
                Reason for ban
              </label>

              <textarea
                id="cxmembers-ban-reason"
                className="cxmembers-ban-textarea"
                placeholder="Explain why this member is being banned..."
                value={banReasonDraft}
                onChange={(event) => {
                  setBanReasonDraft(event.target.value);
                  setActionError("");
                }}
                maxLength={500}
                rows={4}
                required
                autoFocus
              />

              <div className="cxmembers-ban-character-count">
                {banReasonDraft.length}/500 characters
              </div>

              {actionError && (
                <div className="cxmembers-error" role="alert">
                  <i className="bi bi-exclamation-circle" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="cxmembers-modal-actions">
                <button
                  type="button"
                  className="cxmembers-cancel-btn"
                  onClick={closeBanForm}
                  disabled={Boolean(actionLoadingWallet)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cxmembers-ban-confirm-btn"
                  disabled={
                    Boolean(actionLoadingWallet) ||
                    !banReasonDraft.trim()
                  }
                >
                  <i
                    className={`bi ${
                      actionLoadingWallet
                        ? "bi-arrow-repeat"
                        : "bi-shield-lock"
                    }`}
                  />
                  {actionLoadingWallet
                    ? "Banning..."
                    : "Confirm Ban"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminMembersPage;
