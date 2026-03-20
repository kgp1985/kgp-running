/**
 * RunPostCard — rich post card for the community feed.
 *
 * Props:
 *   run         — camelCase run object (from communityApi)
 *   prs         — this runner's PR map: { 'Marathon': { time, date }, ... }
 *   shoeName    — resolved shoe name or null
 *   currentVdot — runner's current VDOT or null (for ⚡ VDOT signal)
 *   reactions   — array of reaction objects for this run
 *   comments    — array of comment objects for this run
 *   currentUserId — logged-in user's ID
 *   onReact     — callback(runId, reaction) to handle reaction upsert
 *   onDeleteComment — callback(commentId) to handle comment deletion
 *   onAddComment — callback(runId, body) to handle comment addition
 */
import { useState, useEffect, useRef } from 'react'
import { generateRunTitle } from '../../utils/runTitle.js'
import { getCelebrations, formatPRLine } from '../../utils/runCelebrations.js'
import { secondsToTimeStr } from '../../utils/paceCalc.js'
import { getComments, addComment, deleteComment } from '../../api/commentsApi.js'

// ── Workout type color map (subset — matches workoutTypes.js) ─────────────────
const TYPE_COLORS = {
  easy:       { dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50'  },
  recovery:   { dot: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50'   },
  long:       { dot: 'bg-teal-500',   text: 'text-teal-700',   bg: 'bg-teal-50'   },
  tempo:      { dot: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  interval:   { dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
  repetition: { dot: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50'    },
  tuneup:     { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
  keyrace:    { dot: 'bg-pink-500',   text: 'text-pink-700',   bg: 'bg-pink-50'   },
}

const TYPE_LABELS = {
  easy:       'General Aerobic',
  recovery:   'Recovery',
  long:       'Long Run',
  tempo:      'Lactate Threshold',
  interval:   'VO₂max Intervals',
  repetition: 'Speed / Economy',
  tuneup:     'Tune-up Race',
  keyrace:    'Key Race',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPace(run) {
  if (!run.distance || !run.duration) return null
  const paceSecPerMile = run.duration / run.distance
  const mins = Math.floor(paceSecPerMile / 60)
  const secs = Math.round(paceSecPerMile % 60)
  return `${mins}:${String(secs).padStart(2, '0')} /mi`
}

function fmtDist(miles) {
  return miles % 1 === 0 ? `${miles} mi` : `${miles.toFixed(2)} mi`
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(secs) {
  return secondsToTimeStr(secs, secs >= 3600)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RunPostCard({
  run,
  prs = {},
  shoeName = null,
  currentVdot = null,
  reactions = [],
  comments: initialComments = [],
  currentUserId = null,
  onReact = null,
  onDeleteComment = null,
  onAddComment = null,
}) {
  const colors    = TYPE_COLORS[run.workoutType] ?? TYPE_COLORS.easy
  const typeLabel = TYPE_LABELS[run.workoutType]  ?? 'Run'
  const title     = generateRunTitle(run)
  const pace      = fmtPace(run)
  const prLine    = formatPRLine(prs)
  const badges    = getCelebrations(run, prs, currentVdot)

  // Local comment state
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState(initialComments)
  const [commentInput, setCommentInput] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const hasFetchedRef = useRef(false)

  // Load comments on first expand (lazy load — fetch once, track with ref to avoid loop)
  useEffect(() => {
    if (showComments && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      setLoadingComments(true)
      // Safety timeout: if Supabase hangs (e.g. table missing), clear loading after 6s
      const timeout = setTimeout(() => setLoadingComments(false), 6000)
      getComments(run.id)
        .then(setComments)
        .catch(() => setComments([]))
        .finally(() => { clearTimeout(timeout); setLoadingComments(false) })
    }
  }, [showComments, run.id])

  // Reaction counts
  const myReaction = reactions.find(r => r.user_id === currentUserId)?.reaction ?? null
  const hareCount = reactions.filter(r => r.reaction === 'hare').length
  const turtleCount = reactions.filter(r => r.reaction === 'turtle').length
  const commentCount = comments.length

  // Handlers
  const handleReact = async (reaction) => {
    if (!currentUserId || !onReact) return
    try {
      await onReact(run.id, reaction)
    } catch (err) {
      console.error('Failed to react:', err)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentInput.trim() || !currentUserId || !onAddComment) return
    const body = commentInput.trim()
    setCommentInput('')
    try {
      const newComment = await onAddComment(run.id, body)
      setComments(prev => [...prev, newComment])
    } catch (err) {
      console.error('Failed to add comment:', err)
      setCommentInput(body) // restore on error
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!onDeleteComment) return
    try {
      await onDeleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  return (
    <article className="card hover:shadow-md transition-shadow duration-150">

      {/* ── Header: runner name + date ── */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar circle */}
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-red-400">
              {(run.displayName || 'A')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{run.displayName}</p>
            {prLine ? (
              <p className="text-[10px] text-gray-400 truncate" title={prLine}>{prLine}</p>
            ) : (
              <p className="text-[10px] text-gray-400">Runner</p>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 shrink-0 mt-0.5">{fmtDate(run.date)}</span>
      </div>

      {/* ── Workout type pill + title ── */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          {typeLabel}
        </span>
      </div>

      <h3 className="text-base font-bold text-gray-900 mb-1 leading-snug">{title}</h3>

      {/* ── Optional subtitle ── */}
      {run.subtitle && (
        <p className="text-sm text-gray-600 italic mb-2 leading-relaxed">&ldquo;{run.subtitle}&rdquo;</p>
      )}

      {/* ── Stats row ── */}
      <div className="flex items-center gap-4 flex-wrap mt-2 mb-3">
        <StatPill label="Distance" value={fmtDist(run.distance)} />
        <StatPill label="Time"     value={fmtTime(run.duration)} />
        {pace && <StatPill label="Pace" value={pace} />}
        {run.heartRate && <StatPill label="Avg HR" value={`${run.heartRate} bpm`} />}
      </div>

      {/* ── Interval details ── */}
      {run.repsCount && run.repDistanceMeters && (
        <div className={`rounded-lg px-3 py-2 mb-3 text-xs ${colors.bg} ${colors.text}`}>
          <span className="font-semibold">{run.repsCount} × {run.repDistanceMeters}m</span>
          {run.restSeconds && (
            <span className="text-gray-500 ml-1">
              · {run.restSeconds < 60
                  ? `${run.restSeconds}s rest`
                  : run.restSeconds % 60 === 0
                    ? `${run.restSeconds / 60}min rest`
                    : `${run.restSeconds}s rest`}
            </span>
          )}
        </div>
      )}

      {/* ── Celebration badges ── */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {badges.slice(0, 3).map((b, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${b.color}`}
            >
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Footer: shoe + weather ── */}
      {(shoeName || run.weather) && (
        <div className="flex items-center gap-3 text-[11px] text-gray-400 border-t border-gray-100 pt-2 mt-1 flex-wrap">
          {shoeName && (
            <span className="flex items-center gap-1">
              <span>👟</span> {shoeName}
            </span>
          )}
          {run.weather && (
            <span className="flex items-center gap-1">
              <span>🌤</span> {run.weather}
            </span>
          )}
        </div>
      )}

      {/* ── Notes ── */}
      {run.notes && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed border-t border-gray-100 pt-2">
          {run.notes}
        </p>
      )}

      {/* ── Reaction row ── */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => handleReact('hare')}
          className={`flex items-center gap-1 text-sm px-2 py-1 rounded-lg transition-colors ${myReaction === 'hare' ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
          title={currentUserId ? 'Strong effort' : 'Sign in to react'}
          disabled={!currentUserId}
        >
          🐇 <span>{hareCount}</span>
        </button>
        <button
          onClick={() => handleReact('turtle')}
          className={`flex items-center gap-1 text-sm px-2 py-1 rounded-lg transition-colors ${myReaction === 'turtle' ? 'bg-green-50 text-green-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
          title={currentUserId ? 'Steady pace' : 'Sign in to react'}
          disabled={!currentUserId}
        >
          🐢 <span>{turtleCount}</span>
        </button>
        <button
          onClick={() => setShowComments(c => !c)}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600"
        >
          💬 {commentCount} {showComments ? '▲' : '▼'}
        </button>
      </div>

      {/* ── Comments section (collapsible) ── */}
      {showComments && (
        <div className="mt-3 space-y-2">
          {loadingComments ? (
            <p className="text-xs text-gray-400">Loading comments…</p>
          ) : (
            <>
              {comments.map(c => (
                <div key={c.id} className="flex gap-2 text-sm items-start">
                  <span className="font-medium text-gray-700 shrink-0">{c.profiles?.display_name || 'Runner'}</span>
                  <span className="text-gray-600 flex-1">{c.body}</span>
                  {c.user_id === currentUserId && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="ml-auto text-gray-300 hover:text-red-400 text-xs shrink-0"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {currentUserId && (
                <form onSubmit={handleAddComment} className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                  <input
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim()}
                    className="text-sm font-medium text-black px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
                  >
                    Post
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </article>
  )
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function StatPill({ label, value }) {
  return (
    <div className="flex flex-col leading-none">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
      <span className="text-sm font-bold text-gray-900 mt-0.5">{value}</span>
    </div>
  )
}
