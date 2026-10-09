
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedAdminRoute = () => {
  const adminToken = localStorage.getItem("adminToken");

  // No admin token = not authenticated
  if (!adminToken) {
    return <Navigate to="/admin-login" replace />;
  }

  // Token exists = allow admin route
  return <Outlet />;
};

export default ProtectedAdminRoute;

