import { api } from "./api"

export type ProdutoResponse = {
  idProduto: number
  nomeProduto: string
  tipoProduto: string
  apoliceCount: number
}

export type SeguradoraResponse = {
  idSeguradora: number
  nomeSeguradora: string
  apoliceCount: number
  produtos: ProdutoResponse[]
}

export async function listarSeguradoras() {
  const { data } = await api.get<SeguradoraResponse[]>("/api/seguradoras")
  return data
}

export async function criarSeguradora(nomeSeguradora: string) {
  const { data } = await api.post<SeguradoraResponse>("/api/seguradoras", {
    nome: nomeSeguradora,
  })
  return data
}

export async function atualizarSeguradora(
  id: number,
  nomeSeguradora: string
) {
  const { data } = await api.put<SeguradoraResponse>(
    `/api/seguradoras/${id}`,
    { nome: nomeSeguradora }
  )
  return data
}

export async function excluirSeguradora(id: number) {
  await api.delete(`/api/seguradoras/${id}`)
}

export async function criarProduto(
  seguradoraId: number,
  nomeProduto: string,
  tipoProduto: string
) {
  const { data } = await api.post<ProdutoResponse>(
    `/api/seguradoras/${seguradoraId}/produtos`,
    { nomeProduto, tipoProduto }
  )
  return data
}

export async function atualizarProduto(
  seguradoraId: number,
  idProduto: number,
  nomeProduto: string,
  tipoProduto: string
) {
  const { data } = await api.put<ProdutoResponse>(
    `/api/seguradoras/${seguradoraId}/produtos/${idProduto}`,
    { nomeProduto, tipoProduto }
  )
  return data
}

export async function excluirProduto(seguradoraId: number, idProduto: number) {
  await api.delete(`/api/seguradoras/${seguradoraId}/produtos/${idProduto}`)
}