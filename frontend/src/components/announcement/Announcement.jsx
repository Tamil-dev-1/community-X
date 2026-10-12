
import React, { useState, useEffect, useRef } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./Announcement.css";

// ============================================================
// COMMUNITY X ANNOUNCEMENTS — REAL BACKEND
// ============================================================

const ADMIN_API_URL = "http://localhost:5000/api/admin";
const ANNOUNCEMENTS_URL = `${ADMIN_API_URL}/announcements`;

const getAdminToken = () =>
  localStorage.getItem("adminToken") || "";

const ANN_HEADING_MAX = 100;
const ANN_DESCRIPTION_MAX = 1000;
const ANN_INFO_MAX = 300;

const ANN_CATEGORIES = [
  {
    key: "general",
    label: "Announcement",
    icon: "bi-megaphone-fill",
  },
  {
    key: "feature",
    label: "Product Feature",
    icon: "bi-box-seam-fill",
  },
  {
    key: "critical",
    label: "Critical Update",
    icon: "bi-shield-exclamation",
  },
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ============================================================
// FRONTEND <-> BACKEND MAPPING
// ============================================================

const categoryToPriority = (category) => {
  switch (category) {
    case "feature":
      return "IMPORTANT";
    case "critical":
      return "URGENT";
    default:
      return "NORMAL";
  }
};

const priorityToCategory = (priority) => {
  switch (String(priority || "").toUpperCase()) {
    case "IMPORTANT":
      return "feature";
    case "URGENT":
      return "critical";
    default:
      return "general";
  }
};

const normalizeAnnouncement = (item = {}) => ({
  id: item._id || item.id,
  category: item.category || priorityToCategory(item.priority),
  heading: item.heading || item.title || "",
  description: item.description || item.content || item.body || "",
  info: item.info || "",
  status:
    item.isPublished === false || item.status === "draft"
      ? "draft"
      : "published",
  createdAt: item.createdAt || new Date().toISOString(),
});

const parseAnnResponse = async (response, fallbackMessage) => {
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Admin session expired or unauthorized. Please log in again."
      );
    }

    throw new Error(data?.message || fallbackMessage);
  }

  return data;
};

const getAuthHeaders = () => {
  const token = getAdminToken();

  if (!token) {
    throw new Error("Admin session not found. Please log in again.");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// ============================================================
// REAL ANNOUNCEMENT API
// ============================================================

const announcementApi = {
  async list() {
    const response = await fetch(ANNOUNCEMENTS_URL, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const data = await parseAnnResponse(
      response,
      "Failed to load announcements."
    );

    const items = Array.isArray(data)
      ? data
      : Array.isArray(data?.announcements)
        ? data.announcements
        : Array.isArray(data?.data)
          ? data.data
          : [];

    return items.map(normalizeAnnouncement);
  },

  async save(form, status) {
    const isUpdate = Boolean(form.id);

    const payload = {
      title: form.heading.trim(),
      content: form.description.trim(),
      info: form.info.trim(),
      priority: categoryToPriority(form.category),
      isPublished: status === "published",
    };

    const response = await fetch(
      isUpdate
        ? `${ANNOUNCEMENTS_URL}/${encodeURIComponent(form.id)}`
        : ANNOUNCEMENTS_URL,
      {
        method: isUpdate ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    const data = await parseAnnResponse(
      response,
      isUpdate
        ? "Failed to update announcement."
        : "Failed to create announcement."
    );

    const saved =
      data?.announcement ||
      data?.data ||
      data?.item ||
      data;

    if (!saved?._id && !saved?.id) {
      throw new Error(
        "The server saved the request but did not return an announcement ID."
      );
    }

    return normalizeAnnouncement(saved);
  },

  async remove(id) {
    const response = await fetch(
      `${ANNOUNCEMENTS_URL}/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    await parseAnnResponse(
      response,
      "Failed to delete announcement."
    );

    return true;
  },
};

// ============================================================
// ANNOUNCEMENT CARD — EXISTING UI
// ============================================================

function AnnouncementCard({
  item,
  onEdit,
  onDelete,
  onShare,
  deleting,
}) {
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

        <span className="ann-card-category">
          {category.label}
        </span>

        {isDraft ? (
          <span className="ann-draft-badge">DRAFT</span>
        ) : (
          <span
            className="ann-priority-dot"
            title="Published"
          ></span>
        )}
      </div>

      <h4 className="ann-card-title">{item.heading}</h4>

      <p className="ann-card-text">{item.description}</p>

      {item.info && (
        <p className="ann-card-text">{item.info}</p>
      )}

      <div className="ann-card-footer">
        <time className="ann-card-date">
          {formatAnnDate(item.createdAt)}
        </time>

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

// ============================================================
// ANNOUNCEMENTS PAGE
// ============================================================

function Announcement() {
  const [announcements, setAnnouncements] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [form, setForm] = useState(ANN_EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [toast, setToast] = useState(null);

  const toastTimerRef = useRef(null);
  const formRef = useRef(null);

  const isEditing = Boolean(form.id);
  const busy = submitting !== null;

  const showToast = (type, message) => {
    clearTimeout(toastTimerRef.current);

    setToast({ type, message });

    toastTimerRef.current = setTimeout(
      () => setToast(null),
      3500
    );
  };

  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  const sortByNewest = (items) =>
    [...items].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

  const loadAnnouncements = async () => {
    try {
      setListLoading(true);
      setListError("");

      const items = await announcementApi.list();

      setAnnouncements(sortByNewest(items));
    } catch (error) {
      console.error("Load announcements error:", error);

      setListError(
        error.message || "Unable to load announcements."
      );
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

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((previous) => ({
        ...previous,
        [field]: "",
      }));
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
      nextErrors.heading =
        "Heading must be at least 3 characters.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Please enter a description.";
    }

    if (form.info.length > ANN_INFO_MAX) {
      nextErrors.info = "Info is too long.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const upsertAnnouncement = (saved) => {
    setAnnouncements((previous) => {
      const exists = previous.some(
        (item) => String(item.id) === String(saved.id)
      );

      const next = exists
        ? previous.map((item) =>
            String(item.id) === String(saved.id)
              ? saved
              : item
          )
        : [saved, ...previous];

      return sortByNewest(next);
    });
  };

  const submit = async (status) => {
    const asDraft = status === "draft";

    if (!validate(asDraft)) return;

    const wasEditing = isEditing;

    try {
      setSubmitting(asDraft ? "draft" : "post");

      const saved = await announcementApi.save(
        form,
        status
      );

      upsertAnnouncement(saved);
      resetForm();

      showToast(
        "success",
        asDraft
          ? "Draft saved."
          : wasEditing
            ? "Announcement published or updated."
            : "Announcement posted."
      );
    } catch (error) {
      console.error("Save announcement error:", error);

      showToast(
        "error",
        error.message || "Unable to save announcement."
      );
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

    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
        previous.filter(
          (entry) => String(entry.id) !== String(item.id)
        )
      );

      if (String(form.id) === String(item.id)) {
        resetForm();
      }

      showToast("success", "Announcement deleted.");
    } catch (error) {
      console.error("Delete announcement error:", error);

      showToast(
        "error",
        error.message || "Unable to delete announcement."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = async (item) => {
    try {
      await navigator.clipboard.writeText(
        `${item.heading}\n\n${item.description}${
          item.info ? `\n\n${item.info}` : ""
        }`
      );

      showToast("success", "Copied to clipboard.");
    } catch {
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
        {/* CREATE / EDIT */}
        <section className="ann-main-col" ref={formRef}>
          <header className="ann-page-header">
            <h1 className="ann-page-title">
              {isEditing
                ? "Edit Announcement"
                : "Create Announcement"}
            </h1>

            <i className="bi bi-megaphone ann-page-title-icon"></i>
          </header>

          <form
            className="ann-form-card"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="ann-form-card-header">
              <div className="ann-form-card-title">
                <i className="bi bi-megaphone-fill"></i>

                <span>
                  {isEditing
                    ? "Editing Announcement"
                    : "New Hub Announcement"}
                </span>
              </div>

              <span className="ann-chip">
                <i
                  className={`bi ${
                    isEditing
                      ? "bi-pencil-square"
                      : "bi-plus-lg"
                  }`}
                ></i>

                {isEditing ? "Edit" : "Create"}
              </span>
            </div>

            {/* CATEGORY */}
            <div className="ann-field">
              <span className="ann-label">Category</span>

              <div
                className="ann-category-group"
                role="radiogroup"
              >
                {ANN_CATEGORIES.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    role="radio"
                    aria-checked={
                      form.category === category.key
                    }
                    className={`ann-category-btn ann-category-btn--${
                      category.key
                    } ${
                      form.category === category.key
                        ? "active"
                        : ""
                    }`}
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

            {/* HEADING */}
            <div className="ann-field">
              <div className="ann-label-row">
                <label
                  className="ann-label"
                  htmlFor="ann-heading"
                >
                  Heading
                </label>

                <span className="ann-counter">
                  {form.heading.length}/{ANN_HEADING_MAX}
                </span>
              </div>

              <input
                id="ann-heading"
                type="text"
                className={`ann-input ${
                  errors.heading ? "is-invalid" : ""
                }`}
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

            {/* DESCRIPTION */}
            <div className="ann-field">
              <div className="ann-label-row">
                <label
                  className="ann-label"
                  htmlFor="ann-description"
                >
                  Description
                </label>

                <span className="ann-counter">
                  {form.description.length}/
                  {ANN_DESCRIPTION_MAX}
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

            {/* INFO */}
            <div className="ann-info-box">
              <div className="ann-info-header">
                <span className="ann-info-pill">
                  <i className="bi bi-info-circle-fill"></i>
                  Info
                </span>

                <span className="ann-info-title">
                  IMPORTANT INFORMATION
                </span>

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

            {/* ACTION BUTTONS */}
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
                    {isEditing
                      ? "Update Announcement"
                      : "Post Announcement"}
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

        {/* CURRENT ANNOUNCEMENTS */}
        <aside className="ann-side-col">
          <div className="ann-list-panel">
            <div className="ann-list-header">
              <h2 className="ann-list-title">
                <i className="bi bi-clock-history"></i>
                Current Announcements
              </h2>

              {!listLoading && !listError && (
                <span className="ann-count">
                  {announcements.length}
                </span>
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

export default Announcement;
