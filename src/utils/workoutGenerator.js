// Personalized workout generator based on Pfitzinger's Advanced Marathoning framework.
// Paces come from getTrainingPaces() which uses VDOT-derived marathon pace as the anchor.

import { getTrainingPaces } from './vdot.js'
import { secondsToTimeStr, pacePerMileToKm } from './paceCalc.js'
import { WORKOUT_TYPES } from '../data/workoutTypes.js'

function fmtMiKm(secsPerMile) {
  const secsPerKm = pacePerMileToKm(secsPerMile)
  return `${secondsToTimeStr(secsPerMile)}/mi (${secondsToTimeStr(secsPerKm)}/km)`
}

/**
 * Generate personalized workout examples for a given workout type.
 * @param {string} workoutTypeKey
 * @param {number|null} vdot
 * @returns {Array<{title, details, totalDist, notes}>}
 */
export function generateWorkouts(workoutTypeKey, vdot) {
  const type = WORKOUT_TYPES[workoutTypeKey]
  if (!type) return []

  // No VDOT — return generic templates from the static data
  if (!vdot) return type.workoutTemplates.map(t => ({ ...t, notes: 'Enter runs in your log to get personalized paces.' }))

  const paces = getTrainingPaces(vdot)

  switch (workoutTypeKey) {
    case 'easy':           return generateEasy(paces)
    case 'recovery':       return generateRecovery(paces)
    case 'long':           return generateLong(paces)
    case 'tempo':          return generateTempo(paces)
    case 'interval':       return generateInterval(paces)
    case 'repetition':     return generateRepetition(paces)
    case 'tuneup':         return generateTuneup(paces)
    case 'keyrace':        return generateKeyRace(paces)
    case 'generalspeed':   return generateGeneralSpeed(paces)
    default:               return type.workoutTemplates
  }
}

// ── General Aerobic ──────────────────────────────────────────────────────────
// Pfitzinger: 70–81% HRmax. The bulk of weekly mileage. No pace targets,
// but typically MP + 60–90 sec/mile.

function generateEasy(paces) {
  const loP = fmtMiKm(paces.easy.lo)
  const hiP = fmtMiKm(paces.easy.hi)
  return [
    {
      title: '45-min General Aerobic',
      details: `Conversational effort throughout. Target range: ${loP}–${hiP}. No pressure to hit the faster end.`,
      totalDist: '~5 miles',
      notes: 'Pfitzinger: general aerobic runs should feel controlled and comfortable from start to finish.',
    },
    {
      title: '60-min General Aerobic',
      details: `Steady easy effort at ${loP}–${hiP}. This is the bread-and-butter run that builds your aerobic foundation.`,
      totalDist: '~7 miles',
      notes: 'These runs accumulate into fitness. Do not shortchange them by running too fast.',
    },
    {
      title: 'General Aerobic + Strides',
      details: `50 min at ${hiP} (easy end), then 6 × 20-sec controlled acceleration strides on flat ground. Walk back full recovery between each.`,
      totalDist: '~6 miles',
      notes: 'Pfitzinger prescribes strides after easy runs to develop neuromuscular efficiency without adding fatigue.',
    },
  ]
}

// ── Recovery Run ─────────────────────────────────────────────────────────────
// Pfitzinger: below 76% HRmax. MP + 90–150 sec/mile. The day after a long run
// or hard workout. Short and very slow.

function generateRecovery(paces) {
  const loP = fmtMiKm(paces.recovery.lo)
  const hiP = fmtMiKm(paces.recovery.hi)
  return [
    {
      title: '30-min Recovery Jog',
      details: `Very easy effort at ${loP}–${hiP} or slower. If it feels too slow, it is probably the right pace.`,
      totalDist: '~3 miles',
      notes: 'Pfitzinger: run this the morning after your long run or hard workout. Active recovery accelerates adaptation.',
    },
    {
      title: '40-min Recovery + Mobility',
      details: `35 min at ${hiP}, finishing with 5 min of leg swings, high knees, and ankle circles. Keep effort very easy throughout.`,
      totalDist: '~4 miles',
      notes: 'If legs are still sore, go even slower or walk. The goal is movement, not mileage.',
    },
  ]
}

// ── Long Run ─────────────────────────────────────────────────────────────────
// Pfitzinger: 73–84% HRmax. The cornerstone of the program. Up to 22 miles.
// Final 25% optionally at marathon pace. Medium-long (13–17 mi) mid-week.

function generateLong(paces) {
  const gaPace  = fmtMiKm(paces.easy.hi)   // slower end of GA range
  const mpPace  = fmtMiKm(paces.marathon)
  const mlrPace = fmtMiKm(paces.easy.lo)   // slightly brisker for MLR
  return [
    {
      title: 'Steady Long Run',
      details: `Full run at ${gaPace}. Keep effort aerobic from start to finish. Do not let pace creep up in the final miles.`,
      totalDist: '17–22 miles',
      notes: 'Pfitzinger\'s primary long run. Start conservatively — the mileage itself is the workout.',
    },
    {
      title: 'Long Run with Fast Finish',
      details: `First 75% at ${gaPace}. Final 25% gradually build toward marathon pace (${mpPace}). Finish controlled, not racing.`,
      totalDist: '18–20 miles',
      notes: 'Pfitzinger uses this to teach your legs to run marathon pace on glycogen-depleted muscles.',
    },
    {
      title: 'Medium-Long Run (MLR)',
      details: `Pfitzinger\'s mid-week second long effort. Steady ${mlrPace}–${gaPace} throughout. Complements the Sunday long run.`,
      totalDist: '13–17 miles',
      notes: 'In Pfitzinger\'s 18-week plans, MLRs on Tuesday/Wednesday bridge the gap between long runs and build overall volume.',
    },
  ]
}

// ── Lactate Threshold ────────────────────────────────────────────────────────
// Pfitzinger: 82–92% HRmax. One-hour race pace. 25–30 sec/mile faster than MP.
// Preferred format: continuous 20–40 min or cruise intervals.

function generateTempo(paces) {
  const ltPace = fmtMiKm(paces.threshold)
  const gaPace = fmtMiKm(paces.easy.hi)
  return [
    {
      title: 'LT Continuous Run',
      details: `2-mile warm-up at ${gaPace}. 20–25 min at LT pace (${ltPace}). 2-mile cool-down at ${gaPace}.`,
      totalDist: '~7 miles',
      notes: 'Pfitzinger\'s standard LT session. "Comfortably hard" — you should be able to speak in short phrases.',
    },
    {
      title: 'Cruise Intervals',
      details: `2-mile warm-up at ${gaPace}. 3 × 10 min at LT pace (${ltPace}) with 2 min easy jog recovery between reps. 2-mile cool-down.`,
      totalDist: '~8 miles',
      notes: 'Pfitzinger prefers cruise intervals when building LT volume — they allow more total time at LT pace with less strain.',
    },
    {
      title: 'Extended LT Run',
      details: `2-mile warm-up at ${gaPace}. 30–40 min continuous at LT pace (${ltPace}). 2-mile cool-down.`,
      totalDist: '~9–10 miles',
      notes: 'Peak-phase LT session. Only attempt after a base of consistent LT training. Do not race this — hold steady pace.',
    },
  ]
}

// ── VO2max Intervals ──────────────────────────────────────────────────────────
// Pfitzinger: 95–100% VO2max ≈ 5K race pace. Equal work-to-recovery ratio.
// 5–6 reps of 600m–1200m. Used every 7–10 days, not weekly.

function generateInterval(paces) {
  const vPace  = fmtMiKm(paces.interval)
  const gaPace = fmtMiKm(paces.easy.hi)
  return [
    {
      title: '5 × 1000m',
      details: `Warm-up 2 mi at ${gaPace}. 5 × 1000m at VO₂max pace (${vPace}) with 600m jog recovery (~3 min). Cool-down 2 mi.`,
      totalDist: '~8 miles',
      notes: 'Pfitzinger\'s most prescribed VO₂max session. Each rep should feel very hard but controlled through the finish.',
    },
    {
      title: '6 × 600m',
      details: `Warm-up 2 mi at ${gaPace}. 6 × 600m at ${vPace} with 400m jog recovery. Cool-down 2 mi.`,
      totalDist: '~7 miles',
      notes: 'Shorter reps — good when introducing VO₂max work or returning from a down week. Pfitzinger uses this early in the training block.',
    },
    {
      title: '3 × 1600m',
      details: `Warm-up 2 mi at ${gaPace}. 3 × 1600m at 5K–10K effort (${vPace}) with 800m jog recovery. Cool-down 2 mi.`,
      totalDist: '~8 miles',
      notes: 'Longer reps for experienced runners. Pfitzinger uses these later in the peak phase — demanding, but highly effective.',
    },
  ]
}

// ── Speed / Economy ───────────────────────────────────────────────────────────
// Pfitzinger: "speed training" — mile pace or faster, short reps, full rest.
// Improves running economy. Used sparingly, never before a long run.

function generateRepetition(paces) {
  const rPace  = fmtMiKm(paces.repetition)
  const gaPace = fmtMiKm(paces.easy.hi)
  return [
    {
      title: '10 × 100m Strides',
      details: `After a 40-min general aerobic run at ${gaPace}: 10 × 100m controlled acceleration strides on flat ground. Gradual build to fast pace, not a sprint. Walk back full recovery.`,
      totalDist: '~5–6 miles total',
      notes: 'Pfitzinger\'s most accessible speed work. Develops neuromuscular efficiency without meaningful fatigue cost.',
    },
    {
      title: '8 × 200m',
      details: `Warm-up 2 mi at ${gaPace}. 8 × 200m at mile race pace (${rPace}) with full walk recovery (200m or ~90 sec standing). Cool-down 2 mi.`,
      totalDist: '~5 miles',
      notes: 'Each rep should feel the same as the first. If you\'re slowing down, the recovery is too short.',
    },
    {
      title: '6 × 400m',
      details: `Warm-up 2 mi at ${gaPace}. 6 × 400m at mile pace (${rPace}) with 3-min standing/walking recovery between reps. Cool-down 2 mi.`,
      totalDist: '~6 miles',
      notes: 'Pfitzinger: full recovery is non-negotiable here. These are not intervals — they are speed reps. Form over fitness.',
    },
  ]
}

// ── Tune-up Race (B Race) ─────────────────────────────────────────────────────
// Pfitzinger: run as a workout, not for a PR. Half marathon 4–6 weeks out
// is the gold standard tune-up for marathoners. Reduce mileage 3–4 days before,
// but no full taper.

function generateTuneup(paces) {
  const vPace  = fmtMiKm(paces.interval)
  const ltPace = fmtMiKm(paces.threshold)
  const mpPace = fmtMiKm(paces.marathon)
  const gaPace = fmtMiKm(paces.easy.hi)
  return [
    {
      title: '5K Tune-up Race',
      details: `Warm-up: 20 min easy at ${gaPace} + 4–6 strides. Race 5K targeting VO₂max effort (${vPace}). 1–2 mi easy cool-down.`,
      totalDist: '~5–6 miles total',
      notes: 'Pfitzinger: don\'t taper for 5K tune-ups. Treat it as a hard workout in a race environment.',
    },
    {
      title: '10K Tune-up Race',
      details: `Warm-up: 15 min easy at ${gaPace} + 4 strides. Race 10K at LT-to-VO₂max effort (${ltPace}–${vPace}). 1 mi easy cool-down.`,
      totalDist: '~8–9 miles total',
      notes: 'A good test of lactate threshold fitness. Run even splits — start at the conservative end of your effort.',
    },
    {
      title: 'Half Marathon Tune-up',
      details: `Warm-up: 10 min easy walk/jog. Race half marathon at approximately marathon pace + 10–15 sec/mile (${mpPace}). This tests your marathon fitness without the full recovery demand.`,
      totalDist: '~14–15 miles total',
      notes: 'Pfitzinger\'s preferred marathon tune-up: a half marathon 4–6 weeks before your goal race. Do not race all-out — run controlled and assess.',
    },
  ]
}

// ── Key Race (A Race) ─────────────────────────────────────────────────────────
// Pfitzinger: full taper, even pacing, trust the training.
// Taper: -30% wk 3, -50% wk 2, -65% race week. Maintain some intensity.

function generateKeyRace(paces) {
  const mpPace  = fmtMiKm(paces.marathon)
  const ltPace  = fmtMiKm(paces.threshold)
  const gaPace  = fmtMiKm(paces.easy.hi)
  const recPace = fmtMiKm(paces.recovery.hi)
  return [
    {
      title: 'Taper Week Shakeout',
      details: `2 days before race: 20–25 min very easy at ${recPace} + 6–8 × 20-sec strides. Nothing hard. Just stay loose.`,
      totalDist: '~3 miles',
      notes: 'Pfitzinger: the hay is in the barn. No fitness gains happen this week — the goal is freshness.',
    },
    {
      title: 'Race Day Warm-up (5K/10K)',
      details: `20 min easy jog at ${gaPace} + dynamic drills (leg swings, high knees) + 4–6 × 20-sec strides. Finish 8–10 min before the gun.`,
      totalDist: '~2 miles',
      notes: 'Shorter races require thorough warm-ups — you\'ll be at VO₂max effort from the first mile.',
    },
    {
      title: 'Race Day (Half/Full Marathon)',
      details: `10–15 min easy walk/jog + light stretching only. Line up and run mile 1 at goal pace (${mpPace}) or 5 sec/mile slower. Do not deviate.`,
      totalDist: 'Your race distance',
      notes: 'Pfitzinger: the warm-up for a marathon is the first 3 miles of the race itself. Starting easy IS the warm-up.',
    },
    {
      title: 'Marathon Pacing Plan',
      details: `Miles 1–3: goal pace (${mpPace}) or 5 sec/mile slower. Miles 4–20: locked-in goal pace (${mpPace}). Mile 20–finish: compete on feel. For half: ${ltPace} effort, even splits.`,
      totalDist: '26.2 miles',
      notes: 'Pfitzinger: a negative split of 1–2 minutes in the second half is the mark of a well-executed marathon. Patience in the first half wins the race.',
    },
  ]
}

// ── General Speed ──────────────────────────────────────────────────────────────
// Unstructured speed work: fartlek, hill repeats, surges. By feel, not by pace.

function generateGeneralSpeed(paces) {
  const gaPace  = fmtMiKm(paces.easy.hi)
  const ltPace  = fmtMiKm(paces.threshold)
  const rPace   = fmtMiKm(paces.repetition)
  return [
    {
      title: 'Classic Fartlek',
      details: `Start with 5 min easy at ${gaPace}. For 20–30 min, freely surge between ${gaPace} (easy) and ${ltPace} (threshold) based on feel — a lamppost, a hill, a song on your playlist. No watch pressure. Cool down 5 min easy.`,
      totalDist: '~5–7 miles',
      notes: 'No pace targets — run the surges by effort. If you\'re checking your watch constantly, you\'re missing the point of fartlek.',
    },
    {
      title: 'Hill Burst Session',
      details: `Warm up 20 min at ${gaPace}. Find a moderate hill. Run 8–12 × 20-sec hard uphill bursts at near-sprint effort (faster than ${rPace} feel). Walk back down as full recovery between each. Cool down 10 min easy.`,
      totalDist: '~4–5 miles',
      notes: 'Hills build power and running economy simultaneously. The walk-back recovery keeps quality high on every rep.',
    },
    {
      title: 'Surge Run',
      details: `10 min easy at ${gaPace}. Then 5–6 rounds of: 3 min at half marathon effort (${ltPace}) / 2 min easy at ${gaPace}. Finish with 5 min easy cool-down.`,
      totalDist: '~6–7 miles',
      notes: 'The surges teach your body to shift gears mid-run — a skill that pays off in the late miles of any race.',
    },
    {
      title: 'Acceleration Ladder',
      details: `Warm up 15 min at ${gaPace}. On a flat stretch, run: 100m build to ${rPace} / jog 200m / 200m build to ${rPace} / jog 200m / 400m build to ${rPace} / jog 400m / 200m build / 100m build. Cool down 10 min easy.`,
      totalDist: '~4–5 miles',
      notes: 'Each acceleration should peak at full speed feel — controlled but fast. A great session for developing top-end turnover without a track.',
    },
  ]
}
