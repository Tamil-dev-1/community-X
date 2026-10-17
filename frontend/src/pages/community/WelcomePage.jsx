
import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCommunityUser } from "../../features/auth/authSlice";
import "./welcomePage.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const WelcomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const auth = useSelector((state) => state.auth);
  const user = auth?.user || {};

  const name =
    user.fullName?.trim() ||
    user.username?.trim() ||
    "Community Member";

  const wallet =
    user.walletAddress ||
    auth?.walletAddress ||
    localStorage.getItem("communityXWallet") ||
    "";

  const [avatar, setAvatar] = useState(
    user.profileImage ||
      localStorage.getItem("communityXProfileImage") ||
      DEFAULT_AVATAR
  );

  const [copied, setCopied] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  // Keep the displayed photo synchronized with the Redux user.
  useEffect(() => {
    const savedImage =
      user.profileImage ||
      localStorage.getItem("communityXProfileImage");

    setAvatar(savedImage || DEFAULT_AVATAR);
  }, [user.profileImage]);

  // Convert the selected image to a Base64 data URL.
  const readImageAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Unable to read the selected image."));
          return;
        }

        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(new Error("Unable to read the selected image."));
      };

      reader.readAsDataURL(file);
    });

  // Upload the image to the backend and save it in MongoDB.
  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later.
    event.target.value = "";

    if (!file) return;

    setUploadError("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError(
        "Please select a JPG, PNG, WEBP, or GIF image."
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError("Please select an image smaller than 2 MB.");
      return;
    }

    const token =
      auth?.token || localStorage.getItem("communityXToken");

    if (!token) {
      setUploadError(
        "Your session has expired. Please connect your wallet again."
      );
      return;
    }

    setUploading(true);

    try {
      const imageData = await readImageAsDataURL(file);

      const response = await fetch(
        `${API_URL}/api/community/profile/photo`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            profileImage: imageData,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update your profile photo."
        );
      }

      if (!data.user) {
        throw new Error(
          "The server did not return your updated profile."
        );
      }

      // Keep the latest server profile and its photo in Redux.
      const updatedUser = {
        ...user,
        ...data.user,
        profileImage: data.user.profileImage || imageData,
      };

      dispatch(setCommunityUser(updatedUser));

      // Cache the photo locally as a convenience.
      // MongoDB remains the primary saved copy.
      try {
        localStorage.setItem(
          "communityXProfileImage",
          updatedUser.profileImage
        );
      } catch (storageError) {
        console.warn(
          "Profile photo could not be cached locally:",
          storageError
        );
      }

      setAvatar(updatedUser.profileImage);
      setUploadError("");
    } catch (error) {
      console.error("Profile photo upload failed:", error);

      setUploadError(
        error.message ||
          "Unable to upload your photo. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCopyWallet = async () => {
    if (!wallet) return;

    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  const shortenedWallet = wallet
    ? `${wallet.slice(0, 8)}...${wallet.slice(-6)}`
    : "Wallet address unavailable";

  return (
    <main className="wl-page">
      {/* Animated background */}
      <div className="wl-bg" aria-hidden="true">
        <div className="wl-glow wl-glow-1" />
        <div className="wl-glow wl-glow-2" />

        <svg
          className="wl-network"
          viewBox="0 0 700 600"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
        >
          <g className="wl-lines">
            <line x1="100" y1="90" x2="250" y2="150" />
            <line x1="250" y1="150" x2="400" y2="70" />
            <line x1="400" y1="70" x2="550" y2="170" />
            <line x1="100" y1="90" x2="170" y2="300" />
            <line x1="170" y1="300" x2="350" y2="250" />
            <line x1="350" y1="250" x2="550" y2="170" />
            <line x1="250" y1="150" x2="350" y2="250" />
            <line x1="170" y1="300" x2="300" y2="440" />
            <line x1="300" y1="440" x2="490" y2="380" />
            <line x1="350" y1="250" x2="490" y2="380" />
            <line x1="490" y1="380" x2="550" y2="170" />
            <line x1="300" y1="440" x2="180" y2="520" />
            <line x1="490" y1="380" x2="590" y2="510" />
            <line x1="180" y1="520" x2="300" y2="440" />
          </g>

          <g className="wl-nodes">
            <circle cx="100" cy="90" r="4" />
            <circle cx="250" cy="150" r="5" />
            <circle cx="400" cy="70" r="4" />
            <circle cx="550" cy="170" r="5" />
            <circle cx="170" cy="300" r="4" />
            <circle cx="350" cy="250" r="5" />
            <circle cx="300" cy="440" r="4" />
            <circle cx="490" cy="380" r="5" />
            <circle cx="180" cy="520" r="4" />
            <circle cx="590" cy="510" r="4" />
          </g>
        </svg>

        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={index}
            className={`wl-particle wl-p-${index + 1}`}
          />
        ))}
      </div>

      <div className="container wl-container position-relative">
        {/* Welcome badge */}
        <div className="text-center">
          <div className="wl-badge">
            <i className="bi bi-stars" />
            WELCOME TO COMMUNITY X
          </div>
        </div>

        {/* Hero section */}
        <section className="row align-items-center g-4">
          <div className="col-lg-7">
            <h1 className="wl-title">
              Welcome back,
              <br />
              <span className="wl-title-gradient">{name}</span>
            </h1>

            <p className="wl-subtitle">
              Your community. Your connections. Your next opportunity.
              Connect with members, share ideas, and stay updated with
              the latest announcements.
            </p>

            {/* Member profile */}
            <div className="wl-profile">
              <div className="wl-avatar-wrap">
                <img
                  className="wl-avatar"
                  src={avatar}
                  alt={`${name}'s profile`}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />

                <span className="wl-online" />

                <button
                  type="button"
                  className="wl-avatar-upload"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Change profile photo"
                  title={
                    uploading
                      ? "Uploading photo..."
                      : "Change profile photo"
                  }
                  disabled={uploading}
                >
                  <i
                    className={`bi ${
                      uploading
                        ? "bi-arrow-repeat"
                        : "bi-camera-fill"
                    }`}
                  />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  disabled={uploading}
                  onChange={handlePhotoChange}
                />
              </div>

              <div className="flex-grow-1 min-w-0">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span className="wl-profile-name">{name}</span>

                  <span className="wl-member-tag">
                    <i className="bi bi-patch-check-fill me-1" />
                    MEMBER
                  </span>
                </div>

                <div className="wl-wallet flex-wrap">
                  <i className="bi bi-wallet2 wl-pink" />

                  <span
                    className="wl-wallet-address"
                    title={wallet || "Wallet address unavailable"}
                  >
                    {shortenedWallet}
                  </span>

                  {wallet && (
                    <button
                      type="button"
                      className="wl-copy"
                      onClick={handleCopyWallet}
                      title="Copy wallet address"
                      aria-label="Copy wallet address"
                    >
                      <i
                        className={`bi ${
                          copied ? "bi-check2" : "bi-copy"
                        }`}
                      />
                    </button>
                  )}

                  {copied && (
                    <span className="wl-copied">Copied!</span>
                  )}
                </div>

                <p className="wl-photo-hint">
                  <i className="bi bi-camera me-1" />
                  {uploading
                    ? "Saving your profile photo..."
                    : "Click the camera icon to change your photo."}
                </p>

                {uploadError && (
                  <p className="wl-photo-error" role="alert">
                    {uploadError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Animated crown */}
          <div className="col-lg-5">
            <div className="wl-hero" aria-hidden="true">
              <div className="wl-orb">
                <div className="wl-orb-ring wl-orb-ring-1" />
                <div className="wl-orb-ring wl-orb-ring-2" />

                <div className="wl-orb-core">
                  <svg
                    className="wl-crown-big"
                    viewBox="0 0 120 100"
                  >
                    <path d="M12 30 L35 48 L60 12 L85 48 L108 30 L96 78 L24 78 Z" />
                    <path d="M24 88 H96" />
                    <circle cx="12" cy="24" r="5" />
                    <circle cx="60" cy="8" r="5" />
                    <circle cx="108" cy="24" r="5" />
                  </svg>
                </div>
              </div>

              <div className="wl-platform">
                <div className="wl-platform-ring wl-platform-ring-1" />
                <div className="wl-platform-ring wl-platform-ring-2" />
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard cards */}
        <section className="wl-cards">
          <div className="row g-4">
            <div className="col-lg-4 col-md-6">
              <article className="wl-card">
                <div>
                  <div className="wl-card-head">
                    <div className="wl-icon wl-icon-pink">
                      <i className="bi bi-chat-square-dots-fill fs-3" />
                    </div>

                    <div>
                      <h2 className="wl-card-title">Group Chat</h2>

                      <p className="wl-card-text">
                        Connect with community members, join
                        conversations, and share your ideas with
                        everyone.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="wl-btn wl-btn-primary"
                  onClick={() => navigate("/community")}
                >
                  <span>Enter Community Chat</span>
                  <i className="bi bi-arrow-right" />
                </button>
              </article>
            </div>

            <div className="col-lg-4 col-md-6">
              <article className="wl-card">
                <div>
                  <div className="wl-card-head">
                    <div className="wl-icon wl-icon-purple">
                      <i className="bi bi-megaphone-fill fs-3" />
                    </div>

                    <div>
                      <h2 className="wl-card-title">
                        Announcements
                      </h2>

                      <p className="wl-card-text">
                        Stay informed about important updates,
                        community news, and notices from your admin.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="wl-btn wl-btn-outline"
                  onClick={() => navigate("/announcements")}
                >
                  <span>View Announcements</span>
                  <i className="bi bi-arrow-right" />
                </button>
              </article>
            </div>

            <div className="col-lg-4 col-md-12">
              <article className="wl-card">
                <div className="wl-card-head">
                  <div className="wl-icon wl-icon-pink-soft">
                    <i className="bi bi-people-fill fs-3" />
                  </div>

                  <div>
                    <h2 className="wl-card-title">
                      Our Community
                    </h2>

                    <p className="wl-card-text">
                      A growing network built on connection,
                      collaboration, and shared opportunities.
                    </p>
                  </div>
                </div>

                <ul className="wl-stats">
                  <li>
                    <i className="bi bi-people-fill wl-pink" />
                    <span>
                      <strong>360</strong> Community Members
                    </span>
                  </li>

                  <li>
                    <i className="bi bi-activity wl-pink" />
                    Active &amp; Growing
                  </li>

                  <li>
                    <i className="bi bi-shield-lock-fill wl-pink" />
                    Exclusive Member Access
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="wl-footer">
          <span className="wl-footer-text">
            BUILT ON CONNECTION. DRIVEN BY COMMUNITY.
          </span>

          <div className="wl-stripes" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
        </footer>
      </div>
    </main>
  );
};

export default WelcomePage;
