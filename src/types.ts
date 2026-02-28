export type VoteType = 'up' | 'down'

export interface Song {
  id: string
  title: string
  artist: string
  submittedBy: string
  submittedAt: string
  upvotes: number
  downvotes: number
  netScore: number
  voters: Record<string, VoteType>
}

export interface Session {
  id: string
  name: string
  hostName: string
  createdAt: string
  nowPlaying: Song | null
  queue: Song[]
  history: Song[]
}

export interface CurrentUser {
  name: string
  sessionCode: string
  isHost: boolean
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}
