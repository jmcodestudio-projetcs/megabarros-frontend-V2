import { api } from "./api"

export type LoginResponse = {
  userId: number
  email: string
  role: string
  accessToken: string
  refreshToken: string
}

export async function login(email: string, senha: string) {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    email,
    senha,
  })
  return data
}