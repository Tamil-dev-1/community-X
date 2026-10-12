import React from "react";
import "./ChatSidebar.css";

import {
  Users,
  Megaphone,
  Crown,
  X,
  Flame,
  Bell,
} from "lucide-react";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

const ChatSidebar = ({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentUser,
  groupUnreadCount = 0,
  adminUnreadCount = 0,
  announcementUnreadCount = 0,
  onClearUnread,
}) => {
  // Switch channels without changing the existing sidebar layout.
  const handleTabChange = (tab) => {
    if (typeof setActiveTab === "function") {
      setActiveTab(tab);
    }

    if (typeof onClearUnread === "function") {
      onClearUnread(tab);
    }

    if (typeof setMobileMenuOpen === "function") {
      setMobileMenuOpen(false);
    }
  };

  // Prevent invalid unread counts.
  const getUnreadCount = (count) => {
    const value = Number(count) || 0;
    return Math.max(0, value);
  };

  const groupUnread = getUnreadCount(groupUnreadCount);
  const adminUnread = getUnreadCount(adminUnreadCount);
  const announcementUnread = getUnreadCount(
    announcementUnreadCount
  );

  const renderUnreadBadge = (count, label) => {
    if (count <= 0) return null;

    return (
      <span
        className="cxchat-unread-badge"
        aria-label={`${count} unread ${label}`}
      >
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  const renderActiveDot = (tab) => {
    if (activeTab !== tab) return null;

    return <span className="cxchat-nav-active-dot" />;
  };

  const getNavItemClass = (tab) =>
    `cxchat-nav-item ${
      activeTab === tab
        ? "cxchat-nav-item-active"
        : "cxchat-nav-item-inactive"
    }`;

  return (
    <aside
      className={`cxchat-chat-sidebar ${
        mobileMenuOpen
          ? "cxchat-chat-sidebar-visible"
          : "cxchat-chat-sidebar-hidden"
      }`}
    >
      {/* Sidebar Header */}
      <div className="cxchat-sidebar-header">
        <div className="cxchat-sidebar-brand">
          <div className="cxchat-sidebar-brand-icon">
            <Crown size={20} />
          </div>

          <div className="cxchat-sidebar-brand-text">
            <span className="cxchat-sidebar-brand-title">
              Community X
            </span>

            <span className="cxchat-sidebar-brand-subtitle">
              EXECUTIVE HUB
            </span>
          </div>
        </div>

        <button
          type="button"
          className="cxchat-sidebar-close"
          onClick={() => setMobileMenuOpen?.(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Channels */}
      <div className="cxchat-sidebar-content">
        <div className="cxchat-sidebar-section-label">
          CHANNELS
        </div>

        <nav className="cxchat-sidebar-nav">
          {/* Group Chat */}
          <button
            type="button"
            className={getNavItemClass("group")}
            onClick={() => handleTabChange("group")}
            aria-current={
              activeTab === "group" ? "page" : undefined
            }
          >
            <span className="cxchat-nav-item-left">
              <span className="cxchat-nav-icon">
                <Users size={18} />
              </span>

              <span className="cxchat-nav-text">
                Group Chat
              </span>
            </span>

            <span className="cxchat-nav-item-right">
              {renderUnreadBadge(groupUnread, "group messages")}
              {renderActiveDot("group")}
            </span>
          </button>

          {/* Admin Messages */}
          <button
            type="button"
            className={getNavItemClass("admin")}
            onClick={() => handleTabChange("admin")}
            aria-current={
              activeTab === "admin" ? "page" : undefined
            }
          >
            <span className="cxchat-nav-item-left">
              <span className="cxchat-nav-icon">
                <Megaphone size={18} />
              </span>

              <span className="cxchat-nav-text">
                Admin Messages
              </span>
            </span>

            <span className="cxchat-nav-item-right">
              {renderUnreadBadge(adminUnread, "admin messages")}
              {renderActiveDot("admin")}
            </span>
          </button>

          {/* Announcements */}
          <button
            type="button"
            className={getNavItemClass("announcements")}
            onClick={() => handleTabChange("announcements")}
            aria-current={
              activeTab === "announcements"
                ? "page"
                : undefined
            }
          >
            <span className="cxchat-nav-item-left">
              <span className="cxchat-nav-icon">
                <Bell size={18} />
              </span>

              <span className="cxchat-nav-text">
                Announcements
              </span>
            </span>

            <span className="cxchat-nav-item-right">
              {renderUnreadBadge(
                announcementUnread,
                "announcements"
              )}
              {renderActiveDot("announcements")}
            </span>
          </button>
        </nav>
      </div>

      {/* User Card */}
      <div className="cxchat-sidebar-user-area">
        <div className="cxchat-sidebar-user-card">
          <div className="cxchat-sidebar-user-avatar-wrapper">
            <img
              src={currentUser?.avatar || DEFAULT_AVATAR}
              alt={currentUser?.name || "Community Member"}
              className="cxchat-sidebar-user-avatar"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = DEFAULT_AVATAR;
              }}
            />

            <span className="cxchat-sidebar-online-dot" />
          </div>

          <div className="cxchat-sidebar-user-info">
            <div className="cxchat-sidebar-user-name">
              {currentUser?.name || "Community Member"}
            </div>

            <div className="cxchat-sidebar-user-role">
              <Flame size={12} />
              Community Member
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ChatSidebar;