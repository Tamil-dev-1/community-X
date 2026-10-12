import React from "react";

import {
  Users,
  Shield,
  Menu,
  Crown,
  Bell,
} from "lucide-react";

const ChatHeader = ({
  activeTab,
  setMobileMenuOpen,
  setActiveTab,
  isAdminOnline = false,
  adminStatusText = "Offline",
}) => {
  const isGroup = activeTab === "group";
  const isAnnouncements = activeTab === "announcements";

  const headerTitle = isGroup
    ? "Group Chat - Community X"
    : isAnnouncements
      ? "Community Announcements"
      : "Admin Announcements";

  const headerSubtitle = isGroup
    ? "360 Members • Admin"
    : isAnnouncements
      ? "Official Community X Updates"
      : "Official Community X Updates";

  const handleAnnouncementClick = () => {
    if (typeof setActiveTab === "function") {
      setActiveTab("announcements");
    }

    if (typeof setMobileMenuOpen === "function") {
      setMobileMenuOpen(false);
    }
  };

  const headerIconClass = isGroup
    ? "cxchat-chat-header-icon-group"
    : isAnnouncements
      ? "cxchat-chat-header-icon-announcements"
      : "cxchat-chat-header-icon-admin";

  return (
    <header className="cxchat-chat-header">
      {/* Mobile Menu */}
      <button
        type="button"
        className="cxchat-mobile-menu-button"
        onClick={() => setMobileMenuOpen?.(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Header Icon */}
      <div
        className={`cxchat-chat-header-icon ${headerIconClass}`}
      >
        {isGroup ? (
          <Users size={22} />
        ) : isAnnouncements ? (
          <Bell size={22} />
        ) : (
          <Shield size={22} />
        )}
      </div>

      {/* Header Information */}
      <div className="cxchat-chat-header-info">
        <div className="cxchat-chat-header-title">
          {headerTitle}
        </div>

        <div className="cxchat-chat-header-subtitle">
          {headerSubtitle}
        </div>

        {/* Admin Online / Offline Status */}
        {activeTab === "admin" && (
          <div
            className="cxchat-admin-header-status"
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "5px",
              fontSize: "12px",
              color: isAdminOnline ? "#22c55e" : "#a1a1aa",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "7px",
                height: "7px",
                flexShrink: 0,
                borderRadius: "50%",
                backgroundColor: isAdminOnline
                  ? "#22c55e"
                  : "#71717a",
                display: "inline-block",
              }}
            />

            <span>
              {isAdminOnline ? "Admin is online" : adminStatusText}
            </span>
          </div>
        )}
      </div>

      {/* Announcement Shortcut */}
      {!isAnnouncements && (
        <button
          type="button"
          className="cxchat-header-announcement-button"
          onClick={handleAnnouncementClick}
          aria-label="Open announcements"
          title="Announcements"
        >
          <Bell size={18} />
          <span>Announcements</span>
        </button>
      )}

      {/* Executive Badge */}
      <div className="cxchat-chat-header-badge">
        <Crown size={14} />
        <span>Executive Access</span>
      </div>
    </header>
  );
};

export default ChatHeader;