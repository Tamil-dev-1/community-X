
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useDispatch } from "react-redux";
import { io } from "socket.io-client";

import {
  setAdminAuth,
  clearAdminAuth,
} from "../features/auth/authSlice";

import {
  clearAdminChat,
} from "../features/chat/chatSlice";

const AdminChatContext = createContext(null);

const ADMIN_API_URL = "http://localhost:5000/api/admin";
const SOCKET_URL = "http://localhost:5000";

const getAdminToken = () =>
  localStorage.getItem("adminToken");

const getStoredAdminUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("adminUser") || "null"
    );
  } catch {
    return null;
  }
};

export function AdminChatProvider({ children }) {
  const dispatch = useDispatch();

  const socketRef = useRef(null);
  const verificationStartedRef = useRef(false);

  const [adminVerified, setAdminVerified] = useState(false);
  const [
    adminSocketAuthenticated,
    setAdminSocketAuthenticated,
  ] = useState(false);

  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState("");

  const verifyAdmin = useCallback(async () => {
    const token = getAdminToken();

    console.log("ADMIN PROVIDER TOKEN CHECK:", {
      path: window.location.pathname,
      tokenExists: Boolean(token),
      adminUserExists: Boolean(
        localStorage.getItem("adminUser")
      ),
    });

    if (!token) {
      setAdminVerified(false);
      setAdminLoading(false);
      setAdminError(
        "Admin authentication token not found. Please log in again."
      );

      dispatch(clearAdminAuth());
      dispatch(clearAdminChat());

      return false;
    }

    setAdminLoading(true);
    setAdminError("");

    try {
      const response = await fetch(
        `${ADMIN_API_URL}/verify`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      console.log("ADMIN PROVIDER VERIFY RESPONSE:", {
        status: response.status,
        responseBody: data,
      });

      if (
        response.status === 401 ||
        response.status === 403 ||
        data.success === false ||
        data.valid === false
      ) {
        // Explicit authentication rejection.
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        localStorage.removeItem(
          "adminActiveMemberWallet"
        );

        dispatch(clearAdminAuth());
        dispatch(clearAdminChat());

        setAdminVerified(false);
        setAdminSocketAuthenticated(false);
        setAdminError(
          data.message ||
            "Your admin session is invalid. Please log in again."
        );

        return false;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to verify administrator access."
        );
      }

      const verifiedAdmin =
        data.admin ||
        data.data?.admin ||
        data.user ||
        data.adminUser ||
        {};

      const previousAdmin = getStoredAdminUser() || {};

      const mergedAdmin = {
        ...previousAdmin,
        ...verifiedAdmin,
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

      // Keep browser storage synchronized.
      localStorage.setItem("adminToken", token);
      localStorage.setItem(
        "adminUser",
        JSON.stringify(adminUser)
      );

      // IMPORTANT:
      // setAdminAuth requires { token, adminUser }.
      dispatch(
        setAdminAuth({
          token,
          adminUser,
        })
      );

      console.log("ADMIN PROVIDER AUTH SAVED:", {
        path: window.location.pathname,
        tokenExists: Boolean(
          localStorage.getItem("adminToken")
        ),
        adminUserExists: Boolean(
          localStorage.getItem("adminUser")
        ),
        username: adminUser.username,
      });

      setAdminVerified(true);
      return true;
    } catch (error) {
      console.error(
        "ADMIN PROVIDER VERIFICATION ERROR:",
        error
      );

      // Keep the existing token on network/server errors.
      setAdminVerified(false);
      setAdminSocketAuthenticated(false);
      setAdminError(
        error.message ||
          "Unable to verify the administrator."
      );

      return false;
    } finally {
      setAdminLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (verificationStartedRef.current) return;

    verificationStartedRef.current = true;

    verifyAdmin();
  }, [verifyAdmin]);

  useEffect(() => {
    if (!adminVerified) return undefined;

    const token = getAdminToken();

    if (!token) {
      console.error(
        "ADMIN SOCKET: Token missing before socket connection."
      );
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setAdminSocketAuthenticated(false);

      socket.emit(
        "authenticate-admin-socket",
        { token }
      );
    };

    const handleAuthenticated = () => {
      setAdminSocketAuthenticated(true);

      socket.emit("get-presence-snapshot");
    };

    const handleConnectError = (error) => {
      console.error(
        "ADMIN SOCKET CONNECTION ERROR:",
        error.message
      );

      setAdminSocketAuthenticated(false);
    };

    const handleDisconnect = () => {
      setAdminSocketAuthenticated(false);
    };

    socket.on("connect", handleConnect);

    socket.on(
      "admin-socket-authenticated",
      handleAuthenticated
    );

    socket.on(
      "connect_error",
      handleConnectError
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);

      socket.off(
        "admin-socket-authenticated",
        handleAuthenticated
      );

      socket.off(
        "connect_error",
        handleConnectError
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setAdminSocketAuthenticated(false);
    };
  }, [adminVerified]);

  const logoutAdmin = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;

    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    localStorage.removeItem(
      "adminActiveMemberWallet"
    );

    setAdminVerified(false);
    setAdminSocketAuthenticated(false);
    setAdminError("");

    dispatch(clearAdminAuth());
    dispatch(clearAdminChat());
  }, [dispatch]);

  const contextValue = {
    adminVerified,
    adminSocketAuthenticated,
    adminLoading,
    adminError,
    socket: socketRef.current,
    verifyAdmin,
    logoutAdmin,
  };

  return (
    <AdminChatContext.Provider value={contextValue}>
      {children}
    </AdminChatContext.Provider>
  );
}

export function useAdminChat() {
  const context = useContext(AdminChatContext);

  if (context === null) {
    throw new Error(
      "useAdminChat must be used inside AdminChatProvider"
    );
  }

  return context;
}
