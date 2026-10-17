
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
} from "wagmi";

import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import {
  setCommunityAuth,
  setCommunityUser,
} from "../features/auth/authSlice";

import "./OnboardingPage.css";

// =====================================================
// API
// =====================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

// =====================================================
// ONBOARDING STAGES
// =====================================================

const STAGES = ["connect", "sign", "verified"];

// =====================================================
// HELPERS
// =====================================================

function truncateAddress(address) {
  if (!address) return "";

  if (address.length <= 13) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// =====================================================
// PARTICLE NETWORK
// =====================================================

function useParticleNetwork(canvasRef, containerRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return undefined;

    const ctx = canvas.getContext("2d");

    if (!ctx) return undefined;

    const reduceMotion = window
      .matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    let nodes = [];
    let frameId = null;

    const magenta = "rgba(230,61,122,";
    const cyan = "rgba(55,217,212,";
    const gold = "rgba(242,169,59,";

    function buildNodes() {
      const count = Math.max(
        18,
        Math.min(46, Math.floor((width * height) / 24000))
      );

      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1.5 + 0.8,
        hue: Math.random() > 0.7 ? "cyan" : "gold",
      }));
    }

    function resize() {
      width = container.clientWidth;
      height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildNodes();
    }

    function drawFrame() {
      ctx.clearRect(0, 0, width, height);

      const maxDist = Math.min(140, width / 5);

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.3;

            ctx.strokeStyle = `${magenta}${opacity})`;
            ctx.lineWidth = 0.6;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((node) => {
        const col = node.hue === "cyan" ? cyan : gold;

        ctx.beginPath();
        ctx.fillStyle = `${col}0.85)`;
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `${col}0.12)`;
        ctx.arc(node.x, node.y, node.r * 4, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reduceMotion) {
        frameId = requestAnimationFrame(drawFrame);
      }
    }

    resize();
    drawFrame();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);

      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [canvasRef, containerRef]);
}

// =====================================================
// GOOGLE FONTS
// =====================================================

function useGoogleFonts() {
  useEffect(() => {
    const id = "cx-google-fonts";

    if (document.getElementById(id)) return;

    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";

    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";

    const stylesheet = document.createElement("link");
    stylesheet.id = id;
    stylesheet.rel = "stylesheet";
    stylesheet.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap";

    document.head.append(preconnect1, preconnect2, stylesheet);
  }, []);
}

// =====================================================
// ONBOARDING PAGE
// =====================================================

export default function OnboardingPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const autoSignStartedRef = useRef(false);

  useGoogleFonts();
  useParticleNetwork(canvasRef, wrapRef);

  // ---------------------------------------------------
  // WAGMI
  // ---------------------------------------------------

  const { address, isConnected } = useAccount();

  const {
    connect,
    connectors,
    isPending: isConnecting,
    error: connectError,
  } = useConnect();

  const { disconnect } = useDisconnect();

  const {
    signMessageAsync,
    reset: resetSignature,
  } = useSignMessage();

  // ---------------------------------------------------
  // LOCAL STATE
  // ---------------------------------------------------

  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [signature, setSignature] = useState(null);
  const [authMessage, setAuthMessage] = useState("");
  const [profileChecking, setProfileChecking] = useState(false);

  // ---------------------------------------------------
  // REQUEST NONCE
  // ---------------------------------------------------

  const requestNonce = useCallback(async (walletAddress) => {
    if (!walletAddress) {
      throw new Error("Wallet address is missing.");
    }

    const response = await fetch(`${API_URL}/api/auth/web3/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: walletAddress }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Unable to create authentication message."
      );
    }

    return data.message;
  }, []);

  // ---------------------------------------------------
  // CHECK COMMUNITY PROFILE
  // ---------------------------------------------------

  const checkCommunityProfile = useCallback(async () => {
    setProfileChecking(true);

    try {
      const token = localStorage.getItem("communityXToken");

      if (!token) {
        throw new Error(
          "Authentication token is missing. Please connect your wallet again."
        );
      }

      const response = await fetch(
        `${API_URL}/api/community/profile/check`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to check Community X profile."
        );
      }

      return data;
    } finally {
      setProfileChecking(false);
    }
  }, []);

  // ---------------------------------------------------
  // SIGN AND VERIFY WALLET
  // ---------------------------------------------------

  const handleSignAndVerify = useCallback(
    async (walletAddress) => {
      if (!walletAddress) {
        setErrorMsg("Please connect your wallet first.");
        setStatus("error");
        return;
      }

      try {
        setErrorMsg("");
        setStatus("signing");

        // 1. Request authentication message.
        const message = await requestNonce(walletAddress);
        setAuthMessage(message);

        // 2. Ask the wallet to sign.
        const walletSignature = await signMessageAsync({ message });
        setSignature(walletSignature);

        // 3. Verify wallet and membership.
        setStatus("verifying");

        const response = await fetch(
          `${API_URL}/api/auth/web3/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: walletAddress,
              message,
              signature: walletSignature,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          if (data.code === "NOT_VALUTX_MEMBER") {
            setErrorMsg(
              data.message ||
                "This wallet is not registered as a ValutX member."
            );
            setStatus("denied");
            return;
          }

          throw new Error(
            data.message || "Wallet verification failed."
          );
        }

        if (!data.token) {
          throw new Error(
            "Authentication token was not received from the server."
          );
        }

        // 4. Confirm membership before saving authenticated state.
        if (!data.isValutXMember) {
          setErrorMsg(
            "This wallet is not registered as a ValutX member."
          );
          setStatus("denied");
          return;
        }

        // 5. Save the verified wallet and JWT.
        const verifiedWallet = (
          data.walletAddress || walletAddress
        ).toLowerCase();

        localStorage.setItem("communityXToken", data.token);
        localStorage.setItem("communityXWallet", verifiedWallet);

        dispatch(
          setCommunityAuth({
            walletAddress: verifiedWallet,
            token: data.token,
            user: null,
          })
        );

        // 6. Check if the Community X profile exists.
        const profileData = await checkCommunityProfile();
        const profileExists = Boolean(profileData.exists);
        const communityUser = profileData.user || null;

        if (profileExists && communityUser) {
          dispatch(setCommunityUser(communityUser));
        }

        // 7. Navigate to the correct page.
        setStatus("verified");

        if (!profileExists) {
          setTimeout(() => {
            navigate("/create-profile", {
              state: { walletAddress: verifiedWallet },
            });
          }, 800);

          return;
        }

        setTimeout(() => {
          navigate("/welcome", {
            state: {
              walletAddress: verifiedWallet,
              communityUser,
            },
          });
        }, 800);
      } catch (error) {
        console.error("Wallet authentication error:", error);

        setErrorMsg(
          error?.shortMessage ||
            error?.message ||
            "Wallet verification failed."
        );

        setStatus("error");
      }
    },
    [
      requestNonce,
      signMessageAsync,
      checkCommunityProfile,
      navigate,
      dispatch,
    ]
  );

  // ---------------------------------------------------
  // CONNECT WALLET
  // ---------------------------------------------------

  const handleConnect = useCallback(() => {
    setErrorMsg("");
    setStatus("connecting");
    autoSignStartedRef.current = false;

    const connector = connectors[0];

    if (!connector) {
      setErrorMsg("No compatible wallet was found.");
      setStatus("error");
      return;
    }

    connect(
      { connector },
      {
        onSuccess: () => {
          // The effect below starts signing after Wagmi updates.
          setStatus("connected");
        },
        onError: (error) => {
          setErrorMsg(
            error?.shortMessage ||
              error?.message ||
              "Wallet connection failed."
          );
          setStatus("error");
        },
      }
    );
  }, [connect, connectors]);

  // ---------------------------------------------------
  // AUTOMATIC SIGN AFTER CONNECTION
  // ---------------------------------------------------

  useEffect(() => {
    if (status !== "connected" || !isConnected || !address) {
      return;
    }

    if (autoSignStartedRef.current) return;

    autoSignStartedRef.current = true;
    handleSignAndVerify(address);
  }, [status, isConnected, address, handleSignAndVerify]);

  // ---------------------------------------------------
  // RESET
  // ---------------------------------------------------

  const handleReset = useCallback(() => {
    resetSignature();
    disconnect();

    setSignature(null);
    setAuthMessage("");
    setErrorMsg("");
    setProfileChecking(false);

    autoSignStartedRef.current = false;
    setStatus("idle");
  }, [resetSignature, disconnect]);

  // ---------------------------------------------------
  // CONNECTION ERROR
  // ---------------------------------------------------

  useEffect(() => {
    if (!connectError) return;

    setErrorMsg(
      connectError?.shortMessage ||
        connectError?.message ||
        "Unable to connect wallet."
    );

    setStatus("error");
  }, [connectError]);

  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  const isBusy =
    isConnecting ||
    status === "connecting" ||
    status === "signing" ||
    status === "verifying" ||
    profileChecking;

  const isVerified = status === "verified";
  const isDenied = status === "denied";

  let stageIndex = 0;

  if (
    status === "signing" ||
    status === "verifying" ||
    profileChecking
  ) {
    stageIndex = 1;
  }

  if (status === "verified" || status === "denied") {
    stageIndex = 2;
  }

  let buttonLabel = "Connect Wallet";

  if (status === "connecting") {
    buttonLabel = "Connecting Wallet…";
  } else if (status === "connected") {
    buttonLabel = "Preparing Signature…";
  } else if (status === "signing") {
    buttonLabel = "Waiting for Signature…";
  } else if (status === "verifying") {
    buttonLabel = "Verifying ValutX Membership…";
  } else if (profileChecking) {
    buttonLabel = "Checking Community X Profile…";
  } else if (status === "denied") {
    buttonLabel = "Try Another Wallet";
  } else if (status === "verified") {
    buttonLabel = "Verification Complete";
  }

  // ---------------------------------------------------
  // PRIMARY BUTTON
  // ---------------------------------------------------

  const handlePrimaryClick = () => {
    if (isBusy) return;

    if (status === "idle" || status === "error") {
      if (isConnected && address) {
        autoSignStartedRef.current = false;
        setStatus("connected");
        return;
      }

      handleConnect();
      return;
    }

    if (status === "denied") {
      handleReset();
    }
  };

  // ---------------------------------------------------
  // UI
  // ---------------------------------------------------

  return (
    <div className="cxo-page" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="cxo-network-canvas"
        aria-hidden="true"
      />

      <div className="cxo-ambient" aria-hidden="true" />

      <div className="container cxo-container">
        <div className="row justify-content-center align-items-center w-100 mx-0">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4 px-0">
            <div className="cxo-brand text-center">
              <span className="cxo-brand-mark">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3L20 8V16L12 21L4 16V8L12 3Z"
                    stroke="#170812"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <span className="cxo-brand-word">
                TGPS <span>Community X</span>
              </span>
            </div>

            <div
              className={`cxo-card${isVerified ? " is-verified" : ""}${
                isBusy ? " is-busy" : ""
              }`}
            >
              <div className="cxo-card-glow" aria-hidden="true" />

              {isDenied ? (
                <div className="cxo-success text-center">
                  <span className="cxo-success-ring">
                    <span className="cxo-success-pulse" aria-hidden="true" />
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="cxo-success-check"
                    >
                      <path d="M6 6L18 18" />
                      <path d="M18 6L6 18" />
                    </svg>
                  </span>

                  <span className="cxo-result-badge">ACCESS DENIED</span>
                  <h1>ValutX Membership Required</h1>

                  <p className="cxo-sub">
                    The wallet{" "}
                    <span className="cxo-mono">
                      {truncateAddress(address)}
                    </span>{" "}
                    is not registered as a ValutX member.
                  </p>

                  <button
                    type="button"
                    className="cxo-secondary-btn"
                    onClick={handleReset}
                  >
                    Use Another Wallet
                  </button>

                  <div className="cxo-progress-bar">
                    <span className="cxo-progress-fill" />
                  </div>
                </div>
              ) : !isVerified ? (
                <>
                  <div className="cxo-wallet-ring">
                    <span className="cxo-wallet-ring-spin" aria-hidden="true" />

                    <span className="cxo-wallet-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <rect x="3" y="6.5" width="18" height="12.5" rx="2.5" />
                        <path d="M3 10.2h18" />
                        <circle
                          cx="16.3"
                          cy="14.3"
                          r="1.15"
                          fill="currentColor"
                          stroke="none"
                        />
                      </svg>
                    </span>
                  </div>

                  <h1>Verify Community Access</h1>

                  <p className="cxo-sub">
                    Connect your Web3 wallet and sign a message to verify your
                    ValutX membership.
                  </p>

                  <div
                    className={`cxo-input-wrapper${
                      isConnected ? " is-filled" : ""
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="cxo-input-icon"
                    >
                      <rect x="3" y="6.5" width="18" height="12.5" rx="2.5" />
                      <path d="M3 10.2h18" />
                    </svg>

                    <div className="cxo-wallet-address">
                      {address
                        ? truncateAddress(address)
                        : "Wallet not connected"}
                    </div>

                    {isConnected && (
                      <span className="cxo-address-check">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12L10 17L19 7" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <div
                    className="cxo-chain"
                    role="status"
                    aria-label={`Step ${stageIndex + 1} of 3`}
                  >
                    {STAGES.map((stage, index) => (
                      <React.Fragment key={stage}>
                        <div
                          className={`cxo-chain-node${
                            stageIndex > index ? " is-done" : ""
                          }${
                            stageIndex === index ? " is-active" : ""
                          }`}
                        >
                          <span className="cxo-chain-dot" />
                          <span className="cxo-chain-label">
                            {stage === "connect"
                              ? "Connect"
                              : stage === "sign"
                              ? "Sign"
                              : "Verified"}
                          </span>
                        </div>

                        {index < STAGES.length - 1 && (
                          <span
                            className={`cxo-chain-line${
                              stageIndex > index ? " is-done" : ""
                            }`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {status === "signing" && (
                    <p className="cxo-sub">
                      Please approve the signature request in your wallet.
                    </p>
                  )}

                  {status === "verifying" && (
                    <p className="cxo-sub">
                      Verifying your wallet and ValutX membership...
                    </p>
                  )}

                  {profileChecking && (
                    <p className="cxo-sub">
                      Checking your Community X profile...
                    </p>
                  )}

                  {errorMsg && <p className="cxo-error">{errorMsg}</p>}

                  <button
                    type="button"
                    className="cxo-btn"
                    onClick={handlePrimaryClick}
                    disabled={isBusy}
                    aria-busy={isBusy}
                  >
                    {isBusy && (
                      <span className="cxo-spinner" aria-hidden="true" />
                    )}
                    <span>{buttonLabel}</span>
                  </button>

                  <p className="cxo-note">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12L10 17L19 7" />
                    </svg>
                    Secure wallet verification
                  </p>
                </>
              ) : (
                <div className="cxo-success text-center">
                  <span className="cxo-success-ring">
                    <span className="cxo-success-pulse" aria-hidden="true" />
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="cxo-success-check"
                    >
                      <path d="M5 12L10 17L19 7" />
                    </svg>
                  </span>

                  <span className="cxo-result-badge">
                    VALUTX MEMBER VERIFIED
                  </span>

                  <h1>Welcome to Community X</h1>

                  <p className="cxo-sub">
                    Your wallet{" "}
                    <span className="cxo-mono">
                      {truncateAddress(address)}
                    </span>{" "}
                    is verified and your ValutX membership is confirmed.
                  </p>

                  <p className="cxo-sub">
                    Checking your Community X profile...
                  </p>

                  <div className="cxo-progress-bar">
                    <span className="cxo-progress-fill" />
                  </div>
                </div>
              )}
            </div>

            <p className="cxo-footnote text-center">
              Having trouble connecting?{" "}
              <a href="#support">Message an Admin</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
