import React, { useState } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
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
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login data:", formData);
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
              <h2 className="glass-card__title">Admin Portal</h2>
              <p className="glass-card__subtitle">
                Welcome back! Please login to continue.
              </p>

              <Form onSubmit={handleSubmit} autoComplete="off">
                {/* Username */}
                <div className="glass-field">
                  <label htmlFor="username" className="glass-field__label">
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
                    required
                  />
                </div>

                {/* Password */}
                <div className="glass-field">
                  <label htmlFor="password" className="glass-field__label">
                    Password
                  </label>
                  <FaLock className="glass-field__icon" />
                  <Form.Control
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="glass-field__input"
                    required
                  />
                  <button
                    type="button"
                    className="glass-field__toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>

                {/* Login Button */}
                <Button type="submit" className="glass-btn w-100">
                  Log In
                  <FaArrowRight className="ms-2" />
                </Button>

                {/* Forgot Password */}
                <div className="text-center mt-3">
                  <a href="#forgot" className="glass-link">
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