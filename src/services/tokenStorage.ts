import type { LoginResponse } from "./authService"

const STORAGE_KEY = "mb_auth"

export function saveAuth(data: LoginResponse) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getAuth(): LoginResponse | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
}