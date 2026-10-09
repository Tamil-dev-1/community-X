
import React, { useState, useEffect, useRef } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { io } from "socket.io-client";

import "./AdminChat.css";

// ============================================================
// API CONFIGURATION
// ============================================================

const ADMIN_API_URL = "http://localhost:5000/api/admin";
const SOCKET_URL = "http://localhost:5000";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

const ADMIN_ACTIVE_MEMBER_KEY = "adminActiveMemberWallet";

// ============================================================
// HELPERS
// ============================================================

const normalizeWallet = (wallet = "") =>
  String(wallet).toLowerCase().trim();

const getAdminToken = () =>
  localStorage.getItem("adminToken") || "";

const getStoredAdminUser = () => {
  try {
    const stored = localStorage.getItem("adminUser");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to read adminUser:", error);
    return null;
  }
};

const getMemberPresenceWallet = (presence) =>
  normalizeWallet(presence?.walletAddress);

const getMemberPresenceStatus = (presence) =>
  presence?.status === "online" ? "online" : "offline";

const extractMessageData = (data) => {
  if (!data) return null;

  if (data.data && typeof data.data === "object") {
    return data.data;
  }

  if (data.message && typeof data.message === "object") {
    return data.message;
  }

  if (data._id || data.id || data.senderWallet) {
    return data;
  }

  return null;
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
    key: "announcements",
    label: "Announcements",
    icon: "bi-megaphone-fill",
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
  members,
  search,
  setSearch,
  onSelectMember,
  adminIdentifier,
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const totalMembers = members.length;

  const onlineMembers = members.filter(
    (member) => member.status === "online"
  ).length;

  const offlineMembers = totalMembers - onlineMembers;

  const filteredMembers = members
    .filter((member) => {
      const searchValue = search.toLowerCase().trim();

      if (!searchValue) return true;

      return (
        member.name?.toLowerCase().includes(searchValue) ||
        member.username?.toLowerCase().includes(searchValue) ||
        member.walletAddress?.toLowerCase().includes(searchValue)
      );
    })
    .filter((member) => {
      if (statusFilter === "all") return true;
      return member.status === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === "username") {
        return (a.username || "").localeCompare(b.username || "");
      }

      return (a.name || "").localeCompare(b.name || "");
    });

  return (
    <div className="members-dashboard">
      <div className="members-dashboard-header">
        <div>
          <div className="members-eyebrow">
            COMMUNITY X / ADMINISTRATION
          </div>

          <h2 className="members-dashboard-title">
            Community Members
          </h2>

          <p className="members-dashboard-subtitle">
            Manage and communicate with Community X members.
          </p>
        </div>

        <div className="members-header-badge">
          <span className="live-dot"></span>
          Community Active
        </div>
      </div>

      <div className="member-stat-grid">
        <div className="member-stat-card">
          <div className="member-stat-icon purple">
            <i className="bi bi-people-fill"></i>
          </div>

          <div>
            <span className="member-stat-label">
              TOTAL MEMBERS
            </span>
            <strong className="member-stat-value">
              {totalMembers}
            </strong>
            <span className="member-stat-note">
              Registered Community X members
            </span>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon green">
            <i className="bi bi-circle-fill"></i>
          </div>

          <div>
            <span className="member-stat-label">ONLINE</span>
            <strong className="member-stat-value">
              {onlineMembers}
            </strong>
            <span className="member-stat-note">
              Currently active
            </span>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon slate">
            <i className="bi bi-circle"></i>
          </div>

          <div>
            <span className="member-stat-label">OFFLINE</span>
            <strong className="member-stat-value">
              {offlineMembers}
            </strong>
            <span className="member-stat-note">
              Currently offline
            </span>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon purple">
            <i className="bi bi-chat-dots-fill"></i>
          </div>

          <div>
            <span className="member-stat-label">COMMUNITY</span>
            <strong className="member-stat-value">
              {totalMembers}
            </strong>
            <span className="member-stat-note">
              Total Community X access
            </span>
          </div>
        </div>
      </div>

      <div className="members-toolbar">
        <div className="members-search-box">
          <i className="bi bi-search"></i>

          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button
              type="button"
              className="members-clear-search"
              onClick={() => setSearch("")}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>

        <div className="members-filter-group">
          {["all", "online", "offline"].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`members-filter-btn ${
                statusFilter === filter ? "active" : ""
              }`}
              onClick={() => setStatusFilter(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        <div className="members-sort-box">
          <span>Sort:</span>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="name">Name</option>
            <option value="username">Username</option>
          </select>

          <i className="bi bi-chevron-down"></i>
        </div>
      </div>

      <div className="members-result-bar">
        <span>
          Showing <strong>{filteredMembers.length}</strong> of{" "}
          <strong>{totalMembers}</strong> members
        </span>

        <span className="members-result-live">
          <span className="live-dot"></span>
          Live member status
        </span>
      </div>

      <div className="members-table-wrap">
        <div className="members-table-head">
          <span>MEMBER</span>
          <span>USERNAME</span>
          <span>WALLET</span>
          <span>STATUS</span>
          <span>ACTION</span>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="members-empty-state">
            <i className="bi bi-person-x"></i>
            <p>No members found.</p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const memberWallet = normalizeWallet(
              member.walletAddress
            );

            const isAdmin =
              memberWallet === normalizeWallet(adminIdentifier);

            return (
              <div
                className="member-management-row"
                key={member.id || member.walletAddress}
              >
                <div className="member-primary-cell">
                  <div
                    className={`member-large-avatar ${
                      isAdmin ? "admin" : ""
                    }`}
                  >
                    <img
                      src={member.avatar || DEFAULT_AVATAR}
                      alt={member.name || "Member"}
                    />

                    <span
                      className={`member-avatar-presence ${
                        member.status === "online"
                          ? "online"
                          : "offline"
                      }`}
                    ></span>
                  </div>

                  <div className="member-primary-copy">
                    <div className="member-name-line">
                      <strong>
                        {member.name || "Community Member"}
                      </strong>

                      {isAdmin && (
                        <span className="member-role-badge">
                          ADMIN
                        </span>
                      )}
                    </div>

                    <span className="member-role-text">
                      {isAdmin
                        ? "Community Administrator"
                        : "Community Member"}
                    </span>
                  </div>
                </div>

                <div className="member-contact-cell">
                  <span className="member-username">
                    {member.username
                      ? `@${member.username}`
                      : "No username"}
                  </span>

                  <span className="member-contact-muted">
                    Community X
                  </span>
                </div>

                <div className="member-wallet-cell">
                  <div className="wallet-chip">
                    <i className="bi bi-wallet2"></i>

                    <span>
                      {member.walletAddress
                        ? `${member.walletAddress.slice(
                            0,
                            6
                          )}...${member.walletAddress.slice(-4)}`
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="member-status-cell">
                  <span
                    className={`member-status-pill ${
                      member.status === "online"
                        ? "online"
                        : "offline"
                    }`}
                  >
                    <span className="member-status-dot"></span>

                    {member.status === "online"
                      ? "Online"
                      : "Offline"}
                  </span>
                </div>

                <div className="member-action-cell">
                  {!isAdmin ? (
                    <>
                      <button
                        type="button"
                        className="member-message-btn"
                        onClick={() => onSelectMember(member)}
                      >
                        <i className="bi bi-chat-dots-fill"></i>
                        Message
                      </button>

                      <button
                        type="button"
                        className="member-more-btn"
                        title="More options"
                      >
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                    </>
                  ) : (
                    <span className="member-admin-label">
                      Administrator
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// ANNOUNCEMENTS (embedded page)
// ------------------------------------------------------------
// BACKEND INTEGRATION
//   1. Set ANNOUNCEMENTS_USE_MOCK = false
//   2. Make sure your API exposes these endpoints
//      (all send "Authorization: Bearer <adminToken>"):
//        GET    /api/admin/announcements        -> [] or { announcements: [] }
//        POST   /api/admin/announcements        -> created announcement
//        PUT    /api/admin/announcements/:id    -> updated announcement
//        DELETE /api/admin/announcements/:id    -> { message }
//
//   Announcement shape:
//     { id|_id, category, heading, description, info,
//       status: "published" | "draft", createdAt }
// ============================================================

const ANNOUNCEMENTS_USE_MOCK = true;

const ANNOUNCEMENTS_URL = `${ADMIN_API_URL}/announcements`;

const ANN_HEADING_MAX = 100;
const ANN_DESCRIPTION_MAX = 1000;
const ANN_INFO_MAX = 300;

const ANN_CATEGORIES = [
  { key: "general", label: "Announcement", icon: "bi-megaphone-fill" },
  { key: "feature", label: "Product Feature", icon: "bi-box-seam-fill" },
  { key: "critical", label: "Critical Update", icon: "bi-shield-exclamation" },
];

const getAnnCategory = (key) =>
  ANN_CATEGORIES.find((category) => category.key === key) ||
  ANN_CATEGORIES[0];

const ANN_EMPTY_FORM = {
  id: null,
  category: "general",
  heading: "",
  description: "",
  info: "",
};

const formatAnnDate = (value) => {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Normalises whatever the backend returns into one shape for the UI.
const normalizeAnnouncement = (item = {}) => ({
  id: item._id || item.id,
  category: item.category || "general",
  heading: item.heading || item.title || "",
  description: item.description || item.body || "",
  info: item.info || "",
  status: item.status === "draft" ? "draft" : "published",
  createdAt: item.createdAt || new Date().toISOString(),
});

const annAuthHeaders = () => ({
  Authorization: `Bearer ${getAdminToken()}`,
  "Content-Type": "application/json",
});

const parseAnnResponse = async (response, fallbackMessage) => {
  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
};

// ---------- Mock implementation (remove when backend is ready) ----------

const annWait = (ms = 450) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const annDaysAgo = (days) =>
  new Date(Date.now() - days * 86400000).toISOString();

let mockAnnouncements = [
  {
    id: "m1",
    category: "general",
    heading: "Hub Platform-Wide Health Update",
    description:
      "All systems are operational following our scheduled maintenance window.",
    info: "",
    status: "published",
    createdAt: annDaysAgo(6),
  },
  {
    id: "m2",
    category: "feature",
    heading: "Product Features: File Storage 2.0",
    description:
      "Larger uploads, faster previews and shared folders are now available to every member.",
    info: "Rolling out gradually over the next 48 hours.",
    status: "published",
    createdAt: annDaysAgo(3),
  },
  {
    id: "m3",
    category: "critical",
    heading: "Urgent Patch: User Data Security",
    description:
      "A security patch has been applied. No action is required from members.",
    info: "Please sign out and back in to refresh your session.",
    status: "published",
    createdAt: annDaysAgo(1),
  },
];

const mockAnnouncementApi = {
  async list() {
    await annWait();
    return mockAnnouncements.map(normalizeAnnouncement);
  },

  async save(payload) {
    await annWait();

    if (payload.id) {
      mockAnnouncements = mockAnnouncements.map((item) =>
        item.id === payload.id ? { ...item, ...payload } : item
      );

      return normalizeAnnouncement(
        mockAnnouncements.find((item) => item.id === payload.id)
      );
    }

    const created = {
      ...payload,
      id: `m${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    mockAnnouncements = [created, ...mockAnnouncements];
    return normalizeAnnouncement(created);
  },

  async remove(id) {
    await annWait(300);
    mockAnnouncements = mockAnnouncements.filter((item) => item.id !== id);
    return true;
  },
};

// ---------- Real API implementation ----------

const realAnnouncementApi = {
  async list() {
    const response = await fetch(ANNOUNCEMENTS_URL, {
      method: "GET",
      headers: annAuthHeaders(),
    });

    const data = await parseAnnResponse(
      response,
      "Failed to load announcements."
    );

    const items = Array.isArray(data) ? data : data?.announcements || [];
    return items.map(normalizeAnnouncement);
  },

  async save(payload) {
    const isUpdate = Boolean(payload.id);

    const response = await fetch(
      isUpdate ? `${ANNOUNCEMENTS_URL}/${payload.id}` : ANNOUNCEMENTS_URL,
      {
        method: isUpdate ? "PUT" : "POST",
        headers: annAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    const data = await parseAnnResponse(
      response,
      isUpdate
        ? "Failed to update announcement."
        : "Failed to create announcement."
    );

    return normalizeAnnouncement(data?.announcement || data?.data || data);
  },

  async remove(id) {
    const response = await fetch(`${ANNOUNCEMENTS_URL}/${id}`, {
      method: "DELETE",
      headers: annAuthHeaders(),
    });

    await parseAnnResponse(response, "Failed to delete announcement.");
    return true;
  },
};

const announcementApi = ANNOUNCEMENTS_USE_MOCK
  ? mockAnnouncementApi
  : realAnnouncementApi;

// ---------- Announcement card ----------

function AnnouncementCard({ item, onEdit, onDelete, onShare, deleting }) {
  const category = getAnnCategory(item.category);
  const isDraft = item.status === "draft";

  return (
    <article
      className={`ann-card ann-card--${item.category} ${
        isDraft ? "is-draft" : ""
      }`}
    >
      <div className="ann-card-top">
        <span className="ann-card-icon">
          <i className={`bi ${category.icon}`}></i>
        </span>

        <span className="ann-card-category">{category.label}</span>

        {isDraft ? (
          <span className="ann-draft-badge">DRAFT</span>
        ) : (
          <span className="ann-priority-dot" title="Published"></span>
        )}
      </div>

      <h4 className="ann-card-title">{item.heading}</h4>

      <p className="ann-card-text">{item.description}</p>

      <div className="ann-card-footer">
        <time className="ann-card-date">{formatAnnDate(item.createdAt)}</time>

        <div className="ann-card-actions">
          <button
            type="button"
            className="ann-icon-btn"
            title="Edit"
            onClick={() => onEdit(item)}
          >
            <i className="bi bi-pencil-square"></i>
          </button>

          <button
            type="button"
            className="ann-icon-btn"
            title="Copy to clipboard"
            onClick={() => onShare(item)}
          >
            <i className="bi bi-share"></i>
          </button>

          <button
            type="button"
            className="ann-icon-btn ann-icon-btn--danger"
            title="Delete"
            disabled={deleting}
            onClick={() => onDelete(item)}
          >
            <i className="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    </article>
  );
}

// ---------- Announcements page ----------

function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [form, setForm] = useState(ANN_EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(null); // "post" | "draft" | null
  const [deletingId, setDeletingId] = useState(null);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const formRef = useRef(null);

  const isEditing = Boolean(form.id);
  const busy = submitting !== null;

  const showToast = (type, message) => {
    clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const sortByNewest = (items) =>
    [...items].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

  const loadAnnouncements = async () => {
    try {
      setListLoading(true);
      setListError("");

      const items = await announcementApi.list();
      setAnnouncements(sortByNewest(items));
    } catch (error) {
      console.error("Load announcements error:", error);
      setListError(error.message || "Unable to load announcements.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (field) => (event) => {
    const value = event.target.value;

    setForm((previous) => ({ ...previous, [field]: value }));

    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: "" }));
    }
  };

  const resetForm = () => {
    setForm(ANN_EMPTY_FORM);
    setErrors({});
  };

  const validate = (asDraft) => {
    const nextErrors = {};

    if (!form.heading.trim()) {
      nextErrors.heading = "Please enter a heading.";
    } else if (!asDraft && form.heading.trim().length < 3) {
      nextErrors.heading = "Heading must be at least 3 characters.";
    }

    if (!asDraft && !form.description.trim()) {
      nextErrors.description = "Please enter a description.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const upsertAnnouncement = (saved) => {
    setAnnouncements((previous) => {
      const exists = previous.some((item) => item.id === saved.id);

      const next = exists
        ? previous.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...previous];

      return sortByNewest(next);
    });
  };

  const submit = async (status) => {
    const asDraft = status === "draft";

    if (!validate(asDraft)) return;

    try {
      setSubmitting(asDraft ? "draft" : "post");

      const saved = await announcementApi.save({
        id: form.id || undefined,
        category: form.category,
        heading: form.heading.trim(),
        description: form.description.trim(),
        info: form.info.trim(),
        status,
      });

      upsertAnnouncement(saved);
      resetForm();

      showToast(
        "success",
        asDraft
          ? "Draft saved."
          : isEditing
          ? "Announcement updated."
          : "Announcement posted."
      );
    } catch (error) {
      console.error("Save announcement error:", error);
      showToast("error", error.message || "Unable to save announcement.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submit("published");
  };

  const handleEdit = (item) => {
    setForm({
      id: item.id,
      category: item.category,
      heading: item.heading,
      description: item.description,
      info: item.info || "",
    });

    setErrors({});

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.heading}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(item.id);

      await announcementApi.remove(item.id);

      setAnnouncements((previous) =>
        previous.filter((entry) => entry.id !== item.id)
      );

      if (form.id === item.id) resetForm();

      showToast("success", "Announcement deleted.");
    } catch (error) {
      console.error("Delete announcement error:", error);
      showToast("error", error.message || "Unable to delete announcement.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = async (item) => {
    try {
      await navigator.clipboard.writeText(
        `${item.heading}\n\n${item.description}`
      );
      showToast("success", "Copied to clipboard.");
    } catch (error) {
      showToast("error", "Could not copy to clipboard.");
    }
  };

  return (
    <div className="ann-page">
      <div className="ann-glow ann-glow-1"></div>
      <div className="ann-glow ann-glow-2"></div>

      {toast && (
        <div
          className={`ann-toast ann-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <i
            className={`bi ${
              toast.type === "success"
                ? "bi-check-circle-fill"
                : "bi-exclamation-triangle-fill"
            }`}
          ></i>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="ann-layout">
        {/* ====================================================
            CREATE / EDIT
        ==================================================== */}
        <section className="ann-main-col" ref={formRef}>
          <header className="ann-page-header">
            <h1 className="ann-page-title">
              {isEditing ? "Edit Announcement" : "Create Announcement"}
            </h1>

            <i className="bi bi-megaphone ann-page-title-icon"></i>
          </header>

          <form className="ann-form-card" onSubmit={handleSubmit} noValidate>
            <div className="ann-form-card-header">
              <div className="ann-form-card-title">
                <i className="bi bi-megaphone-fill"></i>
                <span>
                  {isEditing ? "Editing Announcement" : "New Hub Announcement"}
                </span>
              </div>

              <span className="ann-chip">
                <i
                  className={`bi ${
                    isEditing ? "bi-pencil-square" : "bi-plus-lg"
                  }`}
                ></i>
                {isEditing ? "Edit" : "Create"}
              </span>
            </div>

            {/* Category */}
            <div className="ann-field">
              <span className="ann-label">Category</span>

              <div className="ann-category-group" role="radiogroup">
                {ANN_CATEGORIES.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    role="radio"
                    aria-checked={form.category === category.key}
                    className={`ann-category-btn ann-category-btn--${
                      category.key
                    } ${form.category === category.key ? "active" : ""}`}
                    onClick={() =>
                      setForm((previous) => ({
                        ...previous,
                        category: category.key,
                      }))
                    }
                  >
                    <i className={`bi ${category.icon}`}></i>
                    <span>{category.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Heading */}
            <div className="ann-field">
              <div className="ann-label-row">
                <label className="ann-label" htmlFor="ann-heading">
                  Heading
                </label>

                <span className="ann-counter">
                  {form.heading.length}/{ANN_HEADING_MAX}
                </span>
              </div>

              <input
                id="ann-heading"
                type="text"
                className={`ann-input ${errors.heading ? "is-invalid" : ""}`}
                placeholder="Enter announcement heading..."
                maxLength={ANN_HEADING_MAX}
                value={form.heading}
                onChange={updateField("heading")}
              />

              {errors.heading && (
                <span className="ann-error">
                  <i className="bi bi-exclamation-circle"></i>
                  {errors.heading}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="ann-field">
              <div className="ann-label-row">
                <label className="ann-label" htmlFor="ann-description">
                  Description
                </label>

                <span className="ann-counter">
                  {form.description.length}/{ANN_DESCRIPTION_MAX}
                </span>
              </div>

              <textarea
                id="ann-description"
                rows={5}
                className={`ann-input ann-textarea ${
                  errors.description ? "is-invalid" : ""
                }`}
                placeholder="Enter announcement body text..."
                maxLength={ANN_DESCRIPTION_MAX}
                value={form.description}
                onChange={updateField("description")}
              ></textarea>

              {errors.description && (
                <span className="ann-error">
                  <i className="bi bi-exclamation-circle"></i>
                  {errors.description}
                </span>
              )}
            </div>

            {/* Important info */}
            <div className="ann-info-box">
              <div className="ann-info-header">
                <span className="ann-info-pill">
                  <i className="bi bi-info-circle-fill"></i>
                  Info
                </span>

                <span className="ann-info-title">IMPORTANT INFORMATION</span>

                <span className="ann-counter ann-counter-end">
                  {form.info.length}/{ANN_INFO_MAX}
                </span>
              </div>

              <textarea
                rows={3}
                className="ann-info-textarea"
                placeholder="Add crucial metadata or context here (optional)..."
                maxLength={ANN_INFO_MAX}
                value={form.info}
                onChange={updateField("info")}
              ></textarea>
            </div>

            {/* Buttons */}
            <div className="ann-form-actions">
              <button
                type="submit"
                className="ann-btn ann-btn--primary"
                disabled={busy}
              >
                {submitting === "post" ? (
                  <>
                    <span className="ann-spinner"></span>
                    {isEditing ? "Updating..." : "Posting..."}
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill"></i>
                    {isEditing ? "Update Announcement" : "Post Announcement"}
                  </>
                )}
              </button>

              <button
                type="button"
                className="ann-btn ann-btn--secondary"
                disabled={busy}
                onClick={() => submit("draft")}
              >
                {submitting === "draft" ? (
                  <>
                    <span className="ann-spinner"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-floppy"></i>
                    Save Draft
                  </>
                )}
              </button>

              <button
                type="button"
                className="ann-btn ann-btn--ghost"
                disabled={busy}
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>

        {/* ====================================================
            CURRENT ANNOUNCEMENTS
        ==================================================== */}
        <aside className="ann-side-col">
          <div className="ann-list-panel">
            <div className="ann-list-header">
              <h2 className="ann-list-title">
                <i className="bi bi-clock-history"></i>
                Current Announcements
              </h2>

              {!listLoading && !listError && (
                <span className="ann-count">{announcements.length}</span>
              )}
            </div>

            <div className="ann-list-body">
              {listLoading ? (
                [1, 2, 3].map((key) => (
                  <div className="ann-skeleton" key={key}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ))
              ) : listError ? (
                <div className="ann-state">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <p>{listError}</p>

                  <button
                    type="button"
                    className="ann-btn ann-btn--secondary ann-btn--sm"
                    onClick={loadAnnouncements}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                    Try again
                  </button>
                </div>
              ) : announcements.length === 0 ? (
                <div className="ann-state">
                  <i className="bi bi-megaphone"></i>
                  <p>No announcements yet.</p>
                </div>
              ) : (
                announcements.map((item) => (
                  <AnnouncementCard
                    key={item.id}
                    item={item}
                    deleting={deletingId === item.id}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onShare={handleShare}
                  />
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ============================================================
// MAIN ADMIN CHAT
// ============================================================

function AdminChat() {
  const storedAdminUser = getStoredAdminUser();

  const adminUser = {
    id:
      storedAdminUser?.id ||
      storedAdminUser?.adminId ||
      storedAdminUser?._id ||
      "ADM-001",

    name:
      storedAdminUser?.name ||
      storedAdminUser?.username ||
      "Admin",

    username: storedAdminUser?.username || "admin",
    role: storedAdminUser?.role || "ADMIN",
    isAdmin: true,

    avatar:
      storedAdminUser?.avatar ||
      storedAdminUser?.profileImage ||
      DEFAULT_AVATAR,
  };

  const adminIdentifier =
    `admin:${adminUser.id}`.toLowerCase();

  // ==========================================================
  // STATE
  // ==========================================================

  const [activeNav, setActiveNav] = useState("private");
  const [memberList, setMemberList] = useState([]);
  const [activeMemberId, setActiveMemberId] = useState("");
  const [conversations, setConversations] = useState({});
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);

  const [notificationPermission, setNotificationPermission] =
    useState(() =>
      typeof Notification === "undefined"
        ? "unsupported"
        : Notification.permission
    );

  const [groupLoading, setGroupLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [
    editingGroupMessageId,
    setEditingGroupMessageId,
  ] = useState(null);

  const [
    editingPrivateMessageId,
    setEditingPrivateMessageId,
  ] = useState(null);

  const [openMessageMenu, setOpenMessageMenu] = useState(null);

  const [navOpen, setNavOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminVerifyLoading, setAdminVerifyLoading] =
    useState(true);
  const [adminVerifyError, setAdminVerifyError] = useState("");
  const [adminSocketAuthenticated, setAdminSocketAuthenticated] =
    useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const activeNavRef = useRef(activeNav);
  activeNavRef.current = activeNav;
  const inputRef = useRef(null);

  const editingGroupIdRef = useRef(null);
  const editingPrivateIdRef = useRef(null);

  editingGroupIdRef.current = editingGroupMessageId;
  editingPrivateIdRef.current = editingPrivateMessageId;

  // Stores latest live presence by normalized member wallet.
  const presenceByWalletRef = useRef(new Map());

  // ==========================================================
  // ACTIVE MEMBER
  // ==========================================================

  const activeMember =
    memberList.find(
      (member) => member.id === activeMemberId
    ) || null;

  const activeMemberWallet = normalizeWallet(
    activeMember?.walletAddress
  );

  const activeMessages =
    conversations[activeMemberWallet] || [];

  // ==========================================================
  // CLOSE MESSAGE MENU WHEN CLICKING OUTSIDE
  // ==========================================================

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (
        !event.target.closest(".admin-message-menu-wrap")
      ) {
        setOpenMessageMenu(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener(
        "click",
        handleDocumentClick
      );
    };
  }, []);

  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [groupMessages, activeMessages]);

  // ==========================================================
  // VERIFY ADMIN
  // ==========================================================

  useEffect(() => {
    const verifyAdminSession = async () => {
      setAdminVerifyLoading(true);
      setAdminVerifyError("");

      const token = getAdminToken();

      if (!token) {
        setAdminVerified(false);
        setAdminVerifyLoading(false);
        setAdminVerifyError(
          "Admin authentication token not found."
        );
        return;
      }

      try {
        const response = await fetch(
          `${ADMIN_API_URL}/verify`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || "Admin authentication failed."
          );
        }

        if (data?.admin?.adminId) {
          const currentAdmin = getStoredAdminUser() || {};

          const updatedAdmin = {
            ...currentAdmin,
            id: data.admin.adminId,
            adminId: data.admin.adminId,
            username:
              data.admin.username ||
              currentAdmin.username ||
              "admin",
            role: data.admin.role || "ADMIN",
          };

          localStorage.setItem(
            "adminUser",
            JSON.stringify(updatedAdmin)
          );
        }

        setAdminVerified(true);
      } catch (error) {
        console.error("Admin verification error:", error);

        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");

        setAdminVerified(false);
        setAdminVerifyError(
          error.message || "Admin authentication failed."
        );
      } finally {
        setAdminVerifyLoading(false);
      }
    };

    verifyAdminSession();
  }, []);

  // ==========================================================
  // FETCH MEMBERS
  // Merge API data with the most recent live presence data.
  // ==========================================================

  useEffect(() => {
    const fetchMembers = async () => {
      if (!adminVerified) return;

      const token = getAdminToken();

      if (!token) {
        setMemberError(
          "Admin authentication token is missing."
        );
        return;
      }

      try {
        setLoadingMembers(true);
        setMemberError("");

        const response = await fetch(
          `${ADMIN_API_URL}/members`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to fetch community members."
          );
        }

        const members = Array.isArray(data)
          ? data
          : data?.members || [];

        const formattedMembers = members.map((member) => {
          const walletAddress =
            member.walletAddress ||
            member.wallet ||
            "";

          const wallet = normalizeWallet(walletAddress);
          const livePresence =
            presenceByWalletRef.current.get(wallet);

          return {
            id: member._id || member.id,

            walletAddress,

            name:
              member.fullName ||
              member.name ||
              member.username ||
              "Community Member",

            username: member.username || "",

            // Live socket presence takes priority over API status.
            status: livePresence
              ? getMemberPresenceStatus(livePresence)
              : "offline",

            lastSeen: livePresence?.lastSeen || null,

            avatar:
              member.profileImage ||
              member.avatar ||
              DEFAULT_AVATAR,

            email: member.email || "",
            phone: member.phone || "",
            dob: member.dob || "",
          };
        });

        setMemberList(formattedMembers);

        const savedWallet = normalizeWallet(
          localStorage.getItem(ADMIN_ACTIVE_MEMBER_KEY)
        );

        if (savedWallet) {
          const savedMember = formattedMembers.find(
            (member) =>
              normalizeWallet(member.walletAddress) ===
              savedWallet
          );

          if (savedMember) {
            setActiveMemberId(savedMember.id);
            return;
          }
        }

        if (formattedMembers[0]) {
          setActiveMemberId(formattedMembers[0].id);
        }
      } catch (error) {
        console.error("Fetch admin members error:", error);

        setMemberError(
          error.message || "Unable to load community members."
        );
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [adminVerified]);

  // ==========================================================
  // SAVE ACTIVE MEMBER
  // ==========================================================

  useEffect(() => {
    if (!activeMemberWallet) return;

    localStorage.setItem(
      ADMIN_ACTIVE_MEMBER_KEY,
      activeMemberWallet
    );
  }, [activeMemberWallet]);

  // ==========================================================
  // BROWSER NOTIFICATIONS
  // ==========================================================

  const requestBrowserNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      alert(
        "Your browser does not support desktop notifications."
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      setNotificationPermission(permission);

      if (permission === "granted") {
        new Notification("Community X", {
          body: "Desktop notifications are enabled.",
          icon: DEFAULT_AVATAR,
        });
      } else if (permission === "denied") {
        alert(
          "Notifications are blocked. Enable them in your browser's site settings."
        );
      }
    } catch (error) {
      console.error("Notification permission error:", error);
    }
  };

  const showAdminBrowserNotification = (title, body) => {
    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: DEFAULT_AVATAR,
        tag: "community-x-group-message",
      });

      notification.onclick = () => {
        window.focus();
        setActiveNav("group");
        activeNavRef.current = "group";
        setGroupUnreadCount(0);
        notification.close();
      };
    } catch (error) {
      console.error(
        "Could not show browser notification:",
        error
      );
    }
  };

  // ==========================================================
  // ADMIN SOCKET.IO
  // ==========================================================

  useEffect(() => {
    if (!adminVerified) return;

    const adminToken = getAdminToken();

    if (!adminToken) return;

    setAdminSocketAuthenticated(false);

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Admin Socket.IO connected:", socket.id);

      socket.emit("authenticate-admin-socket", {
        token: adminToken,
      });
    });

    socket.on("admin-socket-authenticated", (data) => {
      console.log("Admin Socket.IO authenticated:", data);

      setAdminSocketAuthenticated(true);

      // Request current presence immediately after authentication.
      socket.emit("get-presence-snapshot");
    });

    socket.on("admin-socket-auth-error", (error) => {
      console.error("Admin Socket.IO auth error:", error);
      setAdminSocketAuthenticated(false);
    });

    // ========================================================
    // PRESENCE SNAPSHOT
    // ========================================================

    socket.on("presence-snapshot", (presenceList) => {
      if (!Array.isArray(presenceList)) return;

      const nextPresenceMap = new Map();

      presenceList.forEach((presence) => {
        // Admin dashboard displays community member presence.
        if (presence?.userType !== "MEMBER") return;

        const wallet = getMemberPresenceWallet(presence);

        if (!wallet) return;

        nextPresenceMap.set(wallet, presence);
      });

      // Replace with the server's current snapshot.
      presenceByWalletRef.current = nextPresenceMap;

      setMemberList((previousMembers) =>
        previousMembers.map((member) => {
          const wallet = normalizeWallet(
            member.walletAddress
          );

          const presence = nextPresenceMap.get(wallet);

          return {
            ...member,
            status: presence
              ? getMemberPresenceStatus(presence)
              : "offline",
            lastSeen: presence?.lastSeen || null,
          };
        })
      );

      console.log(
        "Member presence snapshot received:",
        nextPresenceMap.size
      );
    });

    // ========================================================
    // LIVE PRESENCE UPDATE
    // ========================================================

    socket.on("presence-update", (presence) => {
      if (presence?.userType !== "MEMBER") return;

      const wallet = getMemberPresenceWallet(presence);

      if (!wallet) return;

      // Save latest status for future API results and reconnects.
      presenceByWalletRef.current.set(wallet, presence);

      setMemberList((previousMembers) =>
        previousMembers.map((member) => {
          const memberWallet = normalizeWallet(
            member.walletAddress
          );

          if (memberWallet !== wallet) return member;

          return {
            ...member,
            status: getMemberPresenceStatus(presence),
            lastSeen: presence.lastSeen || null,
          };
        })
      );

      console.log(
        `Member presence updated: ${wallet} is ${presence.status}`
      );
    });

    // ========================================================
    // NEW GROUP MESSAGE
    // ========================================================

    socket.on("new-group-message", (incomingMessage) => {
      if (!incomingMessage) return;

      const sender = normalizeWallet(
        incomingMessage.senderWallet
      );

      const isOwnMessage = sender === adminIdentifier;

      const formattedMessage = {
        ...incomingMessage,
        id: incomingMessage._id || incomingMessage.id,
        senderWallet: incomingMessage.senderWallet || "",
        senderName:
          incomingMessage.senderName || "Community Member",
        senderAvatar:
          incomingMessage.senderAvatar || DEFAULT_AVATAR,
        message: incomingMessage.message || "",
        createdAt:
          incomingMessage.createdAt ||
          new Date().toISOString(),
        isEdited: incomingMessage.isEdited === true,
        isAdmin: isOwnMessage,
      };

      let isDuplicate = false;

      setGroupMessages((previous) => {
        const messageId = formattedMessage.id;

        if (
          messageId &&
          previous.some(
            (message) =>
              String(message.id) === String(messageId)
          )
        ) {
          isDuplicate = true;
          return previous;
        }

        return [...previous, formattedMessage];
      });

      if (isOwnMessage || isDuplicate) return;

      if (activeNavRef.current !== "group") {
        setGroupUnreadCount((count) => count + 1);
      }

      if (
        activeNavRef.current !== "group" ||
        document.hidden
      ) {
        showAdminBrowserNotification(
          `New group message from ${formattedMessage.senderName}`,
          formattedMessage.message
        );
      }
    });

    // ========================================================
    // NEW PRIVATE MESSAGE
    // ========================================================

    socket.on("new-private-message", (incomingMessage) => {
      const sender = normalizeWallet(
        incomingMessage?.senderWallet
      );

      const receiver = normalizeWallet(
        incomingMessage?.receiverWallet
      );

      if (
        sender !== adminIdentifier &&
        receiver !== adminIdentifier
      ) {
        return;
      }

      const memberWallet =
        sender === adminIdentifier ? receiver : sender;

      if (!memberWallet) return;

      const formattedMessage = {
        ...incomingMessage,
        id: incomingMessage?._id || incomingMessage?.id,
        senderWallet: incomingMessage?.senderWallet || "",
        senderName:
          incomingMessage?.senderName || "Community Member",
        senderAvatar:
          incomingMessage?.senderAvatar || DEFAULT_AVATAR,
        message: incomingMessage?.message || "",
        receiverWallet:
          incomingMessage?.receiverWallet || "",
        createdAt:
          incomingMessage?.createdAt ||
          new Date().toISOString(),
        isEdited: incomingMessage?.isEdited === true,
        isAdmin: sender === adminIdentifier,
      };

      setConversations((previous) => {
        const current = previous[memberWallet] || [];

        if (
          formattedMessage.id &&
          current.some(
            (message) =>
              String(message.id) ===
              String(formattedMessage.id)
          )
        ) {
          return previous;
        }

        return {
          ...previous,
          [memberWallet]: [...current, formattedMessage],
        };
      });
    });

    // ========================================================
    // GROUP MESSAGE UPDATED
    // ========================================================

    socket.on("message-updated", (updatedMessage) => {
      const messageId =
        updatedMessage?._id || updatedMessage?.id;

      if (!messageId) return;

      setGroupMessages((previous) =>
        previous.map((message) =>
          String(message.id) === String(messageId)
            ? {
                ...message,
                ...updatedMessage,
                id: messageId,
                isEdited: true,
                isAdmin:
                  normalizeWallet(
                    updatedMessage?.senderWallet
                  ) === adminIdentifier,
              }
            : message
        )
      );
    });

    // ========================================================
    // GROUP MESSAGE DELETED
    // ========================================================

    socket.on("message-deleted", (deletedMessage) => {
      const messageId =
        typeof deletedMessage === "string"
          ? deletedMessage
          : deletedMessage?._id || deletedMessage?.id;

      if (!messageId) return;

      setGroupMessages((previous) =>
        previous.filter(
          (message) =>
            String(message.id) !== String(messageId)
        )
      );

      setOpenMessageMenu(null);

      if (
        String(editingGroupIdRef.current) ===
        String(messageId)
      ) {
        setEditingGroupMessageId(null);
        setDraft("");
      }
    });

    // ========================================================
    // PRIVATE MESSAGE UPDATED
    // ========================================================

    socket.on(
      "private-message-updated",
      (updatedMessage) => {
        const messageId =
          updatedMessage?._id || updatedMessage?.id;

        if (!messageId) return;

        const sender = normalizeWallet(
          updatedMessage?.senderWallet
        );

        const receiver = normalizeWallet(
          updatedMessage?.receiverWallet
        );

        const memberWallet =
          sender === adminIdentifier ? receiver : sender;

        if (!memberWallet) return;

        setConversations((previous) => ({
          ...previous,
          [memberWallet]: (
            previous[memberWallet] || []
          ).map((message) =>
            String(message.id) === String(messageId)
              ? {
                  ...message,
                  ...updatedMessage,
                  id: messageId,
                  isEdited: true,
                  isAdmin: sender === adminIdentifier,
                }
              : message
          ),
        }));

        setOpenMessageMenu(null);
      }
    );

    // ========================================================
    // PRIVATE MESSAGE DELETED
    // ========================================================

    socket.on(
      "private-message-deleted",
      (deletedMessage) => {
        const messageId =
          typeof deletedMessage === "string"
            ? deletedMessage
            : deletedMessage?._id || deletedMessage?.id;

        if (!messageId) return;

        setConversations((previous) => {
          const updated = { ...previous };

          Object.keys(updated).forEach((wallet) => {
            updated[wallet] = updated[wallet].filter(
              (message) =>
                String(message.id) !== String(messageId)
            );
          });

          return updated;
        });

        setOpenMessageMenu(null);

        if (
          String(editingPrivateIdRef.current) ===
          String(messageId)
        ) {
          setEditingPrivateMessageId(null);
          setDraft("");
        }
      }
    );

    socket.on("disconnect", (reason) => {
      console.log(
        "Admin Socket.IO disconnected:",
        reason
      );

      setAdminSocketAuthenticated(false);
    });

    socket.on("connect_error", (error) => {
      console.error(
        "Admin Socket.IO connection error:",
        error
      );

      setAdminSocketAuthenticated(false);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setAdminSocketAuthenticated(false);
    };
  }, [adminVerified, adminIdentifier]);

  // ==========================================================
  // FETCH GROUP HISTORY
  // ==========================================================

  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!adminVerified || activeNav !== "group") return;

      const token = getAdminToken();

      if (!token) return;

      try {
        setGroupLoading(true);

        const response = await fetch(
          `${ADMIN_API_URL}/messages/group`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to fetch admin group messages."
          );
        }

        const messages = Array.isArray(data)
          ? data
          : data?.messages || [];

        const formattedMessages = messages.map((message) => {
          const sender = normalizeWallet(
            message.senderWallet
          );

          return {
            ...message,
            id: message._id || message.id,
            senderWallet: message.senderWallet || "",
            senderName:
              message.senderName || "Community Member",
            senderAvatar:
              message.senderAvatar || DEFAULT_AVATAR,
            message: message.message || "",
            createdAt:
              message.createdAt ||
              new Date().toISOString(),
            isEdited: message.isEdited === true,
            isAdmin: sender === adminIdentifier,
          };
        });

        setGroupMessages(formattedMessages);
      } catch (error) {
        console.error(
          "Fetch admin group messages error:",
          error
        );
      } finally {
        setGroupLoading(false);
      }
    };

    fetchGroupMessages();
  }, [activeNav, adminVerified, adminIdentifier]);

  // ==========================================================
  // FETCH PRIVATE HISTORY
  // ==========================================================

  useEffect(() => {
    const fetchPrivateMessages = async () => {
      if (
        !adminVerified ||
        activeNav !== "private" ||
        !activeMemberWallet
      ) {
        return;
      }

      const token = getAdminToken();

      if (!token) {
        setMemberError(
          "Admin authentication token is missing."
        );
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(
          `${ADMIN_API_URL}/messages/private/${activeMemberWallet}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to fetch private messages."
          );
        }

        const messages = Array.isArray(data)
          ? data
          : data?.messages || [];

        const formattedMessages = messages.map((message) => {
          const sender = normalizeWallet(
            message.senderWallet
          );

          return {
            ...message,
            id: message._id || message.id,
            senderWallet: message.senderWallet || "",
            senderName:
              message.senderName || "Community Member",
            senderAvatar:
              message.senderAvatar || DEFAULT_AVATAR,
            message: message.message || "",
            receiverWallet: message.receiverWallet || "",
            createdAt:
              message.createdAt ||
              new Date().toISOString(),
            isEdited: message.isEdited === true,
            isAdmin: sender === adminIdentifier,
          };
        });

        setConversations((previous) => ({
          ...previous,
          [activeMemberWallet]: formattedMessages,
        }));
      } catch (error) {
        console.error(
          "Fetch admin private messages error:",
          error
        );

        setConversations((previous) => ({
          ...previous,
          [activeMemberWallet]: [],
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchPrivateMessages();
  }, [
    activeNav,
    activeMemberWallet,
    adminVerified,
    adminIdentifier,
  ]);

  // ==========================================================
  // GROUP EDIT
  // ==========================================================

  const handleStartGroupEdit = (message) => {
    if (!message?.id || !message?.isAdmin) return;

    setOpenMessageMenu(null);
    setEditingPrivateMessageId(null);
    setEditingGroupMessageId(message.id);
    setDraft(message.message || "");

    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCancelGroupEdit = () => {
    setEditingGroupMessageId(null);
    setDraft("");
  };

  const handleUpdateGroupMessage = async () => {
    const text = draft.trim();

    if (!editingGroupMessageId || !text) return;

    const token = getAdminToken();

    if (!token) {
      alert("Admin authentication token is missing.");
      return;
    }

    try {
      setSending(true);

      const response = await fetch(
        `${ADMIN_API_URL}/messages/group/${editingGroupMessageId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: text }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to update group message."
        );
      }

      const updatedMessage = extractMessageData(data);

      const messageId =
        updatedMessage?._id ||
        updatedMessage?.id ||
        editingGroupMessageId;

      setGroupMessages((previous) =>
        previous.map((message) =>
          String(message.id) === String(messageId)
            ? {
                ...message,
                ...(updatedMessage || {}),
                id: messageId,
                message: updatedMessage?.message || text,
                isEdited: true,
                isAdmin: true,
              }
            : message
        )
      );

      setOpenMessageMenu(null);
      handleCancelGroupEdit();
    } catch (error) {
      console.error(
        "Update admin group message error:",
        error
      );

      alert(
        error.message || "Unable to update group message."
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================================
  // GROUP DELETE
  // ==========================================================

  const handleDeleteGroupMessage = async (messageId) => {
    if (!messageId) return;

    setOpenMessageMenu(null);

    const shouldDelete = window.confirm(
      "Delete this group message? This action cannot be undone."
    );

    if (!shouldDelete) return;

    const token = getAdminToken();

    if (!token) {
      alert("Admin authentication token is missing.");
      return;
    }

    try {
      setSending(true);

      const response = await fetch(
        `${ADMIN_API_URL}/messages/group/${messageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to delete group message."
        );
      }

      setGroupMessages((previous) =>
        previous.filter(
          (message) =>
            String(message.id) !== String(messageId)
        )
      );

      if (
        String(editingGroupMessageId) === String(messageId)
      ) {
        handleCancelGroupEdit();
      }
    } catch (error) {
      console.error(
        "Delete admin group message error:",
        error
      );

      alert(
        error.message || "Unable to delete group message."
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================================
  // PRIVATE EDIT
  // ==========================================================

  const handleStartPrivateEdit = (message) => {
    if (!message?.id || !message?.isAdmin) return;

    setOpenMessageMenu(null);
    setEditingGroupMessageId(null);
    setEditingPrivateMessageId(message.id);
    setDraft(message.message || "");

    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCancelPrivateEdit = () => {
    setEditingPrivateMessageId(null);
    setDraft("");
  };

  const handleUpdatePrivateMessage = async () => {
    const text = draft.trim();

    if (!editingPrivateMessageId || !text) return;

    const token = getAdminToken();

    if (!token) {
      alert("Admin authentication token is missing.");
      return;
    }

    try {
      setSending(true);

      const response = await fetch(
        `${ADMIN_API_URL}/messages/private/${editingPrivateMessageId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: text }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to update private message."
        );
      }

      const updatedMessage = extractMessageData(data);

      const messageId =
        updatedMessage?._id ||
        updatedMessage?.id ||
        editingPrivateMessageId;

      setConversations((previous) => {
        const updated = { ...previous };

        Object.keys(updated).forEach((wallet) => {
          updated[wallet] = updated[wallet].map((message) =>
            String(message.id) === String(messageId)
              ? {
                  ...message,
                  ...(updatedMessage || {}),
                  id: messageId,
                  message: updatedMessage?.message || text,
                  isEdited: true,
                  isAdmin: true,
                }
              : message
          );
        });

        return updated;
      });

      setOpenMessageMenu(null);
      handleCancelPrivateEdit();
    } catch (error) {
      console.error(
        "Update private message error:",
        error
      );

      alert(
        error.message || "Unable to update private message."
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================================
  // PRIVATE DELETE
  // ==========================================================

  const handleDeletePrivateMessage = async (messageId) => {
    if (!messageId) return;

    setOpenMessageMenu(null);

    const shouldDelete = window.confirm(
      "Delete this private message? This action cannot be undone."
    );

    if (!shouldDelete) return;

    const token = getAdminToken();

    if (!token) {
      alert("Admin authentication token is missing.");
      return;
    }

    try {
      setSending(true);

      const response = await fetch(
        `${ADMIN_API_URL}/messages/private/${messageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to delete private message."
        );
      }

      setConversations((previous) => {
        const updated = { ...previous };

        Object.keys(updated).forEach((wallet) => {
          updated[wallet] = updated[wallet].filter(
            (message) =>
              String(message.id) !== String(messageId)
          );
        });

        return updated;
      });

      if (
        String(editingPrivateMessageId) === String(messageId)
      ) {
        handleCancelPrivateEdit();
      }
    } catch (error) {
      console.error(
        "Delete private message error:",
        error
      );

      alert(
        error.message || "Unable to delete private message."
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================================
  // SEND MESSAGE OR UPDATE
  // ==========================================================

  const handleSend = async () => {
    const text = draft.trim();

    if (!text) return;

    if (
      activeNav === "group" &&
      editingGroupMessageId
    ) {
      await handleUpdateGroupMessage();
      return;
    }

    if (
      activeNav === "private" &&
      editingPrivateMessageId
    ) {
      await handleUpdatePrivateMessage();
      return;
    }

    if (!adminVerified) {
      alert("Admin authentication is not ready.");
      return;
    }

    try {
      setSending(true);

      const token = getAdminToken();

      if (!token) {
        throw new Error(
          "Admin authentication token is missing."
        );
      }

      if (activeNav === "group") {
        const response = await fetch(
          `${ADMIN_API_URL}/messages/group`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              senderName: adminUser.name,
              senderAvatar: adminUser.avatar,
              message: text,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to send admin group message."
          );
        }

        const createdMessage = extractMessageData(data);

        const formattedMessage = {
          ...(createdMessage || {}),
          id: createdMessage?._id || createdMessage?.id,
          senderWallet:
            createdMessage?.senderWallet || adminIdentifier,
          senderName:
            createdMessage?.senderName || adminUser.name,
          senderAvatar:
            createdMessage?.senderAvatar || adminUser.avatar,
          message: createdMessage?.message || text,
          chatType: createdMessage?.chatType || "GROUP",
          receiverWallet:
            createdMessage?.receiverWallet || null,
          createdAt:
            createdMessage?.createdAt ||
            new Date().toISOString(),
          isEdited: createdMessage?.isEdited === true,
          isAdmin: true,
        };

        setGroupMessages((previous) => {
          if (
            formattedMessage.id &&
            previous.some(
              (message) =>
                String(message.id) ===
                String(formattedMessage.id)
            )
          ) {
            return previous;
          }

          return [...previous, formattedMessage];
        });

        setDraft("");
        return;
      }

      if (
        activeNav === "private" &&
        activeMemberWallet
      ) {
        const response = await fetch(
          `${ADMIN_API_URL}/messages/private/${activeMemberWallet}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              senderName: adminUser.name,
              senderAvatar: adminUser.avatar,
              message: text,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to send private message."
          );
        }

        const createdMessage = extractMessageData(data);

        const formattedMessage = {
          ...(createdMessage || {}),
          id: createdMessage?._id || createdMessage?.id,
          senderWallet:
            createdMessage?.senderWallet || adminIdentifier,
          senderName:
            createdMessage?.senderName || adminUser.name,
          senderAvatar:
            createdMessage?.senderAvatar || adminUser.avatar,
          receiverWallet:
            createdMessage?.receiverWallet || activeMemberWallet,
          message: createdMessage?.message || text,
          chatType: createdMessage?.chatType || "PRIVATE",
          createdAt:
            createdMessage?.createdAt ||
            new Date().toISOString(),
          isEdited: createdMessage?.isEdited === true,
          isAdmin: true,
        };

        setConversations((previous) => {
          const current = previous[activeMemberWallet] || [];

          if (
            formattedMessage.id &&
            current.some(
              (message) =>
                String(message.id) ===
                String(formattedMessage.id)
            )
          ) {
            return previous;
          }

          return {
            ...previous,
            [activeMemberWallet]: [
              ...current,
              formattedMessage,
            ],
          };
        });

        setDraft("");
      }
    } catch (error) {
      console.error("Send message error:", error);

      alert(error.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  // ==========================================================
  // KEYBOARD
  // ==========================================================

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      if (editingGroupMessageId) {
        handleCancelGroupEdit();
      }

      if (editingPrivateMessageId) {
        handleCancelPrivateEdit();
      }

      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // ==========================================================
  // SELECT MEMBER
  // ==========================================================

  const handleSelectMember = (member) => {
    if (!member?.id) return;

    setActiveMemberId(member.id);

    localStorage.setItem(
      ADMIN_ACTIVE_MEMBER_KEY,
      normalizeWallet(member.walletAddress)
    );

    setActiveNav("private");
    activeNavRef.current = "private";
    setListOpen(true);
    setNavOpen(false);
    setOpenMessageMenu(null);
    handleCancelGroupEdit();
    handleCancelPrivateEdit();
    setDraft("");
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    window.location.href = "/admin-login";
  };

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleNavChange = (key) => {
    if (key === "auth") {
      handleLogout();
      return;
    }

    handleCancelGroupEdit();
    handleCancelPrivateEdit();

    setOpenMessageMenu(null);
    setActiveNav(key);
    activeNavRef.current = key;

    if (key === "group") {
      setGroupUnreadCount(0);
    }

    setNavOpen(false);

    if (key === "private") {
      setListOpen(true);
    }

    if (key === "group" || key === "members" || key === "announcements") {
      setListOpen(false);
    }
  };

  // ==========================================================
  // AUTH LOADING
  // ==========================================================

  if (adminVerifyLoading) {
    return (
      <div className="admin-chat-loading-screen">
        <div className="admin-chat-loading-spinner"></div>
        <p>Verifying administrator access...</p>
      </div>
    );
  }

  // ==========================================================
  // AUTH FAILED
  // ==========================================================

  if (!adminVerified) {
    return (
      <div className="admin-chat-auth-error">
        <div className="admin-auth-error-card">
          <div className="admin-auth-error-icon">
            <i className="bi bi-shield-lock-fill"></i>
          </div>

          <h2>Admin Access Required</h2>

          <p>
            {adminVerifyError ||
              "You are not authorized to access the admin dashboard."}
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/admin-login";
            }}
          >
            <i className="bi bi-box-arrow-in-right"></i>
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MESSAGE MENU
  // ==========================================================

  const renderMessageMenu = (type, message) => {
    if (!message?.isAdmin) return null;

    const isOpen =
      openMessageMenu?.type === type &&
      String(openMessageMenu?.id) === String(message.id);

    const isBeingEdited =
      type === "group"
        ? String(editingGroupMessageId) === String(message.id)
        : String(editingPrivateMessageId) ===
          String(message.id);

    if (isBeingEdited) return null;

    return (
      <div
        className="admin-message-menu-wrap"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="admin-message-more-btn"
          title="Message options"
          disabled={sending}
          onClick={() => {
            setOpenMessageMenu(
              isOpen ? null : { type, id: message.id }
            );
          }}
        >
          <i className="bi bi-three-dots-vertical"></i>
        </button>

        {isOpen && (
          <div className="admin-message-dropdown">
            <button
              type="button"
              className="admin-message-dropdown-item"
              onClick={() => {
                if (type === "group") {
                  handleStartGroupEdit(message);
                } else {
                  handleStartPrivateEdit(message);
                }
              }}
            >
              <i className="bi bi-pencil-square"></i>
              <span>Edit</span>
            </button>

            <button
              type="button"
              className="admin-message-dropdown-item danger"
              onClick={() => {
                if (type === "group") {
                  handleDeleteGroupMessage(message.id);
                } else {
                  handleDeletePrivateMessage(message.id);
                }
              }}
            >
              <i className="bi bi-trash3"></i>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================
  // EDIT MODE HELPERS
  // ==========================================================

  const isEditing =
    (activeNav === "group" && !!editingGroupMessageId) ||
    (activeNav === "private" && !!editingPrivateMessageId);

  const cancelEdit = () => {
    handleCancelGroupEdit();
    handleCancelPrivateEdit();
  };

  const isMessageBeingEdited = (type, id) =>
    type === "group"
      ? String(editingGroupMessageId) === String(id)
      : String(editingPrivateMessageId) === String(id);

  const renderEditBanner = () =>
    isEditing ? (
      <div className="edit-banner">
        <div className="edit-banner-icon">
          <i className="bi bi-pencil"></i>
        </div>

        <div className="edit-banner-text">
          <strong>Editing message</strong>
          <span>Make your changes and update</span>
        </div>

        <button
          type="button"
          className="edit-banner-close"
          onClick={cancelEdit}
          title="Cancel edit"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
    ) : null;

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div
      className={`admin-chat-app ${
        activeNav === "private"
          ? "private-layout"
          : "single-content-layout"
      }`}
    >
      {(navOpen ||
        (activeNav === "private" && listOpen)) && (
        <div
          className="panel-backdrop"
          onClick={() => {
            setNavOpen(false);

            if (window.innerWidth <= 768) {
              setListOpen(false);
            }
          }}
        ></div>
      )}

      {/* ADMIN NAVIGATION */}

      <aside
        className={`admin-nav-panel ${navOpen ? "open" : ""}`}
      >
        <div className="admin-brand">
          <div className="brand-badge">
            <i className="bi bi-shield-fill-check"></i>
          </div>

          <div>
            <div className="brand-name">COMMUNITY X</div>
            <small className="text-secondary">ADMIN PANEL</small>
          </div>
        </div>

        <div className="admin-sidebar-profile">
          <div className="avatar-circle avatar-admin">
            <img src={adminUser.avatar} alt="Admin" />
          </div>

          <div className="member-row-text">
            <strong className="member-row-name">
              {adminUser.name}
            </strong>

            <span className="member-row-status">
              <span className="status-dot status-online"></span>
              Administrator
            </span>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={`admin-nav-item ${
                  isActive ? "active" : ""
                }`}
                onClick={() => handleNavChange(item.key)}
              >
                <span className="nav-icon">
                  <i className={`bi ${item.icon}`}></i>
                </span>

                <span>{item.label}</span>

                {item.key === "group" &&
                  groupUnreadCount > 0 && (
                    <span
                      className="admin-unread-badge"
                      aria-label={`${groupUnreadCount} unread group messages`}
                    >
                      {groupUnreadCount > 99
                        ? "99+"
                        : groupUnreadCount}
                    </span>
                  )}
              </button>
            );
          })}
        </nav>

        <div className="circuit-decor"></div>

        <div className="admin-nav-footer">
          <span>
            <i className="bi bi-shield-check"></i>
          </span>

          <small>Secure Admin Session</small>

          {notificationPermission !== "unsupported" && (
            <button
              type="button"
              className="admin-notification-toggle"
              onClick={requestBrowserNotificationPermission}
              disabled={notificationPermission === "granted"}
              title={
                notificationPermission === "granted"
                  ? "Desktop notifications are enabled"
                  : notificationPermission === "denied"
                  ? "Notifications are blocked in browser settings"
                  : "Enable desktop notifications"
              }
            >
              <i
                className={`bi ${
                  notificationPermission === "granted"
                    ? "bi-bell-fill"
                    : "bi-bell"
                }`}
              ></i>

              {notificationPermission === "granted"
                ? "Notifications enabled"
                : notificationPermission === "denied"
                ? "Notifications blocked"
                : "Enable notifications"}
            </button>
          )}
        </div>
      </aside>

      {/* MEMBER PANEL */}

      {activeNav === "private" && (
        <aside
          className={`member-panel ${
            listOpen ? "open" : ""
          }`}
        >
          <div className="member-panel-header">
            <div>
              <h3 className="member-panel-title">Members</h3>
              <span className="member-row-status">
                {memberList.length} total
              </span>
            </div>

            <button
              type="button"
              className="panel-toggle-btn"
              onClick={() => setListOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="member-search">
            <i className="bi bi-search"></i>

            <input
              type="text"
              placeholder="Search member..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="member-list">
            {loadingMembers ? (
              <div className="member-list-state">
                <div className="admin-chat-spinner"></div>
                <span>Loading members...</span>
              </div>
            ) : memberError ? (
              <div className="member-list-state">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <p>{memberError}</p>
              </div>
            ) : memberList.length === 0 ? (
              <div className="member-list-state">
                <i className="bi bi-people"></i>
                <p>No members available.</p>
              </div>
            ) : (
              memberList
                .filter((member) => {
                  const searchValue = search.toLowerCase().trim();

                  if (!searchValue) return true;

                  return (
                    member.name?.toLowerCase().includes(searchValue) ||
                    member.username?.toLowerCase().includes(searchValue) ||
                    member.walletAddress?.toLowerCase().includes(searchValue)
                  );
                })
                .map((member) => {
                  const isActive = member.id === activeMemberId;

                  return (
                    <button
                      type="button"
                      key={member.id || member.walletAddress}
                      className={`member-row ${
                        isActive ? "active" : ""
                      }`}
                      onClick={() => handleSelectMember(member)}
                    >
                      <div className="avatar-circle">
                        <img
                          src={member.avatar || DEFAULT_AVATAR}
                          alt={member.name || "Member"}
                        />
                      </div>

                      <div className="member-row-text">
                        <strong className="member-row-name">
                          {member.name || "Community Member"}
                        </strong>

                        <span className="member-row-status">
                          <span
                            className={`status-dot ${
                              member.status === "online"
                                ? "status-online"
                                : "status-offline"
                            }`}
                          ></span>

                          {member.status === "online"
                            ? "Online"
                            : "Offline"}
                        </span>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </aside>
      )}

      {/* MAIN CONTENT */}

      <main
        className={`chat-main ${
          activeNav === "members" ? "members-mode" : ""
        } ${activeNav === "announcements" ? "announcements-mode" : ""}`}
      >
        <header className="chat-header">
          <button
            type="button"
            className="mobile-admin-menu-btn"
            onClick={() => setNavOpen(!navOpen)}
          >
            <i className="bi bi-list"></i>
          </button>

          {activeNav === "private" && (
            <button
              type="button"
              className="mobile-member-menu-btn"
              onClick={() => setListOpen(!listOpen)}
            >
              <i className="bi bi-people"></i>
            </button>
          )}

          <div className="chat-header-title">
            {activeNav === "group" ? (
              <>
                <div className="avatar-circle avatar-admin">
                  <i className="bi bi-people-fill"></i>
                </div>

                <div>
                  <h1 className="chat-header-name">
                    Community X
                  </h1>

                  <span className="chat-header-status">
                    <span className="status-dot status-online"></span>
                    {memberList.length} members
                  </span>
                </div>
              </>
            ) : activeNav === "private" && activeMember ? (
              <>
                <div className="avatar-circle">
                  <img
                    src={activeMember.avatar || DEFAULT_AVATAR}
                    alt={activeMember.name}
                  />
                </div>

                <div>
                  <h1 className="chat-header-name">
                    {activeMember.name || "Community Member"}
                  </h1>

                  <span className="chat-header-status">
                    <span
                      className={`status-dot ${
                        activeMember.status === "online"
                          ? "status-online"
                          : "status-offline"
                      }`}
                    ></span>

                    {activeMember.status === "online"
                      ? "Online"
                      : "Offline"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="avatar-circle avatar-admin">
                  <i className="bi bi-shield-fill-check"></i>
                </div>

                <div>
                  <h1 className="chat-header-name">
                    {activeNav === "members"
                      ? "Member Management"
                      : activeNav === "announcements"
                      ? "Announcements"
                      : "Private Messages"}
                  </h1>

                  <span className="chat-header-status">
                    <span className="status-dot status-online"></span>
                    Admin Session Active
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="chat-header-actions">
            {activeNav !== "members" && activeNav !== "announcements" && (
              <>
                <button
                  type="button"
                  className="icon-btn"
                  title="Search"
                >
                  <i className="bi bi-search"></i>
                </button>

                <button
                  type="button"
                  className="icon-btn"
                  title="More"
                >
                  <i className="bi bi-three-dots-vertical"></i>
                </button>
              </>
            )}

            <button
              type="button"
              className="icon-btn"
              title="Logout"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </header>

        <div className="chat-messages-wrapper">
          {/* MEMBERS */}

          {activeNav === "members" && (
            <MembersDashboard
              members={memberList}
              search={search}
              setSearch={setSearch}
              onSelectMember={handleSelectMember}
              adminIdentifier={adminIdentifier}
            />
          )}

          {/* ANNOUNCEMENTS */}

          {activeNav === "announcements" && <AnnouncementsPanel />}

          {/* GROUP CHAT */}

          {activeNav === "group" && (
            <>
              <div className="glow-orb glow-orb-1"></div>
              <div className="glow-orb glow-orb-2"></div>
              <div className="glow-orb glow-orb-3"></div>

              <div className="chat-messages">
                {groupLoading ? (
                  <div className="admin-chat-empty-state">
                    <div className="admin-chat-spinner"></div>
                    <p>Loading group messages...</p>
                  </div>
                ) : groupMessages.length === 0 ? (
                  <div className="admin-chat-empty-state">
                    <div className="admin-chat-empty-icon">
                      <i className="bi bi-chat-dots"></i>
                    </div>

                    <h4>No group messages</h4>
                    <p>
                      Start the conversation with Community X.
                    </p>
                  </div>
                ) : (
                  groupMessages.map((message) => (
                    <div
                      key={
                        message.id ||
                        `${message.createdAt}-${message.message}`
                      }
                      className={`message-row ${
                        message.isAdmin ? "message-row-own" : ""
                      }`}
                    >
                      <div className="avatar-circle">
                        <img
                          src={message.senderAvatar || DEFAULT_AVATAR}
                          alt={message.senderName || "Member"}
                        />
                      </div>

                      <div className="message-bubble">
                        <div className="message-meta">
                          <span className="message-sender">
                            {message.senderName || "Community Member"}
                          </span>

                          {message.isAdmin && (
                            <span className="admin-message-badge">
                              ADMIN
                            </span>
                          )}

                          {renderMessageMenu("group", message)}
                        </div>

                        <p className="message-text">
                          {message.message}

                          {message.isEdited && (
                            <span className="cxchat-edited-label">
                              {" "}(edited)
                            </span>
                          )}
                        </p>

                        {isMessageBeingEdited("group", message.id) && (
                          <span className="editing-label">
                            Editing this message
                          </span>
                        )}

                        <div className="d-flex align-items-center gap-2 mt-1">
                          <span className="message-time">
                            {message.createdAt
                              ? new Date(
                                  message.createdAt
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div ref={bottomRef}></div>
              </div>

              {renderEditBanner()}

              <div className="message-input-bar">
                <button
                  type="button"
                  className="icon-btn"
                  title="Attachment"
                >
                  <i className="bi bi-paperclip"></i>
                </button>

                <textarea
                  ref={inputRef}
                  className="message-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isEditing
                      ? "Edit your message..."
                      : "Write a message to the community..."
                  }
                  rows={1}
                ></textarea>

                <button
                  type="button"
                  className="send-btn"
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                >
                  {sending ? (
                    <i className="bi bi-hourglass-split"></i>
                  ) : (
                    <i
                      className={`bi ${
                        isEditing ? "bi-check-lg" : "bi-send-fill"
                      }`}
                    ></i>
                  )}
                </button>
              </div>
            </>
          )}

          {/* PRIVATE CHAT */}

          {activeNav === "private" && (
            <>
              <div className="glow-orb glow-orb-1"></div>
              <div className="glow-orb glow-orb-2"></div>
              <div className="glow-orb glow-orb-3"></div>

              <div className="chat-messages">
                {!activeMember ? (
                  <div className="admin-chat-empty-state">
                    <div className="admin-chat-empty-icon">
                      <i className="bi bi-person-lines-fill"></i>
                    </div>

                    <h4>Select a member</h4>

                    <p>
                      Choose a member from the left panel to open
                      a private conversation.
                    </p>
                  </div>
                ) : loading ? (
                  <div className="admin-chat-empty-state">
                    <div className="admin-chat-spinner"></div>
                    <p>Loading conversation...</p>
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="admin-chat-empty-state">
                    <div className="admin-chat-empty-icon">
                      <i className="bi bi-chat-square-text"></i>
                    </div>

                    <h4>No messages yet</h4>

                    <p>
                      Start a private conversation with{" "}
                      <strong>{activeMember.name}</strong>.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((message) => (
                    <div
                      key={
                        message.id ||
                        `${message.createdAt}-${message.message}`
                      }
                      className={`message-row ${
                        message.isAdmin ? "message-row-own" : ""
                      }`}
                    >
                      <div className="avatar-circle">
                        <img
                          src={message.senderAvatar || DEFAULT_AVATAR}
                          alt={message.senderName || "Member"}
                        />
                      </div>

                      <div className="message-bubble">
                        <div className="message-meta">
                          <span className="message-sender">
                            {message.isAdmin
                              ? adminUser.name
                              : message.senderName ||
                                activeMember.name}
                          </span>

                          {message.isAdmin && (
                            <span className="admin-message-badge">
                              ADMIN
                            </span>
                          )}

                          {renderMessageMenu("private", message)}
                        </div>

                        <p className="message-text">
                          {message.message}

                          {message.isEdited && (
                            <span className="cxchat-edited-label">
                              {" "}(edited)
                            </span>
                          )}
                        </p>

                        {isMessageBeingEdited(
                          "private",
                          message.id
                        ) && (
                          <span className="editing-label">
                            Editing this message
                          </span>
                        )}

                        <div className="d-flex align-items-center gap-2 mt-1">
                          <span className="message-time">
                            {message.createdAt
                              ? new Date(
                                  message.createdAt
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div ref={bottomRef}></div>
              </div>

              {activeMember && (
                <>
                  {renderEditBanner()}

                  <div className="message-input-bar">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Attachment"
                    >
                      <i className="bi bi-paperclip"></i>
                    </button>

                    <textarea
                      ref={inputRef}
                      className="message-input"
                      value={draft}
                      onChange={(event) =>
                        setDraft(event.target.value)
                      }
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isEditing
                          ? "Edit your message..."
                          : `Message ${activeMember.name}...`
                      }
                      rows={1}
                    ></textarea>

                    <button
                      type="button"
                      className="send-btn"
                      onClick={handleSend}
                      disabled={sending || !draft.trim()}
                    >
                      {sending ? (
                        <i className="bi bi-hourglass-split"></i>
                      ) : (
                        <i
                          className={`bi ${
                            isEditing ? "bi-check-lg" : "bi-send-fill"
                          }`}
                        ></i>
                      )}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminChat;
