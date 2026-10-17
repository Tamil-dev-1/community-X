
import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import { AdminChatProvider } from "../context/AdminChatProvider";

import { clearAdminAuth } from "../features/auth/authSlice";
import { clearAdminChat } from "../features/chat/chatSlice";

import "./AdminLayout.css";

const NAV_ITEMS = [
  {
    path: "/admin-welcome",
    label: "Dashboard",
    icon: "bi-grid-1x2-fill",
    end: true,
  },
  {
    path: "/admin-chat",
    label: "Group Chat",
    icon: "bi-chat-dots-fill",
  },
  {
    path: "/admin-private-chat",
    label: "Private Messages",
    icon: "bi-envelope-fill",
  },
  {
    path: "/admin-members",
    label: "Member Management",
    icon: "bi-people-fill",
  },
  {
    path: "/admin-announcements",
    label: "Announcements",
    icon: "bi-megaphone-fill",
  },
];

const getAdminUser = () => {
  try {
    return JSON.parse(localStorage.getItem("adminUser") || "null");
  } catch {
    return null;
  }
};

export default function AdminLayout() {
  return (
    <AdminChatProvider>
      <AdminLayoutContent />
    </AdminChatProvider>
  );
}

function AdminLayoutContent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const adminUser = getAdminUser();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminActiveMemberWallet");

    dispatch(clearAdminAuth());
    dispatch(clearAdminChat());

    setSidebarOpen(false);
    navigate("/admin-login", { replace: true });
  };

  return (
    <div className="cx-admin-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="cx-admin-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`cx-admin-sidebar ${
          sidebarOpen ? "cx-admin-sidebar-open" : ""
        }`}
      >
        <div className="cx-admin-brand">
          <div className="cx-admin-brand-icon">
            <i className="bi bi-shield-fill-check" />
          </div>

          <div>
            <h2>COMMUNITY X</h2>
            <span>ADMIN PANEL</span>
          </div>

          <button
            type="button"
            className="cx-admin-close-sidebar"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="cx-admin-profile">
          <div className="cx-admin-avatar">
            <i className="bi bi-person-fill-lock" />
          </div>

          <div className="cx-admin-profile-details">
            <strong>{adminUser?.name || "Administrator"}</strong>
            <span>
              <span className="cx-admin-status-dot" />
              Administrator
            </span>
          </div>
        </div>

        <nav className="cx-admin-navigation">
          <span className="cx-admin-nav-heading">WORKSPACE</span>

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `cx-admin-nav-link ${
                  isActive ? "cx-admin-nav-link-active" : ""
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="cx-admin-sidebar-footer">
          <div className="cx-admin-secure-label">
            <i className="bi bi-shield-check" />
            <span>Secure Admin Session</span>
          </div>

          <button
            type="button"
            className="cx-admin-logout"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="cx-admin-main">
        <header className="cx-admin-topbar">
          <button
            type="button"
            className="cx-admin-menu-button"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
          >
            <i className="bi bi-list" />
          </button>

          <div className="cx-admin-topbar-title">
            <span>COMMUNITY X</span>
            <strong>Executive Hub</strong>
          </div>

          <div className="cx-admin-topbar-account">
            <span className="cx-admin-status-dot" />
            <span>Admin Access</span>
          </div>
        </header>

        <main className="cx-admin-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
