import axios from "axios"
import { getAuth } from "./tokenStorage"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  const auth = getAuth()
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})