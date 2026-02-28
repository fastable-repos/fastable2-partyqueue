import type { Song, VoteType } from '../types'

interface SongCardProps {
  song: Song
  rank: number
  currentUserName: string
  isHost: boolean
  onVote: (songId: string, vote: VoteType) => void
  onRemove: (songId: string) => void
}

export default function SongCard({ song, rank, currentUserName, isHost, onVote, onRemove }: SongCardProps) {
  const userVote = song.voters[currentUserName] ?? null

  return (
    <div
      data-testid={`song-card-${song.id}`}
      className="rounded-xl p-4 flex items-center gap-4 transition-all"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 text-center">
        <span className="text-gray-500 font-bold text-lg">#{rank}</span>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate" data-testid={`song-title-${song.id}`}>
          {song.title}
        </p>
        <p className="text-gray-400 text-xs truncate">{song.artist}</p>
        <span
          className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA' }}
        >
          {song.submittedBy}
        </span>
      </div>

      {/* Vote controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Net score */}
        <span
          data-testid={`net-score-${song.id}`}
          className="text-sm font-bold w-8 text-center"
          style={{
            color: song.netScore > 0 ? '#22C55E' : song.netScore < 0 ? '#EF4444' : '#9CA3AF',
          }}
        >
          {song.netScore > 0 ? `+${song.netScore}` : song.netScore}
        </span>

        {/* Upvote */}
        <button
          data-testid={`upvote-${song.id}`}
          onClick={() => onVote(song.id, 'up')}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all active:scale-95"
          style={{
            background: userVote === 'up' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
            border: userVote === 'up' ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(255,255,255,0.08)',
          }}
          aria-label="Upvote"
        >
          <span className="text-base leading-none">👍</span>
          <span
            className="text-xs font-bold leading-none"
            style={{ color: '#22C55E' }}
            data-testid={`upvote-count-${song.id}`}
          >
            {song.upvotes}
          </span>
        </button>

        {/* Downvote */}
        <button
          data-testid={`downvote-${song.id}`}
          onClick={() => onVote(song.id, 'down')}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all active:scale-95"
          style={{
            background: userVote === 'down' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
            border: userVote === 'down' ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.08)',
          }}
          aria-label="Downvote"
        >
          <span className="text-base leading-none">👎</span>
          <span
            className="text-xs font-bold leading-none"
            style={{ color: '#EF4444' }}
            data-testid={`downvote-count-${song.id}`}
          >
            {song.downvotes}
          </span>
        </button>

        {/* Remove (host only) */}
        {isHost && (
          <button
            data-testid={`remove-song-${song.id}`}
            onClick={() => onRemove(song.id)}
            className="ml-1 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
            aria-label="Remove song"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
