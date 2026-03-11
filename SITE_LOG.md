# KGP Running — Site Development Log

Tracking all completed features and planned updates.
Status: ✅ Done | 🔄 In Progress | 📋 Planned

---

## ✅ Completed

### Foundation
- **Initial site build** — React + Vite + Tailwind CSS, 4 tabs: Home, Running Log, Race Calculator, Workout Types
- **Color scheme** — Black and red brand colors, custom font display
- **Vercel deployment** — Live at https://kgp-running.vercel.app
- **Supabase migration** — Moved from localStorage to Supabase Postgres database
- **Google + GitHub SSO** — Authentication via OAuth, multi-user support
- **Protected routes** — Running Log and Training Plan require sign-in
- **Vercel environment variables** — Connected to Supabase on live site

### Running Log
- **Run logging** — Date, distance, duration, workout type, heart rate, weather, notes
- **Shoe field** — Dropdown to tag runs to a shoe for mileage tracking
- **Filters + sorting** — Filter by workout type, date range; sort by date/distance/pace
- **Delete runs** — With guard so only owner can delete on Coach Log
- **PR auto-detection** — Automatically detects PRs for Mile, 5K, 10K, Half Marathon, Marathon when a run is logged
- **PR bug fixes** — Fixed distance label mismatch ('Mile' vs '1 Mile') and removed invalid `updated_at` column from upsert
- **Interval logging** — Checkbox toggle in run form to log rep count, rep distance (meters), and rest time for structured workouts
- **Edit run** — Pencil icon on each row opens a pre-filled modal to edit any existing run

### Race Calculator
- **VDOT formula** — Jack Daniels VDOT calculation from any race distance
- **Time ↔ Pace input** — Toggle between entering finish time or race pace
- **Fixed VDOT drift** — Switched to pure Daniels formula for equivalent race predictions (zero drift — 2:45 marathon returns 2:45 equivalent)
- **Equivalent race times** — Predicts times for 1500m, Mile, 3K, 5K, 10K, Half, Marathon
- **Training paces** — MP-anchored easy/recovery zones (Approach 5), threshold, interval, repetition
- **Load from log** — Pulls best effort from running log automatically

### Workout Types
- **Pfitzinger framework** — All workout types based on Advanced Marathoning (not Daniels)
- **8 workout types** — General Aerobic, Recovery, Long Run, Lactate Threshold, VO₂max Intervals, Speed/Economy, Tune-up Race (B Race), Key Race (A Race)
- **Personalized workouts** — Generated from VDOT derived from user's best logged race
- **MP-anchored paces** — Easy = MP+60-90s, Recovery = MP+90-150s per mile

### Home Page
- **Weekly mileage strip** — Mon–Sun current week with per-day mileage bubbles
- **8-week bar chart** — Visual history of weekly mileage with Y-axis and grid lines
- **Rolling 8-week average trend line** — Dashed line with dots showing smoothed training load; dots are proper circles
- **Last 30 days stats** — Total miles, total time, longest run, avg pace (fixed overflow on stat boxes)
- **Personal Records widget** — Displays PRs for standard distances
- **Active Shoes widget** — Shows live shoes with mileage progress bar (green → yellow at 400mi → red at 500mi)
- **Shoe Graveyard** — Tombstone cards for retired shoes showing name, dates, and miles
- **Upcoming Training widget** — Next run highlighted in black card + 7-day summary (runs, miles, workout type breakdown)

### Coach Log (Kyle's Log)
- **Public-facing page** — Visible to all visitors, shows Kyle's runs
- **Owner detection** — `VITE_OWNER_USER_ID` env var + `is_owner` DB flag
- **Owner vs visitor views** — Owner sees all runs + delete button; visitors see public runs only
- **About Me section** — Kyle's personal bio with marathon/half/10K PRs and site mission
- **Training Philosophy** — 6 pillars: Consistency, 80/20 Rule, Data-Informed, Recovery is Training, KGP Rule of Race Recovery, 10+1 Rule

### Shoe Tracking
- **Active shoes** — Add shoes with name and start date; mileage auto-calculated from tagged runs
- **Mileage warnings** — Yellow at 400mi, red at 500mi with "consider retiring" nudge
- **Retire shoe** — Confirm prompt, moves shoe to graveyard
- **Shoe Graveyard** — Tombstone UI with shoe name, date range (added → retired), total miles
- **Shoe field in run form** — Dropdown only shows active shoes; optional

### Training Plan
- **Dedicated page** — `/plan` route, protected (sign-in required)
- **Planned run form** — Date, distance, workout type, target pace, target race, notes
- **Interval/reps support** — Toggle to add reps: count, distance (meters), rest with quick-picks (60s/90s/2min/3min) + custom seconds input
- **Import from Workout Types** — Fills notes with the first template for the selected workout type
- **🎲 Surprise Me** — Generates a speed workout using VDOT from best logged race
- **Week grouping** — Runs displayed grouped by Mon–Sun week with total miles + type breakdown header
- **Mark as Done** — Opens pre-filled RunForm modal for user to edit actual distance/time before saving to running log (date, distance, workout type, notes pre-populated from planned run)
- **Delete planned run** — Removes from plan
- **Navbar link** — "Training Plan" added to nav

---

## 🔄 In Progress

---

## 📋 Planned

### Training Plan
- **Built-in plan templates** — Pre-built Pfitzinger-style 12/18-week marathon plans users can import into their training plan
- **Plan template picker** — Choose a goal race, goal time, and weekly mileage level; auto-populate the plan

### Cross-Page Sync Audit
- **Running Log ↔ Race Calculator** — Verify best effort loads correctly and VDOT is consistent
- **Running Log ↔ Workout Types** — Verify VDOT derived from log powers personalized workouts correctly
- **Running Log ↔ Training Plan** — Verify "Surprise Me" uses correct VDOT; verify "Mark as Done" saves to log and removes from plan
- **Training Plan ↔ Home Page** — Verify upcoming training widget stays in sync after add/delete/mark done

### Running Log Enhancements
- **Make public toggle** — Toggle individual runs as public so they appear on Coach Log for visitors (`is_public` already in DB schema)

### Home Page
- **Completed vs planned overlay** — Visual showing planned miles vs actual miles for the week

### Coach Log
- **Kyle's training plan** — Option to show Kyle's upcoming planned workouts on Coach Log (currently planned runs are private only)

### Future / Ideas
- **Public profiles** — Users opt in to make their log public (`is_public` on profiles already in schema)
- **Race history page** — Dedicated view of all races with PR progression over time
- **Strava integration** — Auto-import runs from Strava
- **Notification/reminder** — Email or push reminder for tomorrow's planned workout
