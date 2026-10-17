
import React from "react";
import { useNavigate } from "react-router-dom";
import "./AdminWelcomePage.css";
import  { useEffect } from "react";

const AdminWelcomePage = () => {
  const navigate = useNavigate();
  useEffect(() => {
  console.log("ADMIN WELCOME MOUNTED:", {
    path: window.location.pathname,
    token: Boolean(
      localStorage.getItem("adminToken")
    ),
    adminUser: Boolean(
      localStorage.getItem("adminUser")
    ),
  });
}, []);

  const getAdminUser = () => {
    try {
      const storedUser = localStorage.getItem("adminUser");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  };

  const admin = getAdminUser();

  const adminName =
    admin?.name || admin?.username || "Administrator";

  const handleOpenDashboard = () => {
    navigate("/admin-chat");
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminActiveMemberWallet");

    navigate("/admin-login", { replace: true });
  };

  return (
    <main className="cx-admin-welcome">
      <div className="cx-admin-welcome__glow cx-admin-welcome__glow--one" />
      <div className="cx-admin-welcome__glow cx-admin-welcome__glow--two" />

      <header className="cx-admin-welcome__topbar">
        <div className="cx-admin-welcome__brand">
          <div className="cx-admin-welcome__brand-icon">
            <i className="bi bi-shield-fill-check" />
          </div>

          <div>
            <strong>COMMUNITY X</strong>
            <span>ADMINISTRATION PORTAL</span>
          </div>
        </div>

        <button
          type="button"
          className="cx-admin-welcome__logout"
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-right" />
          <span>Log out</span>
        </button>
      </header>

      <section className="cx-admin-welcome__content">
        <div className="cx-admin-welcome__status">
          <span className="cx-admin-welcome__status-dot" />
          SECURE ADMIN PORTAL
        </div>

        <div className="cx-admin-welcome__avatar">
          <i className="bi bi-person-fill-gear" />
        </div>

        <p className="cx-admin-welcome__eyebrow">
          WELCOME BACK
        </p>

        <h1>
          Hello, <span>{adminName}</span>
        </h1>

        <p className="cx-admin-welcome__description">
          Your Community X administration workspace is ready.
          Manage member conversations, monitor the community,
          and keep announcements organized from one place.
        </p>

        <button
          type="button"
          className="cx-admin-welcome__primary-btn"
          onClick={handleOpenDashboard}
        >
          Open Admin Dashboard
          <i className="bi bi-arrow-right" />
        </button>

        <div className="cx-admin-welcome__features">
          <article className="cx-admin-welcome__feature">
            <div className="cx-admin-welcome__feature-icon">
              <i className="bi bi-chat-dots-fill" />
            </div>
            <h2>Messaging</h2>
            <p>Manage group and private conversations.</p>
          </article>

          <article className="cx-admin-welcome__feature">
            <div className="cx-admin-welcome__feature-icon">
              <i className="bi bi-people-fill" />
            </div>
            <h2>Members</h2>
            <p>View community members and their status.</p>
          </article>

          <article className="cx-admin-welcome__feature">
            <div className="cx-admin-welcome__feature-icon">
              <i className="bi bi-megaphone-fill" />
            </div>
            <h2>Announcements</h2>
            <p>Keep community updates accessible.</p>
          </article>
        </div>

        <p className="cx-admin-welcome__footer">
          <i className="bi bi-shield-lock-fill" />
          Authorized administrator access only
        </p>
      </section>
    </main>
  );
};

export default AdminWelcomePage;
