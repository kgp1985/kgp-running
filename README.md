# KGP Running

Personal running website built with React + Vite + Tailwind CSS.

## Setup

### Prerequisites
Install Node.js (v18+) from https://nodejs.org

### Install & Run

```bash
cd kgp-running
npm install
npm run dev
```

Open http://localhost:5173

### Build for production

```bash
npm run build
npm run preview
```

## Customizing

- **Bio & philosophy**: Edit `src/features/home/Bio.jsx` and `src/features/home/TrainingPhilosophy.jsx`
- **Personal Records**: Logged automatically when you add runs near standard distances (5K, 10K, HM, Marathon)
- **Data**: All stored in browser localStorage — no account or backend needed

## Structure

```
src/
  pages/          # 4 main pages (Home, RunningLog, RaceCalculator, WorkoutTypes)
  features/       # Page-specific components
  hooks/          # useRunningLog, usePersonalRecords, useLocalStorage
  utils/          # VDOT math, pace conversions, formatters
  data/           # Static data (VDOT table, workout types, race distances)
  constants/      # Routes, localStorage keys
```
