
import React from "react";

import {
  Users,
  Shield,
  Menu,
  Crown,
} from "lucide-react";

const ChatHeader = ({
  activeTab,
  setMobileMenuOpen,
  isAdminOnline = false,
  adminStatusText = "Offline",
}) => {
  const isGroup = activeTab === "group";

  return (
    <header className="cxchat-chat-header">
      {/* Mobile Menu */}
      <button
        type="button"
        className="cxchat-mobile-menu-button"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Header Icon */}
      <div
        className={`cxchat-chat-header-icon ${
          isGroup
            ? "cxchat-chat-header-icon-group"
            : "cxchat-chat-header-icon-admin"
        }`}
      >
        {isGroup ? (
          <Users size={22} />
        ) : (
          <Shield size={22} />
        )}
      </div>

      {/* Header Information */}
      <div className="cxchat-chat-header-info">
        <div className="cxchat-chat-header-title">
          {isGroup
            ? "Group Chat - Community X"
            : "Admin Announcements"}
        </div>

        <div className="cxchat-chat-header-subtitle">
          {isGroup
            ? "360 Members • Admin"
            : "Official Community X Updates"}
        </div>

        {/* Admin Online / Offline Status */}
        {!isGroup && (
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

      {/* Executive Badge */}
      <div className="cxchat-chat-header-badge">
        <Crown size={14} />
        <span>Executive Access</span>
      </div>
    </header>
  );
};

export default ChatHeader;

