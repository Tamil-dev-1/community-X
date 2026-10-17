
import React from "react";
import "./ChatSidebar.css";

import {
  Home,
  Users,
  MessageCircle,
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

  const getUnreadCount = (count) =>
    Math.max(0, Number(count) || 0);

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

  const renderNavItem = ({
    tab,
    label,
    Icon,
    unreadCount,
    unreadLabel,
  }) => (
    <button
      key={tab}
      type="button"
      className={getNavItemClass(tab)}
      onClick={() => handleTabChange(tab)}
      aria-current={activeTab === tab ? "page" : undefined}
    >
      <span className="cxchat-nav-item-left">
        <span className="cxchat-nav-icon">
          <Icon size={18} />
        </span>

        <span className="cxchat-nav-text">{label}</span>
      </span>

      <span className="cxchat-nav-item-right">
        {unreadCount !== undefined &&
          renderUnreadBadge(unreadCount, unreadLabel)}

        {renderActiveDot(tab)}
      </span>
    </button>
  );

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

      {/* Navigation */}
      <div className="cxchat-sidebar-content">
        <div className="cxchat-sidebar-section-label">
          WORKSPACE
        </div>

        <nav className="cxchat-sidebar-nav">
          {renderNavItem({
            tab: "welcome",
            label: "Welcome",
            Icon: Home,
          })}

          {renderNavItem({
            tab: "group",
            label: "Group Chat",
            Icon: Users,
            unreadCount: groupUnread,
            unreadLabel: "group messages",
          })}

          {renderNavItem({
            tab: "admin",
            label: "Admin Messages",
            Icon: MessageCircle,
            unreadCount: adminUnread,
            unreadLabel: "admin messages",
          })}

          {renderNavItem({
            tab: "announcements",
            label: "Announcements",
            Icon: Megaphone,
            unreadCount: announcementUnread,
            unreadLabel: "announcements",
          })}
        </nav>
      </div>

      {/* Member Profile Card */}
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
