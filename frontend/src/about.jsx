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
              A local-first assistant that combines image understanding with natural language,
              so you can ask questions about photos, screenshots, and slides in a structured way.
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
                Upload an image, pick a mode, and get a response tailored to your intent. General
                mode gives a concise description, Safety mode focuses on hazards and PPE, and Slide
                Summary mode produces a structured outline for presentations.
              </p>
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">How it works</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                The frontend sends the image and question to a FastAPI backend. The backend validates
                inputs, keeps session history, and routes the request to a local Ollama model. Responses
                are returned with latency and token metadata for transparency.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Tech stack</h2>
              <ul className="text-slate-300 text-sm space-y-2">
                <li>- Frontend: React, Vite, Tailwind CSS, Framer Motion</li>
                <li>- Backend: FastAPI, Pydantic, httpx, Pillow</li>
                <li>- Model runtime: Ollama (local vision models)</li>
                <li>- Optional: Redis for session storage</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Structured modes</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Mode-specific prompts are reinforced with server-side formatting. If a model returns
                unstructured text, the backend post-processes it into the required sections for Safety
                and Slide Summary. This keeps the output consistent even when models are noisy.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-panel p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Why local-first</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Running locally keeps your images on your machine, reduces dependency on external APIs,
            and gives you control over model choice, performance, and privacy.
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
