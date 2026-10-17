
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import {
  Container,
  Row,
  Col,
  Form,
  Button,
} from "react-bootstrap";

import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaUserCircle,
} from "react-icons/fa";

import { setAdminAuth } from "../../features/auth/authSlice";

import "bootstrap/dist/css/bootstrap.min.css";
import "./AdminLogin.css";

const API_URL = "http://localhost:5000/api/admin";

const AdminLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !formData.username.trim() ||
      !formData.password.trim()
    ) {
      setError("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Invalid username or password."
        );
      }

      // Read the token from supported response shapes.
      const token =
        data.token ||
        data.accessToken ||
        data.data?.token ||
        data.data?.accessToken;

      if (
        typeof token !== "string" ||
        !token.trim()
      ) {
        console.error(
          "Admin login response did not contain a token:",
          data
        );

        throw new Error(
          "Login response did not contain an admin token. Check the backend login response."
        );
      }

      const responseAdmin =
        data.admin || data.data?.admin || null;

      const adminUser = {
        ...(responseAdmin || {}),
        username:
          responseAdmin?.username ||
          formData.username.trim(),
        role: responseAdmin?.role || "admin",
        id:
          responseAdmin?.id ||
          responseAdmin?._id ||
          responseAdmin?.adminId ||
          "ADM-001",
      };

      // Step 1: Save authentication in browser storage.
      localStorage.setItem("adminToken", token);
      localStorage.setItem(
        "adminUser",
        JSON.stringify(adminUser)
      );

      // Step 2: Update Redux authentication state.
      dispatch(
        setAdminAuth({
          token,
          adminUser,
        })
      );

      // Step 3: Verify storage immediately before navigation.
      const savedToken =
        localStorage.getItem("adminToken");

      console.log("Admin login diagnostics:", {
        origin: window.location.origin,
        currentPath: window.location.pathname,
        tokenSaved: Boolean(savedToken),
        tokenLength: savedToken?.length || 0,
        reduxUpdated: Boolean(
          localStorage.getItem("adminToken")
        ),
      });

      if (!savedToken) {
        throw new Error(
          "Admin token could not be saved. Please try again."
        );
      }

      // Step 4: Open the admin welcome page.
      navigate("/admin-welcome", {
        replace: true,
      });
    } catch (err) {
      console.error("Admin login error:", err);

      setError(
        err.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      {/* Background glows */}
      <span className="admin-login__glow admin-login__glow--one" />
      <span className="admin-login__glow admin-login__glow--two" />

      <Container className="admin-login__container">
        <Row className="justify-content-center align-items-center w-100 m-0">
          <Col xs={12} sm={10} md={8} lg={6} xl={4}>
            <div className="glass-card">
              {/* Avatar */}
              <div className="glass-card__avatar">
                <FaUserCircle />
              </div>

              {/* Heading */}
              <h2 className="glass-card__title">
                Admin Portal
              </h2>

              <p className="glass-card__subtitle">
                Welcome back! Please login to continue.
              </p>

              <Form
                onSubmit={handleSubmit}
                autoComplete="off"
              >
                {/* Error message */}
                {error && (
                  <div
                    className="alert alert-danger py-2 mb-3"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {/* Username */}
                <div className="glass-field">
                  <label
                    htmlFor="username"
                    className="glass-field__label"
                  >
                    Username
                  </label>

                  <FaUser className="glass-field__icon" />

                  <Form.Control
                    id="username"
                    type="text"
                    name="username"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleChange}
                    className="glass-field__input"
                    autoComplete="username"
                    disabled={loading}
                    required
                  />
                </div>

                {/* Password */}
                <div className="glass-field">
                  <label
                    htmlFor="password"
                    className="glass-field__label"
                  >
                    Password
                  </label>

                  <FaLock className="glass-field__icon" />

                  <Form.Control
                    id="password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="glass-field__input"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="glass-field__toggle"
                    onClick={() =>
                      setShowPassword((prev) => !prev)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
                      <FaEye />
                    ) : (
                      <FaEyeSlash />
                    )}
                  </button>
                </div>

                {/* Login button */}
                <Button
                  type="submit"
                  className="glass-btn w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Log In
                      <FaArrowRight className="ms-2" />
                    </>
                  )}
                </Button>

                {/* Forgot password */}
                <div className="text-center mt-3">
                  <a
                    href="#forgot"
                    className="glass-link"
                    onClick={(e) =>
                      e.preventDefault()
                    }
                  >
                    Forgot password?
                  </a>
                </div>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AdminLogin;
