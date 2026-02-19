import { api } from "./api"

export type CorretorClienteResponse = {
  idCorretorCliente: number
  idCorretor: number
  idCliente: number
  nomeCorretor: string
  uf?: string | null
  email?: string | null
  dataInicio?: string | null
}

export async function listarCorretoresPorCliente(clienteId: number) {
  const { data } = await api.get<CorretorClienteResponse[]>(
    `/api/clientes/${clienteId}/corretores`
  )
  return data
}

export async function criarVinculoCorretorCliente(
  corretorId: number,
  clienteId: number
) {
  const { data } = await api.post<{ idCorretorCliente: number }>(
    "/api/corretor-clientes",
    { corretorId, clienteId }
  )
  return data
}

export async function removerVinculoCorretorCliente(id: number) {
  await api.delete(`/api/corretor-clientes/${id}`)
}