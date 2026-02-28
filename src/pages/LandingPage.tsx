import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateSessionCode, getSession, saveSession, saveUser } from '../utils/storage'
import type { Session } from '../types'

export default function LandingPage() {
  const navigate = useNavigate()

  // Create party state
  const [sessionName, setSessionName] = useState('')
  const [hostName, setHostName] = useState('')
  const [createError, setCreateError] = useState('')

  // Join party state
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinError, setJoinError] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')

    if (!sessionName.trim()) {
      setCreateError('Please enter a session name.')
      return
    }
    if (!hostName.trim()) {
      setCreateError('Please enter your display name.')
      return
    }

    try {
      const code = generateSessionCode()
      const session: Session = {
        id: code,
        name: sessionName.trim(),
        hostName: hostName.trim(),
        createdAt: new Date().toISOString(),
        nowPlaying: null,
        queue: [],
        history: [],
      }
      saveSession(code, session)
      saveUser({ name: hostName.trim(), sessionCode: code, isHost: true })
      navigate(`/session/${code}`)
    } catch (err) {
      console.error('Failed to create session:', err)
      setCreateError('Failed to create session. Please try again.')
    }
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoinError('')

    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setJoinError('Please enter a session code.')
      return
    }
    if (!joinName.trim()) {
      setJoinError('Please enter your display name.')
      return
    }

    try {
      const session = getSession(code)
      if (!session) {
        setJoinError('Session not found. Check the code and try again.')
        return
      }
      saveUser({ name: joinName.trim(), sessionCode: code, isHost: false })
      navigate(`/session/${code}`)
    } catch (err) {
      console.error('Failed to join session:', err)
      setJoinError('Failed to join session. Please try again.')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#0F0F1A', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Logo & Tagline */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-4xl">🎵</span>
          <h1
            className="text-4xl font-extrabold text-white tracking-tight"
            style={{ background: 'linear-gradient(90deg, #7C3AED, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            PartyQueue
          </h1>
          <span className="text-4xl">🎉</span>
        </div>
        <p className="text-gray-400 text-lg">
          Crowd-powered music — the best songs always play first
        </p>
      </div>

      {/* Two-panel cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create a Party */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div>
            <h2 className="text-xl font-bold text-white mb-1">🎉 Create a Party</h2>
            <p className="text-gray-400 text-sm">Start a new session and invite friends</p>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input
              data-testid="session-name-input"
              type="text"
              placeholder="Session name (e.g. Friday Night)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            />
            <input
              data-testid="host-name-input"
              type="text"
              placeholder="Your display name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            />
            {createError && (
              <p className="text-red-400 text-sm" data-testid="create-error">{createError}</p>
            )}
            <button
              data-testid="create-party-btn"
              type="submit"
              className="w-full rounded-full py-3 font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
            >
              Create Party 🚀
            </button>
          </form>
        </div>

        {/* Join a Party */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div>
            <h2 className="text-xl font-bold text-white mb-1">🎟️ Join a Party</h2>
            <p className="text-gray-400 text-sm">Enter the session code to join</p>
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <input
              data-testid="join-code-input"
              type="text"
              placeholder="Session code (e.g. AB1234)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 uppercase tracking-widest font-mono"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              maxLength={6}
            />
            <input
              data-testid="join-name-input"
              type="text"
              placeholder="Your display name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            />
            {joinError && (
              <p className="text-red-400 text-sm" data-testid="join-error">{joinError}</p>
            )}
            <button
              data-testid="join-party-btn"
              type="submit"
              className="w-full rounded-full py-3 font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}
            >
              Join Party 🎵
            </button>
          </form>
        </div>
      </div>

      <p className="mt-8 text-gray-600 text-sm text-center">
        No account needed · Works offline · Sessions persist across refreshes
      </p>
    </div>
  )
}
