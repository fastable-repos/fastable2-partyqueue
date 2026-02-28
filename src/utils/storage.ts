import type { Session, CurrentUser, Song } from '../types'

const SESSION_PREFIX = 'partyqueue_'
export const USER_KEY = 'partyqueue_user'

export function getSession(code: string): Session | null {
  try {
    const data = localStorage.getItem(SESSION_PREFIX + code)
    return data ? (JSON.parse(data) as Session) : null
  } catch (err) {
    console.error('Failed to get session:', err)
    return null
  }
}

export function saveSession(code: string, session: Session): void {
  try {
    localStorage.setItem(SESSION_PREFIX + code, JSON.stringify(session))
  } catch (err) {
    console.error('Failed to save session:', err)
  }
}

export function getUser(): CurrentUser | null {
  try {
    const data = localStorage.getItem(USER_KEY)
    return data ? (JSON.parse(data) as CurrentUser) : null
  } catch (err) {
    console.error('Failed to get user:', err)
    return null
  }
}

export function saveUser(user: CurrentUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch (err) {
    console.error('Failed to save user:', err)
  }
}

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function sortQueue(queue: Song[]): Song[] {
  return [...queue].sort((a, b) => b.netScore - a.netScore)
}
