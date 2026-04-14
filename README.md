<div align="center">
  <img src="./public/glucotracker.png" alt="GlucoTrack Logo" width="120" height="120" />
  <h1>GlucoTrack</h1>
  <p><strong>Intelligent Diabetes Monitoring & Clinical Analytics</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  </p>

  <h4>A high-performance Progressive Web App (PWA) built for seamless medical tracking, professional reporting, and AI-driven insights.</h4>
</div>

---

## 💎 Project Overview

**GlucoTrack** is a state-of-the-art health platform designed to simplify the daily management of diabetes. Developed with a **mobile-first** philosophy, it combines a premium **medical-dark aesthetic** with advanced clinical tools to provide users and healthcare providers with a comprehensive overview of metabolic health.

### 🚀 Key Value Propositions
- **Frictionless Logging**: Rapid data entry and AI-enhanced recognition to reduce the burden of manual tracking.
- **Smart PWA Installation**: Revolutionary one-click installation on Desktop/Android and an intelligent fallback guide for iOS/Safari users.
- **Clinical-Grade Reporting**: High-fidelity PDF generation with professional metrics like Estimated A1C and Time in Range (TIR).
- **Universal Localization**: Full multi-language support (English, French, Arabic) with native RTL layout implementation.
- **Premium Cyber-Medical UI**: Butter-smooth micro-animations, glassmorphism, shimmering beam effects, and a tailored "Cyber-Dark" design system.

---

## ✨ Featured Capabilities

### 🗠 Professional Dashboard
- **Metabolic Trends**: Interactive charts showing glucose fluctuations over time.
- **Time in Range (TIR)**: Visual donut charts displaying the percentage of time spent within target zones.
- **AI Analysis Engine**: Instant calculation of Average Glucose, Estimated A1C, and variability markers using high-performance AI models.

### 📄 Advanced PDF Exports
- **Internationalized Reporting**: Seamlessly switch between English, French, and Arabic (RTL) in clinical reports.
- **Medical Snapshots**: Includes detailed history tables, trend highlights, and target zone analysis ready for physician review.

### 📸 AI & Image Integration
- **Intelligent Extraction**: Extract numerical data from glucose meter photos automatically using advanced visual LLMs.
- **Live Viewfinder**: Integrated WebRTC camera featuring a professional medical-style viewfinder for instant capture.

### 📱 PWA & Offline Freedom
- **Offline Logging**: Powered by **Dexie.js (IndexedDB)**, allowing you to log glucose readings anytime—even with zero connectivity.
- **Auto-Sync Engine**: Background synchronization automatically pushes clinical data to the cloud once a network connection is restored.
- **Richer Install UI**: Branded "App Store" experience during installation with high-fidelity screenshots and descriptive walkthroughs.
- **Native Experience**: Zero-friction integration on iOS, Android, and Windows with 60fps animations.

---

## 🛠 Modern Tech Architecture

- **Frontend**: [Next.js 16 (App Router)](https://nextjs.org/) with React 19.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) using a custom CSS-variable-based medical theme.
- **Authentication**: [Clerk](https://clerk.com/) with enterprise-grade security and custom dark-themed components.
- **Animations**: [Framer Motion](https://framer.com/motion) for high-performance UI transitions and shimmering effects.
- **Offline DB**: [Dexie.js](https://dexie.org/) for robust IndexedDB persistence and smart synchronization.
- **PWA Core**: Powered by `@ducanh2912/next-pwa` for robust service worker orchestration.

---

## 📂 Directory Roadmap

```text
src/
├── app/                  # Application Logic (App Router)
│   ├── api/              # AI Insights & Recognition Endpoints
│   ├── manifest.ts       # Richer Install UI Manifest Configuration
│   ├── dashboard/        # Clinical Analytics & Metrics
│   └── globals.css       # Tailwind v4 & Medical Design System
├── components/           # Modular & Atomic UI Components
│   ├── PWAInstallButton  # Smart One-Click / Manual Guide Installer
│   ├── InitialLoader.tsx # Premium Splash Screen Orchestrator
│   └── Layout.tsx        # Global Glassmorphism Wrapper
├── lib/                  # Framework Agnostic Logic (i18n, db clients)
├── hooks/                # Specialized State Management
└── types/                # Robust Domain-Driven Type Definitions
```

---

## 🎨 Design Language: "Cyber-Medical"

GlucoTrack utilizes a curated professional palette designed for clinical precision:
- **Liquid Shimmer**: Dynamic light beam animations on primary CTAs.
- **Frosted Glass**: High-index `backdrop-blur` for sophisticated depth.
- **Holographic Shadows**: Layered cyan glows for interactive feedback.
- **Typography**: Ultra-bold tracking-widest headers for a futuristic medical feel.

---

## 🚀 Deployment & Installation

### Requirements
- Node.js `^20`
- API Keys for Clerk, Supabase, and Gemini AI.

### Local Development
1. **Clone & Install**:
   ```bash
   git clone [repository-url]
   cd glucotrack
   npm install
   ```

2. **Environment Configuration**: Set up `.env.local` with your provider keys.

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

4. **Progressive Web App**: To test PWA features locally, ensure the PWA is enabled in `next.config.ts`.
ration**: Create a `.env.local` based on the project's requirements.

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

---

## 🛡 License & Privacy

This project is licensed under the MIT License. GlucoTrack is built with privacy-first principles, leveraging Supabase Row-Level Security (RLS) to ensure user data remains strictly isolated and secure.

---
<div align="center">
  <p><i>Empowering metabolic health through intelligent design.</i></p>
</div>
