import React, { useEffect, useRef, useState } from "react";
import "./LandingPage.css";
import { Link } from "react-router-dom";

/**
 * Community X — marketing landing page.
 *
 * Requires:
 *   npm install bootstrap
 *   import "bootstrap/dist/css/bootstrap.min.css";  (once, in your app entry — e.g. main.jsx)
 *
 * Bootstrap supplies the grid/layout utilities (container, row, col-*, d-flex, etc.);
 * all colors, type and motion come from ./LandingPage.css.
 */

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#trust", label: "Trust & security" },
  { href: "#join", label: "Join" },
];

const FEATURES = [
  {
    title: "Wallet-based sign-in",
    text: "No passwords to remember or leak — your wallet signature is your identity.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="13" rx="2.5" />
        <path d="M3 10h18" />
        <circle cx="16.5" cy="14.2" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "Real-time group chat",
    text: "One shared room for every verified member, with messages delivered instantly.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 11.5a7.5 7.5 0 0 1-11.4 6.4L4 19l1.2-4.3A7.5 7.5 0 1 1 21 11.5Z" />
      </svg>
    ),
  },
  {
    title: "Private admin channel",
    text: "A one-to-one thread with the admin team, visible to no one else.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3" />
      </svg>
    ),
  },
  {
    title: "Role-based access",
    text: "Members and admins see exactly the tools their role is meant to have.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" />
        <path d="M9 12.2l2 2 4-4.4" />
      </svg>
    ),
  },
  {
    title: "Verified membership",
    text: "Every member completes a short review before they can enter the community.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5.5 20c1-3.4 3.7-5.2 6.5-5.2S17.5 16.6 18.5 20" />
      </svg>
    ),
  },
  {
    title: "Full audit trail",
    text: "Every admin action is logged, so the community stays accountable.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3.5" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    n: "01",
    title: "Connect your wallet",
    text: "Open Community X and connect the wallet you already use — no new account, no new password.",
  },
  {
    n: "02",
    title: "Get verified",
    text: "Add a few profile details once. Our team reviews and confirms your membership.",
  },
  {
    n: "03",
    title: "Start chatting",
    text: "You're in. Join the group room and message an admin any time you need to.",
  },
];

const STATS = [
  { value: "100%", label: "Members wallet-verified before they can chat" },
  { value: "0", label: "Passwords stored — signatures replace them entirely" },
  { value: "24/7", label: "Admin channel availability for every member" },
];

function useParticleNetwork(canvasRef, containerRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    let nodes = [];
    let frameId = null;

    const magenta = "rgba(230,61,122,";
    const cyan = "rgba(55,217,212,";
    const gold = "rgba(242,169,59,";

    function buildNodes() {
      const count = Math.max(22, Math.min(56, Math.floor((width * height) / 26000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.9,
        hue: Math.random() > 0.75 ? "cyan" : "gold",
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
      const maxDist = Math.min(150, width / 6);

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.35;
            ctx.strokeStyle = `${magenta}${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        const col = n.hue === "cyan" ? cyan : gold;
        ctx.beginPath();
        ctx.fillStyle = `${col}0.9)`;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = `${col}0.14)`;
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reduceMotion) frameId = requestAnimationFrame(drawFrame);
    }

    resize();
    drawFrame();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [canvasRef, containerRef]);
}

function useGoogleFonts() {
  useEffect(() => {
    const id = "cx-google-fonts";
    if (document.getElementById(id)) return undefined;
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
    return undefined;
  }, []);
}

export default function LandingPage() {
  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useGoogleFonts();
  useParticleNetwork(canvasRef, heroRef);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="cx-page">
      <div className="cx-ambient" aria-hidden="true" />

      {/* ---------- Navbar ---------- */}
      <header className="cx-navbar">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between cx-nav-row">
            <a href="#top" className="cx-brand d-flex align-items-center gap-2">
              <span className="cx-brand-mark">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L20 8V16L12 21L4 16V8L12 3Z" stroke="#170812" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="cx-brand-word">
                TGPS <span>Global</span>
              </span>
            </a>

            <nav className="cx-nav-links d-none d-lg-flex align-items-center gap-4">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="d-flex align-items-center gap-3">
              <Link to="/connect-wallet" className="cx-btn cx-btn-ghost d-none d-lg-inline-flex">
                Connect wallet
              </Link>
              <button
                type="button"
                className={`cx-nav-toggle d-lg-none${menuOpen ? " is-open" : ""}`}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span />
              </button>
            </div>
          </div>
        </div>

        <div className={`cx-mobile-panel d-lg-none${menuOpen ? " is-open" : ""}`}>
          <div className="container d-flex flex-column">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={closeMenu}>
                {link.label}
              </a>
            ))}
            <Link to="/connect-wallet" className="cx-btn cx-btn-primary mt-3" onClick={closeMenu}>
              Connect wallet
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ---------- Hero ---------- */}
        <section className="cx-hero" id="join" ref={heroRef}>
          <canvas ref={canvasRef} className="cx-network-canvas" aria-hidden="true" />
          <div className="container position-relative">
            <div className="cx-hero-inner mx-auto text-center">
              <span className="cx-badge">
                <span className="cx-badge-pip">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 12L10 17L19 7" stroke="#170812" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Wallet-verified · invite only
              </span>

              <h1>
                One wallet. One community. <em>Every conversation that matters.</em>
              </h1>

              <p className="cx-hero-sub mx-auto">
                Community X is TGPS Global&rsquo;s private members&rsquo; space — connect your wallet, get verified, and step
                into live group chat with direct access to admins whenever you need it.
              </p>

              <div className="cx-hero-cta d-flex flex-wrap justify-content-center">
                <a href="#how-it-works" className="cx-btn cx-btn-primary cx-btn-glow">
                  Connect wallet
                </a>
                <a href="#features" className="cx-btn cx-btn-ghost">
                  See what&rsquo;s inside
                </a>
              </div>

              <div className="row cx-hero-stats justify-content-center">
                <div className="col-4 col-sm-auto cx-hero-stat">
                  <b>360</b>
                  <span>Verified members</span>
                </div>
                <div className="col-4 col-sm-auto cx-hero-stat">
                  <b>1</b>
                  <span>Gated community</span>
                </div>
                <div className="col-4 col-sm-auto cx-hero-stat">
                  <b>24/7</b>
                  <span>Admin access</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Section 1: Features ---------- */}
        <section className="cx-section" id="features">
          <div className="container">
            <div className="cx-section-head mx-auto text-center">
              <h2>Everything a verified community needs</h2>
              <p>No passwords, no anonymous accounts — just wallet-verified people, talking directly.</p>
            </div>
            <div className="row g-4">
              {FEATURES.map((f) => (
                <div className="col-12 col-sm-6 col-lg-4" key={f.title}>
                  <div className="cx-feature-card h-100">
                    <span className="cx-feature-icon">{f.icon}</span>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="cx-divider" aria-hidden="true">
          <svg viewBox="0 0 1200 46" preserveAspectRatio="none">
            <path d="M0 23 L1200 23" stroke="url(#cxg1)" strokeWidth="1" strokeDasharray="2 10" />
            <defs>
              <linearGradient id="cxg1" x1="0" x2="1">
                <stop offset="0" stopColor="#e63d7a" stopOpacity="0" />
                <stop offset="0.5" stopColor="#e63d7a" stopOpacity="0.6" />
                <stop offset="1" stopColor="#37d9d4" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* ---------- Section 2: How it works ---------- */}
        <section className="cx-section" id="how-it-works">
          <div className="container">
            <div className="cx-section-head mx-auto text-center">
              <h2>Three steps to get in</h2>
              <p>No lengthy sign-up flow — just enough to confirm you&rsquo;re a real, verified member.</p>
            </div>

            <div className="row g-4 cx-steps-row">
              {STEPS.map((step, i) => (
                <div className="col-12 col-md-4" key={step.n}>
                  <div className={`cx-step-card${i === activeStep ? " is-active" : ""}`}>
                    <span className="cx-step-num">{step.n}</span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Section 3: Trust & security ---------- */}
        <section className="cx-section cx-section-alt" id="trust">
          <div className="container">
            <div className="row align-items-center g-5">
              <div className="col-12 col-lg-5">
                <span className="cx-eyebrow">
                  <span className="cx-eyebrow-line" />
                  Trust &amp; security
                </span>
                <h2>Built to be verified, not just trusted</h2>
                <p className="cx-lead">
                  Every session starts with a wallet signature, every admin action is written to an audit log, and
                  every role sees only what it&rsquo;s meant to. Security isn&rsquo;t a settings page here — it&rsquo;s how the
                  platform is built.
                </p>
                <a href="#join" className="cx-btn cx-btn-primary">
                  Connect your wallet
                </a>
              </div>
              <div className="col-12 col-lg-7">
                <div className="row g-4">
                  {STATS.map((stat) => (
                    <div className="col-12 col-sm-4" key={stat.label}>
                      <div className="cx-stat-card h-100">
                        <b>{stat.value}</b>
                        <p>{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Section 4: CTA ---------- */}
        <section className="cx-section cx-cta">
          <div className="container">
            <div className="cx-cta-card text-center mx-auto">
              <h2>Your community is waiting</h2>
              <p>Connect your wallet, complete a short verification, and you&rsquo;re in — group chat and direct admin access included.</p>
              <a href="#join" className="cx-btn cx-btn-primary cx-btn-glow cx-btn-lg">
                Connect wallet
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="cx-footer">
        <div className="container">
          <div className="row g-5 cx-footer-top">
            <div className="col-12 col-lg-4">
              <a href="#top" className="cx-brand d-flex align-items-center gap-2">
                <span className="cx-brand-mark cx-no-spin">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 3L20 8V16L12 21L4 16V8L12 3Z" stroke="#170812" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="cx-brand-word">
                  TGPS <span>Global</span>
                </span>
              </a>
              <p className="cx-footer-about">
                Community X is TGPS Global&rsquo;s private, wallet-verified members&rsquo; space for real-time chat and direct
                admin support.
              </p>
            </div>
            <div className="col-6 col-lg-2">
              <h4>Platform</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="#join">Group chat</a>
            </div>
            <div className="col-6 col-lg-2">
              <h4>Trust</h4>
              <a href="#trust">Security</a>
              <a href="#join">Wallet verification</a>
              <a href="#">Privacy policy</a>
            </div>
            <div className="col-6 col-lg-2">
              <h4>Company</h4>
              <a href="#">About TGPS</a>
              <a href="#">Contact an admin</a>
              <a href="#">Report an issue</a>
            </div>
          </div>
          <div className="cx-footer-bottom d-flex flex-wrap align-items-center justify-content-between">
            <span>© {new Date().getFullYear()} TGPS Global. All rights reserved.</span>
            <div className="d-flex gap-2">
              <a href="#" className="cx-icon-btn" aria-label="X / Twitter">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                  <path d="M4 4L20 20M20 4L4 20" />
                </svg>
              </a>
              <a href="#" className="cx-icon-btn" aria-label="Discord">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                  <circle cx="9" cy="12" r="1.4" />
                  <circle cx="15" cy="12" r="1.4" />
                  <path d="M7 5.5C10 4.5 14 4.5 17 5.5L18.5 16C16.5 17.5 15 18 15 18L14 16.3M7 5.5L5.5 16C7.5 17.5 9 18 9 18L10 16.3" />
                </svg>
              </a>
              <a href="#" className="cx-icon-btn" aria-label="Telegram">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                  <path d="M21 4L3 11L10 13.5M21 4L14.5 20L10 13.5M21 4L10 13.5" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
