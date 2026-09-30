import React from "react";
import {
  Users,
  Megaphone,
  Crown,
  X,
  Flame,
} from "lucide-react";

const ChatSidebar = ({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentUser,
}) => {
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

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
          onClick={() => setMobileMenuOpen(false)}
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
            className={`cxchat-nav-item ${
              activeTab === "group"
                ? "cxchat-nav-item-active"
                : "cxchat-nav-item-inactive"
            }`}
            onClick={() => handleTabChange("group")}
          >
            <span className="cxchat-nav-item-left">
              <span className="cxchat-nav-icon">
                <Users size={18} />
              </span>

              <span className="cxchat-nav-text">
                Group Chat
              </span>
            </span>

            {activeTab === "group" && (
              <span className="cxchat-nav-active-dot" />
            )}
          </button>

          {/* Admin Messages */}
          <button
            type="button"
            className={`cxchat-nav-item ${
              activeTab === "admin"
                ? "cxchat-nav-item-active"
                : "cxchat-nav-item-inactive"
            }`}
            onClick={() => handleTabChange("admin")}
          >
            <span className="cxchat-nav-item-left">
              <span className="cxchat-nav-icon">
                <Megaphone size={18} />
              </span>

              <span className="cxchat-nav-text">
                Admin Messages
              </span>
            </span>

            {activeTab === "admin" && (
              <span className="cxchat-nav-active-dot" />
            )}
          </button>
        </nav>
      </div>

      {/* User Card */}
      <div className="cxchat-sidebar-user-area">
        <div className="cxchat-sidebar-user-card">
          <div className="cxchat-sidebar-user-avatar-wrapper">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="cxchat-sidebar-user-avatar"
              onError={(e) => {
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";
              }}
            />

            <span className="cxchat-sidebar-online-dot" />
          </div>

          <div className="cxchat-sidebar-user-info">
            <div className="cxchat-sidebar-user-name">
              {currentUser.name}
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