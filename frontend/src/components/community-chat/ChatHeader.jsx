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