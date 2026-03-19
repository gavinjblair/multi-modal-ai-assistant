import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";

const AboutPage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-mesh-gradient animate-floaty opacity-90" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/30 pointer-events-none" />
      <div className="relative max-w-5xl mx-auto px-4 py-10 space-y-6">
        <header className="glass-panel px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="uppercase tracking-[0.2em] text-xs text-sky-200">About</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              Multi-Modal Vision-Language Assistant
            </h1>
            <p className="text-slate-300 text-sm md:text-base">
              A Vercel-hosted frontend paired with a Cloudflare Worker API, served behind a single
              custom domain for a simple text-first question flow.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Back to app
          </a>
        </header>

        <section className="glass-panel p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">What it does</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                The current deployed experience accepts text questions and sends them to a lightweight
                `/api/ask` endpoint. Some multimodal UI elements remain visible from the broader
                prototype while the hosted API stays intentionally simple.
              </p>
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">How it works</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                The React frontend is served from Vercel at the root domain. Requests to
                `/api/ask` are routed separately to a Cloudflare Worker, which handles the API path
                without replacing the homepage.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Tech stack</h2>
              <ul className="text-slate-300 text-sm space-y-2">
                <li>- Frontend: React, Vite, Tailwind CSS, Framer Motion</li>
                <li>- Hosting: Vercel for the frontend, Cloudflare for DNS and Worker routing</li>
                <li>- API: Cloudflare Worker on `/api/*` with a JSON `question` payload</li>
                <li>- Legacy prototype: FastAPI backend retained in the repo for reference</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Current status</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                The interface still carries some controls from the broader multimodal concept, but
                the deployed API contract is currently limited to:
                <br />
                <span className="font-mono text-sky-200">{'{ "question": string }'}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="glass-panel p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Deployment shape</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            The intended end state is a single public domain: the homepage is served by Vercel and
            only `/api/*` is handled by the Worker. That keeps the frontend and API neatly separated
            while still feeling like one application.
          </p>
        </section>

        <footer className="text-sm text-slate-400 px-2">
          Built for the multimodal assistant demo.
        </footer>
      </div>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <AboutPage />
  </React.StrictMode>,
);
