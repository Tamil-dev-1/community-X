import React from 'react'
import LandingPage from '../pages/LandingPage'
import OnboardingPage from '../pages/OnboardingPage'
import { Route, Routes } from 'react-router-dom'
import ProfilePage from '../pages/ProfilePage'
import CommunityChat from '../pages/communityChat/CommunityChat'
import AdminChat from '../pages/adminpage/AdminChat'
import MemberPrivateChat from '../pages/MemberPrivateChat/MemberPrivateChat'
import AdminLogin from '../pages/adminLogin/AdminLogin'
import ProtectedAdminRoute from '../components/ProtectedAdminRoute'

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/connect-wallet" element={<OnboardingPage />} />
        <Route path="/create-profile" element={<ProfilePage />} />
        <Route path="/community-chat" element={<CommunityChat />} />

         {/* Protected Admin Routes */}
        <Route element={<ProtectedAdminRoute />}>
          <Route
            path="/admin-chat"
            element={<AdminChat />}
          />
        </Route>
        <Route path="/private-chat" element={<MemberPrivateChat />} />
        <Route path="/admin-login" element={<AdminLogin />} />
      </Routes>
    </>
  )
}

export default AppRoutes
