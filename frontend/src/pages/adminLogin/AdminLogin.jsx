
import React, { useState } from "react";

import { useNavigate } from "react-router-dom";

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

import "bootstrap/dist/css/bootstrap.min.css";
import "./AdminLogin.css";

const AdminLogin = () => {
  const navigate = useNavigate();

  // ==========================================
  // FORM STATE
  // ==========================================
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  // ==========================================
  // UI STATE
  // ==========================================
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // HANDLE INPUT CHANGE
  // ==========================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing again
    if (error) {
      setError("");
    }
  };

  // ==========================================
  // ADMIN LOGIN
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous error
    setError("");

    // Basic validation
    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      // ==========================================
      // SEND LOGIN REQUEST TO BACKEND
      // ==========================================
      const response = await fetch(
        "http://localhost:5000/api/admin/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username: formData.username.trim(),
            password: formData.password,
          }),
        }
      );

      // Convert response to JSON
      const data = await response.json();

      console.log("Admin login response:", data);

      // ==========================================
      // HANDLE LOGIN ERROR
      // ==========================================
      if (!response.ok) {
        throw new Error(
          data.message || "Invalid username or password."
        );
      }

      // ==========================================
      // CHECK TOKEN
      // ==========================================
      if (!data.token) {
        throw new Error(
          "Login successful, but admin token was not received."
        );
      }

      // ==========================================
      // SAVE ADMIN JWT
      // ==========================================
      localStorage.setItem("adminToken", data.token);

      // ==========================================
      // SAVE ADMIN DETAILS
      // ==========================================
      if (data.admin) {
        localStorage.setItem(
          "adminUser",
          JSON.stringify(data.admin)
        );
      }

      console.log("Admin login successful");

      // ==========================================
      // REDIRECT TO ADMIN DASHBOARD
      // ==========================================
      navigate("/admin-chat");
    } catch (error) {
      console.error("Admin login error:", error);

      setError(
        error.message ||
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

                {/* ==========================================
                    ERROR MESSAGE
                ========================================== */}
                {error && (
                  <div
                    className="alert alert-danger py-2 mb-3"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {/* ==========================================
                    USERNAME
                ========================================== */}
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

                {/* ==========================================
                    PASSWORD
                ========================================== */}
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
                      showPassword
                        ? "text"
                        : "password"
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
                      setShowPassword(
                        (prev) => !prev
                      )
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

                {/* ==========================================
                    LOGIN BUTTON
                ========================================== */}
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

                {/* ==========================================
                    FORGOT PASSWORD
                ========================================== */}
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

