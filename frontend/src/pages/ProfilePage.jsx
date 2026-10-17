
import { useState } from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useDispatch } from "react-redux";

import {
  setCommunityAuth,
  setCommunityUser,
} from "../features/auth/authSlice";

import {
  User,
  Mail,
  AtSign,
  Phone,
  Image,
  ArrowRight,
  Calendar,
} from "lucide-react";

import "./ProfilePage.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const ProfilePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const walletAddress =
    location.state?.walletAddress ||
    localStorage.getItem("communityXWallet");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    phone: "",
    profileImage: "",
    dob: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!walletAddress) {
    return (
      <div className="profile-error-page">
        <div className="profile-error-card">
          <h2>Wallet Not Found</h2>

          <p>
            Please connect and verify your wallet before creating your
            Community X profile.
          </p>

          <button
            type="button"
            onClick={() => navigate("/connect-wallet")}
          >
            Go to Onboarding
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("communityXToken");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please verify your wallet again."
        );
      }

      const response = await fetch(
        `${API_URL}/api/community/profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            username: formData.username,
            phone: formData.phone,
            profileImage: formData.profileImage,
            dob: formData.dob,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Profile creation failed."
        );
      }

      if (!data.user) {
        throw new Error(
          "Profile was saved, but the server did not return the user profile."
        );
      }

      // Save the profile in Redux.
      dispatch(setCommunityUser(data.user));

      // Keep wallet, token and profile synchronized.
      dispatch(
        setCommunityAuth({
          walletAddress: walletAddress.toLowerCase(),
          token,
          user: data.user,
        })
      );

      setSuccessMsg(
        "Community X profile created successfully!"
      );

      setTimeout(() => {
        navigate("/welcome", {
          state: {
            walletAddress,
            communityUser: data.user,
          },
          replace: true,
        });
      }, 1000);
    } catch (error) {
      console.error("Profile creation error:", error);

      setErrorMsg(
        error.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-glow profile-glow-one"></div>
      <div className="profile-glow profile-glow-two"></div>

      <div className="container">
        <div className="profile-wrapper">
          <div className="profile-header">
            <div className="profile-badge">
              COMMUNITY X
            </div>

            <h1>
              Create Your <span>Profile</span>
            </h1>

            <p>
              Your wallet has been verified. Complete your Community X
              profile to continue.
            </p>
          </div>

          <div className="profile-card">
            <div className="wallet-status">
              <span className="status-dot"></span>

              <div>
                <small>Verified Wallet</small>
                <strong>
                  {walletAddress.slice(0, 6)}
                  ...
                  {walletAddress.slice(-4)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="profile-field">
                <label>
                  <User size={16} />
                  Full Name
                </label>

                <input
                  type="text"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="profile-field">
                <label>
                  <Mail size={16} />
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="profile-field">
                <label>
                  <AtSign size={16} />
                  Username
                </label>

                <input
                  type="text"
                  name="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="profile-field">
                <label>
                  <Phone size={16} />
                  Phone Number
                </label>

                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="profile-field">
                <label>
                  <Calendar size={16} />
                  Date of Birth
                </label>

                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="profile-field">
                <label>
                  <Image size={16} />
                  Profile Image URL
                </label>

                <input
                  type="url"
                  name="profileImage"
                  placeholder="https://example.com/profile.jpg"
                  value={formData.profileImage}
                  onChange={handleChange}
                />
              </div>

              {errorMsg && (
                <div className="profile-message error">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="profile-message success">
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                className="profile-submit"
                disabled={loading}
              >
                {loading ? (
                  "Creating Profile..."
                ) : (
                  <>
                    Enter Community
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
