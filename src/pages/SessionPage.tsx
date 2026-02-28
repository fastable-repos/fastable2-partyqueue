import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, saveSession, getUser, sortQueue } from '../utils/storage'
import type { Session, Song, VoteType, Toast } from '../types'
import NowPlayingBanner from '../components/NowPlayingBanner'
import SongCard from '../components/SongCard'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function SessionPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [currentUser, setCurrentUser] = useState<{ name: string; isHost: boolean } | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [historyOpen, setHistoryOpen] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Add song form
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [addError, setAddError] = useState('')

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = generateId()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  useEffect(() => {
    if (!code) {
      navigate('/')
      return
    }
    try {
      const s = getSession(code)
      if (!s) {
        navigate('/')
        return
      }
      setSession(s)

      const u = getUser()
      if (!u || u.sessionCode !== code) {
        // User not registered for this session — redirect to home
        navigate('/')
        return
      }
      setCurrentUser({ name: u.name, isHost: u.isHost })
    } catch (err) {
      console.error('Failed to load session:', err)
      navigate('/')
    }
  }, [code, navigate])

  function persistSession(updated: Session) {
    if (!code) return
    const sorted = { ...updated, queue: sortQueue(updated.queue) }
    saveSession(code, sorted)
    setSession(sorted)
  }

  function handleAddSong(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')

    if (!session || !currentUser) return

    if (!songTitle.trim()) {
      setAddError('Please enter a song title.')
      return
    }
    if (!songArtist.trim()) {
      setAddError('Please enter an artist name.')
      return
    }

    try {
      const newSong: Song = {
        id: generateId(),
        title: songTitle.trim(),
        artist: songArtist.trim(),
        submittedBy: currentUser.name,
        submittedAt: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        netScore: 0,
        voters: {},
      }
      const updated: Session = {
        ...session,
        queue: sortQueue([...session.queue, newSong]),
      }
      persistSession(updated)
      setSongTitle('')
      setSongArtist('')
      addToast(`"${newSong.title}" added to the queue!`, 'success')
    } catch (err) {
      console.error('Failed to add song:', err)
      setAddError('Failed to add song. Please try again.')
    }
  }

  function handleVote(songId: string, vote: VoteType) {
    if (!session || !currentUser) return

    try {
      const songIndex = session.queue.findIndex((s) => s.id === songId)
      if (songIndex === -1) return

      const song = session.queue[songIndex]
      const existingVote = song.voters[currentUser.name] ?? null

      let newUpvotes = song.upvotes
      let newDownvotes = song.downvotes
      const newVoters = { ...song.voters }

      if (existingVote === vote) {
        // Already voted the same way — show toast, no change
        addToast('You already voted that way!', 'info')
        return
      }

      if (existingVote === 'up') {
        newUpvotes -= 1
      } else if (existingVote === 'down') {
        newDownvotes -= 1
      }

      if (vote === 'up') {
        newUpvotes += 1
      } else {
        newDownvotes += 1
      }

      newVoters[currentUser.name] = vote

      const updatedSong: Song = {
        ...song,
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        netScore: newUpvotes - newDownvotes,
        voters: newVoters,
      }

      const newQueue = session.queue.map((s) => (s.id === songId ? updatedSong : s))
      persistSession({ ...session, queue: sortQueue(newQueue) })
    } catch (err) {
      console.error('Failed to vote:', err)
      addToast('Failed to register vote.', 'error')
    }
  }

  function handleRemoveSong(songId: string) {
    if (!session || !currentUser?.isHost) return

    try {
      const updated: Session = {
        ...session,
        queue: session.queue.filter((s) => s.id !== songId),
      }
      persistSession(updated)
      addToast('Song removed from queue.', 'info')
    } catch (err) {
      console.error('Failed to remove song:', err)
      addToast('Failed to remove song.', 'error')
    }
  }

  function handlePlayNext() {
    if (!session || session.queue.length === 0) return

    try {
      const sorted = sortQueue(session.queue)
      const [nextSong, ...rest] = sorted

      const updated: Session = {
        ...session,
        nowPlaying: nextSong,
        queue: rest,
        history: session.nowPlaying
          ? [session.nowPlaying, ...session.history]
          : session.history,
      }
      persistSession(updated)
      addToast(`Now playing: "${nextSong.title}"`, 'success')
    } catch (err) {
      console.error('Failed to play next:', err)
      addToast('Failed to advance queue.', 'error')
    }
  }

  function handleClearQueue() {
    if (!session || !currentUser?.isHost) return

    try {
      const updated: Session = {
        ...session,
        queue: [],
      }
      persistSession(updated)
      setShowClearConfirm(false)
      addToast('Queue cleared.', 'info')
    } catch (err) {
      console.error('Failed to clear queue:', err)
      addToast('Failed to clear queue.', 'error')
    }
  }

  function copyCode() {
    if (!code) return
    try {
      navigator.clipboard.writeText(code).then(() => {
        addToast('Session code copied!', 'success')
      }).catch(() => {
        addToast('Copy not supported — code is: ' + code, 'info')
      })
    } catch {
      addToast('Copy not supported — code is: ' + code, 'info')
    }
  }

  if (!session || !currentUser) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0F0F1A' }}
      >
        <div className="text-gray-400">Loading session...</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#0F0F1A', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3"
        style={{
          background: 'rgba(15,15,26,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">🎵</span>
            <h1 className="text-white font-bold text-lg truncate" data-testid="session-name">
              {session.name}
            </h1>
            {currentUser.isHost && (
              <span
                className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA' }}
                data-testid="host-badge"
              >
                Host
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Session code badge */}
            <button
              data-testid="session-code-badge"
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono tracking-widest transition-all hover:opacity-80 active:scale-95"
              style={{
                background: 'rgba(124,58,237,0.2)',
                border: '1px solid rgba(124,58,237,0.4)',
                color: '#C4B5FD',
              }}
              title="Click to copy session code"
            >
              {code}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Leave / change session */}
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-all"
              aria-label="Leave session"
              title="Leave session"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Now Playing Banner */}
        <NowPlayingBanner
          song={session.nowPlaying}
          isHost={currentUser.isHost}
          queueLength={session.queue.length}
          onPlayNext={handlePlayNext}
        />

        {/* Add Song Form */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
            Add a Song
          </h2>
          <form onSubmit={handleAddSong} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                data-testid="song-title-input"
                type="text"
                placeholder="Song title"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              />
              <input
                data-testid="song-artist-input"
                type="text"
                placeholder="Artist"
                value={songArtist}
                onChange={(e) => setSongArtist(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              />
            </div>
            {addError && (
              <p className="text-red-400 text-xs" data-testid="add-song-error">{addError}</p>
            )}
            <button
              data-testid="add-song-btn"
              type="submit"
              className="w-full rounded-full py-2.5 font-bold text-white text-sm transition-opacity hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
            >
              + Add to Queue
            </button>
          </form>
        </div>

        {/* Queue Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              Queue ({session.queue.length})
            </h2>
            {currentUser.isHost && session.queue.length > 0 && (
              <button
                data-testid="clear-queue-btn"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-400/10"
              >
                Clear All
              </button>
            )}
          </div>

          {session.queue.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-gray-500 text-sm" data-testid="empty-queue-msg">
                The queue is empty — add the first song!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {session.queue.map((song, index) => (
                <SongCard
                  key={song.id}
                  song={song}
                  rank={index + 1}
                  currentUserName={currentUser.name}
                  isHost={currentUser.isHost}
                  onVote={handleVote}
                  onRemove={handleRemoveSong}
                />
              ))}
            </div>
          )}
        </div>

        {/* Played History */}
        <div>
          <button
            data-testid="history-toggle"
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full flex items-center justify-between text-sm font-bold text-gray-400 uppercase tracking-widest py-2"
          >
            <span>Played History ({session.history.length})</span>
            <svg
              className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {historyOpen && (
            <div data-testid="history-section" className="space-y-2 mt-2">
              {session.history.length === 0 ? (
                <div
                  className="rounded-xl p-6 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-gray-600 text-sm">No songs played yet</p>
                </div>
              ) : (
                session.history.map((song, index) => (
                  <div
                    key={song.id}
                    data-testid={`history-item-${song.id}`}
                    className="rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span className="text-gray-600 font-bold text-sm w-6 text-center">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 font-semibold text-sm truncate">{song.title}</p>
                      <p className="text-gray-500 text-xs truncate">{song.artist}</p>
                    </div>
                    <span className="text-gray-600 text-xs">✓</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </main>

      {/* Clear Queue Confirmation Dialog */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full space-y-4"
            style={{
              background: '#1A1A2E',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            data-testid="clear-confirm-dialog"
          >
            <div className="text-center space-y-2">
              <div className="text-3xl">🗑️</div>
              <h3 className="text-white font-bold text-lg">Clear Queue?</h3>
              <p className="text-gray-400 text-sm">
                This will remove all songs from the queue. Played history will remain. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                data-testid="clear-cancel-btn"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-full py-2.5 font-bold text-gray-300 text-sm transition-all hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Cancel
              </button>
              <button
                data-testid="clear-confirm-btn"
                onClick={handleClearQueue}
                className="flex-1 rounded-full py-2.5 font-bold text-white text-sm transition-all hover:opacity-80"
                style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}
              >
                Clear Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-testid={`toast-${toast.type}`}
            className="px-4 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg"
            style={{
              background:
                toast.type === 'success'
                  ? 'linear-gradient(135deg, #059669, #10B981)'
                  : toast.type === 'error'
                  ? 'linear-gradient(135deg, #DC2626, #EF4444)'
                  : 'rgba(124,58,237,0.9)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Global keyframe styles */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.3), 0 0 40px rgba(236,72,153,0.15); }
          50% { box-shadow: 0 0 30px rgba(124,58,237,0.5), 0 0 60px rgba(236,72,153,0.3); }
        }
      `}</style>
    </div>
  )
}
