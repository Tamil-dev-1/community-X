
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Navigate, Outlet } from "react-router-dom";
import { useDispatch } from "react-redux";

import {
  setAdminAuth,
  clearAdminAuth,
} from "../features/auth/authSlice";

const API_URL = "http://localhost:5000";

const getStoredAdminUser = () => {
  try {
    const stored = localStorage.getItem("adminUser");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const clearStoredAdminAuth = () => {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  localStorage.removeItem("adminActiveMemberWallet");
};

const ProtectedAdminRoute = () => {
  const dispatch = useDispatch();

  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [verificationError, setVerificationError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const verifyAdmin = useCallback(async () => {
    const adminToken = localStorage.getItem("adminToken");

    if (!adminToken) {
      console.warn(
        "ADMIN AUTH CHECK: No token found in localStorage."
      );

      setIsVerified(false);
      setIsChecking(false);
      setVerificationError("");

      dispatch(clearAdminAuth());
      return;
    }

    setIsChecking(true);
    setVerificationError("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/verify`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        console.error(
          "ADMIN AUTH REJECTED:",
          response.status
        );

        clearStoredAdminAuth();
        dispatch(clearAdminAuth());

        setIsVerified(false);
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Unable to verify admin access. Please try again."
        );
      }

      const data = await response.json();

      console.log("ADMIN VERIFY DEBUG:", {
        path: window.location.pathname,
        status: response.status,
        responseBody: data,
        tokenExists: Boolean(
          localStorage.getItem("adminToken")
        ),
      });

      // Clear authentication only for explicit rejection.
      if (
        data.success === false ||
        data.valid === false
      ) {
        console.error(
          "ADMIN AUTH REJECTED BY RESPONSE:",
          data
        );

        clearStoredAdminAuth();
        dispatch(clearAdminAuth());

        setIsVerified(false);
        return;
      }

      const responseAdmin =
        data.admin ||
        data.data?.admin ||
        null;

      const storedAdmin = getStoredAdminUser() || {};

      const mergedAdmin = {
        ...storedAdmin,
        ...(responseAdmin || {}),
      };

      const adminUser = {
        ...mergedAdmin,
        id:
          mergedAdmin.id ||
          mergedAdmin.adminId ||
          mergedAdmin._id ||
          "ADM-001",
        adminId:
          mergedAdmin.adminId ||
          mergedAdmin.id ||
          mergedAdmin._id ||
          "ADM-001",
        username: mergedAdmin.username || "admin",
        role: mergedAdmin.role || "ADMIN",
      };

      // Save the verified admin information.
      localStorage.setItem(
        "adminUser",
        JSON.stringify(adminUser)
      );

      // Synchronize the Redux authentication state.
      dispatch(
        setAdminAuth({
          token: adminToken,
          adminUser,
        })
      );

      console.log(
        "ADMIN AUTH AFTER VERIFICATION:",
        {
          path: window.location.pathname,
          token: Boolean(
            localStorage.getItem("adminToken")
          ),
          adminUser: Boolean(
            localStorage.getItem("adminUser")
          ),
          reduxTokenProvided: Boolean(adminToken),
          verifiedAdmin: adminUser,
        }
      );

      setIsVerified(true);
    } catch (error) {
      console.error(
        "Admin verification error:",
        error
      );

      // Do not delete the token for a network/server error.
      setIsVerified(false);

      setVerificationError(
        "Unable to connect to the server. Check that the backend is running."
      );
    } finally {
      setIsChecking(false);
    }
  }, [dispatch]);

  useEffect(() => {
    verifyAdmin();
  }, [verifyAdmin, retryCount]);

  if (isChecking) {
    return (
      <div
        className="admin-route-loading"
        role="status"
        aria-live="polite"
      >
        Verifying admin access...
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="admin-route-loading">
        <p>{verificationError}</p>

        <button
          type="button"
          onClick={() =>
            setRetryCount((count) => count + 1)
          }
        >
          Try Again
        </button>

        <button
          type="button"
          onClick={() => {
            clearStoredAdminAuth();
            dispatch(clearAdminAuth());

            window.location.replace("/admin-login");
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <Navigate
        to="/admin-login"
        replace
      />
    );
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;
