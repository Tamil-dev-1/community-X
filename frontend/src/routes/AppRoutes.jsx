
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

// Public pages
import LandingPage from "../pages/LandingPage";
import OnboardingPage from "../pages/OnboardingPage";
import ProfilePage from "../pages/ProfilePage";

// Community pages
import CommunityLayout from "../layouts/CommunityLayout";
import WelcomePage from "../pages/community/WelcomePage";
import GroupChat from "../pages/community/GroupChatPage";
import PrivateChat from "../pages/community/PrivateChatPage";
import Announcements from "../pages/community/AnnouncementsPage";

// Admin layout and authentication
import AdminLayout from "../layouts/AdminLayout";
import AdminLogin from "../pages/adminLogin/AdminLogin";
import ProtectedAdminRoute from "../components/ProtectedAdminRoute";
import AdminWelcomePage from "../pages/adminchatpage/AdminWelcomePage";
import AdminGroupChatPage from "../pages/adminchatpage/AdminGroupChatPage";
import AdminPrivateChatPage from "../pages/adminchatpage/AdminPrivateChatPage";
import AdminMembersPage from "../pages/adminchatpage/AdminMembersPage";
import AdminAnnouncementsPage from "../pages/adminchatpage/AdminAnnouncementsPage";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/connect-wallet" element={<OnboardingPage />} />
      <Route path="/create-profile" element={<ProfilePage />} />

      {/* Community X member pages */}
      <Route element={<CommunityLayout />}>
        <Route path="/welcome" element={<WelcomePage />} />

        <Route path="/community" element={<GroupChat />} />

        <Route path="/private-chat" element={<PrivateChat />} />

        <Route
          path="/announcements"
          element={<Announcements />}
        />

        {/* Preserve the previous group chat URL */}
        <Route
          path="/community-chat"
          element={<Navigate to="/community" replace />}
        />
      </Route>

      {/* Admin login */}
      <Route path="/admin-login" element={<AdminLogin />} />

      {/* Protected admin pages */}
      <Route element={<ProtectedAdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route
            path="/admin-welcome"
            element={<AdminWelcomePage />}
          />

          <Route
            path="/admin-chat"
            element={<AdminGroupChatPage />}
          />

          <Route
            path="/admin-private-chat"
            element={<AdminPrivateChatPage />}
          />

          <Route
            path="/admin-members"
            element={<AdminMembersPage />}
          />

          <Route
            path="/admin-announcements"
            element={<AdminAnnouncementsPage />}
          />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRoutes;
