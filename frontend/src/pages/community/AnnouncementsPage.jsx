import React, { useState } from "react";
import { useCommunityChat } from "../../context/CommunityChatContext";
import "./AnnouncementPage.css";

const MESSAGE_PREVIEW_LIMIT = 240;

const getAnnouncementCategory = (priority) => {
  const normalizedPriority = String(priority || "").toUpperCase();

  if (normalizedPriority === "URGENT") {
    return { label: "CRITICAL UPDATE", icon: "bi-exclamation-triangle-fill" };
  }

  if (normalizedPriority === "IMPORTANT") {
    return { label: "PRODUCT FEATURE", icon: "bi-stars" };
  }

  return { label: "OFFICIAL UPDATE", icon: "bi-megaphone-fill" };
};

const formatAnnouncementDate = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AnnouncementCard = ({ announcement, index }) => {
  const [expanded, setExpanded] = useState(false);

  const category = getAnnouncementCategory(announcement.priority);
  const priority = String(announcement.priority || "").toLowerCase();

  const title =
    announcement.title || announcement.heading || "Community Update";

  const message =
    announcement.message ||
    announcement.content ||
    announcement.description ||
    "";

  const date =
    announcement.publishedAt ||
    announcement.createdAt ||
    announcement.updatedAt;

  const isLong = message.length > MESSAGE_PREVIEW_LIMIT;
  const visibleMessage =
    isLong && !expanded
      ? `${message.slice(0, MESSAGE_PREVIEW_LIMIT).trimEnd()}...`
      : message;

  return (
    <article
      className={`cxchat-announcement-card cxchat-tone-${priority || "normal"}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="cxchat-announcement-card-top">
        <span className="cxchat-announcement-category">
          <i className={`bi ${category.icon}`} aria-hidden="true" />
          {category.label}
        </span>

        {announcement.priority && (
          <span
            className={`cxchat-announcement-priority cxchat-announcement-priority-${priority}`}
          >
            <span className="cxchat-priority-dot" aria-hidden="true" />
            {announcement.priority}
          </span>
        )}
      </div>

      <h4 className="cxchat-announcement-title">{title}</h4>

      {message && (
        <p className="cxchat-announcement-message">{visibleMessage}</p>
      )}

      {isLong && (
        <button
          type="button"
          className="cxchat-announcement-toggle"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
          <i
            className={`bi ${expanded ? "bi-chevron-up" : "bi-chevron-down"}`}
            aria-hidden="true"
          />
        </button>
      )}

      <div className="cxchat-announcement-card-footer">
        <span className="cxchat-announcement-date">
          <i className="bi bi-calendar3" aria-hidden="true" />
          {formatAnnouncementDate(date)}
        </span>

        <span className="cxchat-announcement-official">
          <i className="bi bi-patch-check-fill" aria-hidden="true" />
          Official
        </span>
      </div>
    </article>
  );
};

const Announcements = () => {
  const {
    announcements,
    announcementsLoading,
    announcementsError,
    retryAnnouncements,
  } = useCommunityChat();

  return (
    <section className="cxchat-announcements">
      {/* Banner */}
      <div className="cxchat-announcements-banner">
        <span className="cxchat-banner-glow" aria-hidden="true" />

        <div className="cxchat-announcements-banner-icon">
          <i className="bi bi-megaphone-fill" aria-hidden="true" />
        </div>

        <div className="cxchat-announcements-banner-content">
          <span className="cxchat-announcements-eyebrow">COMMUNITY X</span>
          <h2>Announcements</h2>
          <p>
            Important updates and official announcements from your community
            admin.
          </p>
        </div>
      </div>

      {/* Heading */}
      <div className="cxchat-announcements-heading">
        <div>
          <h3>Latest Updates</h3>
          <p>Stay informed with the latest community news.</p>
        </div>

        <span className="cxchat-announcements-count">
          <i className="bi bi-bell-fill" aria-hidden="true" />
          {announcements.length}{" "}
          {announcements.length === 1 ? "Update" : "Updates"}
        </span>
      </div>

      {/* States */}
      {announcementsLoading ? (
        <div className="cxchat-announcements-list" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div className="cxchat-announcement-skeleton" key={item}>
              <span className="cxchat-skel cxchat-skel-chip" />
              <span className="cxchat-skel cxchat-skel-title" />
              <span className="cxchat-skel cxchat-skel-line" />
              <span className="cxchat-skel cxchat-skel-line cxchat-skel-short" />
            </div>
          ))}
          <span className="visually-hidden">Loading announcements...</span>
        </div>
      ) : announcementsError ? (
        <div className="cxchat-announcements-state cxchat-announcements-error">
          <div className="cxchat-state-icon">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
          </div>

          <h4>Unable to load announcements</h4>

          <p>
            Something went wrong while loading the latest updates. Please try
            again.
          </p>

          <button
            type="button"
            className="cxchat-announcements-retry"
            onClick={retryAnnouncements}
          >
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            Try Again
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="cxchat-announcements-state">
          <div className="cxchat-state-icon">
            <i className="bi bi-megaphone" aria-hidden="true" />
          </div>

          <h4>No announcements yet</h4>

          <p>
            Official community updates will appear here when the admin
            publishes them.
          </p>
        </div>
      ) : (
        <div className="cxchat-announcements-list">
          {announcements.map((announcement, index) => {
            const id =
              announcement._id ||
              announcement.id ||
              announcement.announcementId;

            return (
              <AnnouncementCard
                key={id || `${announcement.title}-${index}`}
                announcement={announcement}
                index={index}
              />
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="cxchat-announcements-footer">
        <i className="bi bi-shield-check" aria-hidden="true" />
        <span>You're viewing official Community X announcements.</span>
      </div>
    </section>
  );
};

export default Announcements;
