import { api } from "./api"

export type UsuarioResponse = {
  idUsuario: number
  nome: string
  email: string
  perfil: string
  ativo: boolean
  mustChangePassword: boolean
}

export type UsuarioCreatePayload = {
  nome: string
  email: string
  senha: string
  perfil: string
  ativo?: boolean
  mustChangePassword?: boolean
}

export type UsuarioUpdatePayload = Partial<UsuarioCreatePayload>

export async function listarUsuarios() {
  const { data } = await api.get<UsuarioResponse[]>("/api/usuarios")
  return data
}

export async function criarUsuario(payload: UsuarioCreatePayload) {
  const { data } = await api.post<UsuarioResponse>("/api/usuarios", payload)
  return data
}

export async function atualizarUsuario(id: number, payload: UsuarioUpdatePayload) {
  const { data } = await api.put<UsuarioResponse>(`/api/usuarios/${id}`, payload)
  return data
}

export async function excluirUsuario(id: number) {
  await api.delete(`/api/usuarios/${id}`)
}