import React, { useMemo, useState } from "react";
import { ArrowRight, BrainCircuit, Download, Leaf, MessageCircle, ShieldCheck, Smartphone, Sprout, Store, Trophy } from "lucide-react";
import ProductApp from "./ProductApp.jsx";

const isNativeApp = () => {
  if (typeof window === "undefined") return false;
  return Boolean(window.Capacitor?.isNativePlatform?.());
};

function LandingPage({ openApp }) {
  const proofPoints = [
    ["Leafy AI", "Computer vision verification for safer listings"],
    ["Garden visits", "Explore real plant collections from nearby growers"],
    ["10% fee", "Only after a successful sale. No upfront listing fee"],
  ];

  const features = [
    ["AI market check", "Identify plants, detect risky listings, and help sellers post safely.", BrainCircuit, "/landing-market.png"],
    ["Plant marketplace", "Buy and sell plants, seedlings, herbs, veggies, pots, and supplies nearby.", Store, "/landing-market.png"],
    ["Visit gardens", "Open other users' gardens, see their plants, listings, and community profile.", Sprout, "/landing-garden.png"],
    ["Community feed", "Ask questions, share harvests, and follow garden updates from other growers.", MessageCircle, "/landing-feed.png"],
    ["Rankings", "Discover top gardeners, track progress, and turn plant care into motivation.", Trophy, "/landing-rankings.png"],
    ["Safe selling model", "No upfront listing fee. GrowMate only earns a 10% fee after a successful sale.", ShieldCheck, "/landing-market.png"],
  ];

  const steps = [
    ["1", "Scan a plant", "Leafy AI identifies the plant and checks if it is safe to sell.", "/landing-market.png"],
    ["2", "Post or explore", "Sellers create verified listings while buyers browse nearby plants and supplies.", "/landing-market.png"],
    ["3", "Visit gardens", "Users can open public garden profiles and view plant collections, listings, and updates.", "/landing-garden.png"],
    ["4", "Climb rankings", "GrowMate rewards active gardeners with scores, badges, and local rankings.", "/landing-rankings.png"],
  ];

  return (
    <main className="gm-landing">
      <nav className="gm-landing-nav">
        <button className="gm-wordmark" onClick={openApp} type="button" aria-label="Open GrowMate prototype">
          <img src="/growmate-logo.png" alt="" />
          <span>GrowMate</span>
        </button>
        <div className="gm-nav-actions">
          <a href="/growmate.apk" download>
            <Download size={17} />
            Download APK
          </a>
          <a href="/growmate.apk" download>
            Open app
          </a>
        </div>
      </nav>

      <section className="gm-hero">
        <div className="gm-hero-copy">
          <span className="gm-kicker">
            <ShieldCheck size={16} />
            AI-powered plant marketplace
          </span>
          <h1>Buy, sell, and verify plants with GrowMate.</h1>
          <p>
            GrowMate helps plant lovers buy and sell trusted local listings, showcase gardens, and use Leafy AI to verify
            plants before selling.
          </p>
          <div className="gm-hero-actions">
            <a href="/growmate.apk" download>
              Launch GrowMate
              <ArrowRight size={18} />
            </a>
            <a href="/growmate.apk" download>
              <Download size={18} />
              Download APK
            </a>
          </div>
          <div className="gm-proof-row">
            {proofPoints.map(([value, label]) => (
              <article key={value}>
                <strong>{value}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="gm-hero-preview" aria-label="GrowMate prototype screenshots">
          <div className="gm-screen-stack gm-screen-stack-main">
            <img src="/landing-market.png" alt="GrowMate market screen" />
          </div>
          <div className="gm-screen-stack gm-screen-stack-side">
            <img src="/landing-garden.png" alt="GrowMate garden screen" />
          </div>
          <div className="gm-floating-note">
            <ShieldCheck size={18} />
            <span>AI checked before selling</span>
          </div>
        </div>
      </section>

      <section className="gm-section-heading">
        <span>Features</span>
          <h2>A marketplace that still feels like a plant community.</h2>
      </section>

      <section className="gm-feature-grid" aria-label="GrowMate features">
        {features.map(([title, body, Icon, image]) => (
          <article key={title}>
            <div className="gm-feature-icon">
              <Icon size={20} />
            </div>
            <h2>{title}</h2>
            <p>{body}</p>
            <img src={image} alt={`${title} app screen`} />
          </article>
        ))}
      </section>

      <section className="gm-how">
        <div className="gm-section-heading">
          <span>How it works</span>
          <h2>From plant photo to trusted marketplace listing.</h2>
        </div>
        <div className="gm-step-grid">
          {steps.map(([number, title, body, image]) => (
            <article key={title}>
              <div className="gm-step-copy">
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <img src={image} alt={`${title} GrowMate app screenshot`} />
            </article>
          ))}
        </div>
      </section>

      <section className="gm-demo-strip">
        <div>
          <span>Prototype ready</span>
          <h2>Ready to make plant selling safer and easier.</h2>
        </div>
        <a href="/growmate.apk" download>
          Launch GrowMate
          <Smartphone size={18} />
        </a>
      </section>
    </main>
  );
}

export default function App() {
  const initialMode = useMemo(() => {
    if (typeof window === "undefined") return "landing";
    const params = new URLSearchParams(window.location.search);
    if (isNativeApp() || window.location.pathname.startsWith("/app") || params.has("app")) return "app";
    return "landing";
  }, []);
  const [mode, setMode] = useState(initialMode);

  const openApp = () => {
    setMode("app");
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/app")) {
      window.history.pushState({}, "", "/app");
    }
  };

  if (mode === "app") return <ProductApp />;
  return <LandingPage openApp={openApp} />;
}
