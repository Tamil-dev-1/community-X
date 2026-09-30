import React from 'react'
import LandingPage from '../pages/LandingPage'
import OnboardingPage from '../pages/OnboardingPage'
import { Route, Routes } from 'react-router-dom'
import ProfilePage from '../pages/ProfilePage'
import CommunityChat from '../pages/communityChat/CommunityChat'
import AdminChat from '../pages/adminpage/AdminChat'
import MemberPrivateChat from '../pages/MemberPrivateChat/MemberPrivateChat'

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route  path="/" element={<LandingPage />} />
        <Route  path="/connect-wallet" element={<OnboardingPage />} />
        <Route  path="/create-profile" element={<ProfilePage />} />
        <Route  path="/community-chat" element={<CommunityChat />} />
        <Route  path="/admin-chat" element={<AdminChat />} />
        <Route  path="/private-chat" element={<MemberPrivateChat />} />
      </Routes>
    </>
  )
}

export default AppRoutes
