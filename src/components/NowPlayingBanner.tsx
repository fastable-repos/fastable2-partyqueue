import type { Song } from '../types'

interface NowPlayingBannerProps {
  song: Song | null
  isHost: boolean
  queueLength: number
  onPlayNext: () => void
}

export default function NowPlayingBanner({ song, isHost, queueLength, onPlayNext }: NowPlayingBannerProps) {
  return (
    <div
      data-testid="now-playing-banner"
      className="rounded-2xl p-5 mb-4 relative overflow-hidden"
      style={{
        background: song
          ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.3))'
          : 'rgba(255,255,255,0.04)',
        border: song
          ? '1px solid rgba(124,58,237,0.5)'
          : '1px solid rgba(255,255,255,0.08)',
        animation: song ? 'pulse-glow 3s ease-in-out infinite' : 'none',
      }}
    >
      {/* Glow overlay when playing */}
      {song && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)',
          }}
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          {song ? (
            <>
              <span className="text-lg animate-pulse">🎶</span>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
                Now Playing
              </span>
            </>
          ) : (
            <>
              <span className="text-lg">🎵</span>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Now Playing
              </span>
            </>
          )}
        </div>

        {song ? (
          <div>
            <p className="text-white font-bold text-lg leading-tight" data-testid="now-playing-title">
              {song.title}
            </p>
            <p className="text-gray-400 text-sm">{song.artist}</p>
            <p className="text-purple-400 text-xs mt-1">Added by {song.submittedBy}</p>
          </div>
        ) : (
          <p className="text-gray-500 italic text-sm">Waiting for the first song...</p>
        )}

        {isHost && (
          <button
            data-testid="play-next-btn"
            onClick={onPlayNext}
            disabled={queueLength === 0}
            className="mt-3 rounded-full px-4 py-2 text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
            style={{
              background: queueLength > 0
                ? 'linear-gradient(135deg, #7C3AED, #EC4899)'
                : 'rgba(255,255,255,0.1)',
            }}
          >
            {queueLength === 0 ? '⏸ Queue Empty' : '▶ Play Next'}
          </button>
        )}
      </div>
    </div>
  )
}
