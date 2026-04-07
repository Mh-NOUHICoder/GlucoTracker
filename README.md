# GlucoTrack AI 🩸✨

**GlucoTrack AI** is a modern, production-ready Progressive Web App (PWA) designed for seamless and intelligent diabetes tracking. By leveraging AI and seamless image recognition, it eliminates the friction of manual data entry, providing actionable insights in an elegant, responsive environment.

---

## 🌟 Features

- **Live WebRTC Camera Integration**: Instantly capture readings directly from your meter with a built-in cross-platform web camera, featuring live animated viewfinder.
- **AI-Powered Image Recognition (Upcoming)**: Upload or snap a picture of your glucose meter, and let AI precisely extract the numerical reading.
- **Medical Dark Theme UI**: A refined, premium user interface utilizing a calming dark medical palette (midnight black, deep blue, and neon cyan accents).
- **Smooth Animations**: High-fidelity micro-interactions and route transitions powered by **Framer Motion**.
- **Interactive Dashboard**: Track your glucose trends, view metrics (averages, in-target ranges), and analyze historical data seamlessly.
- **PWA Ready**: Enjoy a native app-like experience designed strictly with a mobile-first philosophy.

---

## 🛠 Tech Stack

- **Framework**: [Next.js (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📁 Directory Structure

The repository maintains a clean, scalable folder architecture:

```text
src/
├── app/                  # Next.js App Router root
│   ├── auth/             # Sign-in & Sign-up routes
│   ├── dashboard/        # Main glucose trends and metrics view
│   ├── history/          # Historical readings log
│   ├── upload/           # Live Camera & Image capture screen
│   ├── layout.tsx        # Global HTML shell & CSS import
│   ├── page.tsx          # Landing page (Hero section)
│   └── globals.css       # Tailwind v4 configuration & Theme variables
├── components/           # Reusable UI elements
│   ├── Layout.tsx        # Global layout wrapper
│   ├── Navbar.tsx        # Responsive top navigation with animated link states
│   └── UploadButton.tsx  # Advanced WebRTC Camera and Fallback Upload logic
├── hooks/                # Custom React Hooks
├── lib/                  # Utility functions and shared instances
└── types/                # Strict TypeScript definitions
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `^20` or higher
- npm (Node Package Manager)

### Installation

1. **Clone the repository (if applicable) and navigate to the project directory:**
   ```bash
   cd glucotrack
   ```

2. **Install the dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **View the Application:**
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

---

## 🎨 Theme Configuration

We are using **Tailwind CSS v4** with native CSS variables for extreme flexibility. The core colors are managed inside `src/app/globals.css`:
- `--color-medical-black`: `#050a0f`
- `--color-medical-dark`: `#0a111a`
- `--color-medical-blue`: `#1e3a8a`
- `--color-medical-cyan`: `#06b6d4`
- `--color-medical-accent`: `#22d3ee`

---

## 📄 License

This project is licensed under the MIT License.
