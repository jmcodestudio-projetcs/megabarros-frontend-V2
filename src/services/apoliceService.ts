import { api } from "./api"

export type ApoliceResponse = {
  idApolice: number
  numeroApolice: string
  dataEmissao: string
  vigenciaInicio: string
  vigenciaFim: string
  valor: number
  comissaoPercentual: number
  tipoContrato: string
  idCorretorCliente: number
  idProduto: number
  idSeguradora: number
  statusAtual: string
  parcelas?: ParcelaResponse[]
}

export type ApoliceCreatePayload = {
  numeroApolice: string
  dataEmissao: string
  vigenciaInicio: string
  vigenciaFim: string
  valor: number
  comissaoPercentual: number
  tipoContrato: string
  idCorretorCliente: number
  idProduto: number
  idSeguradora: number
  coberturas: unknown[]
  beneficiarios: unknown[]
}

export type ParcelaPayload = {
  numeroParcela: number
  dataVencimento: string
  valorParcela: number
}

export type ParcelaPayPayload = {
  dataPagamento: string
}

export type ParcelaResponse = ParcelaPayload & {
  id?: number
  idParcela?: number
  statusPagamento: string
  dataPagamento?: string | null
}

export async function listarApolices() {
  const { data } = await api.get<ApoliceResponse[]>("/api/apolices")
  return data
}

export async function buscarApolice(id: number) {
  const { data } = await api.get<ApoliceResponse>(`/api/apolices/${id}`)
  return data
}

export async function criarApolice(payload: ApoliceCreatePayload) {
  const { data } = await api.post<ApoliceResponse>("/api/apolices", payload)
  return data
}

export async function atualizarApolice(id: number, payload: ApoliceCreatePayload) {
  const { data } = await api.put<ApoliceResponse>(`/api/apolices/${id}`, payload)
  return data
}

export async function excluirApolice(id: number) {
  await api.delete(`/api/apolices/${id}`)
}

export async function adicionarParcela(apoliceId: number, payload: ParcelaPayload) {
  const { data } = await api.post<ApoliceResponse.ParcelaResponse>(
    `/api/apolices/${apoliceId}/parcelas`,
    payload
  )
  return data
}

export async function pagarParcela(parcelaId: number, payload: ParcelaPayPayload) {
  const { data } = await api.post<ApoliceResponse.ParcelaResponse>(
    `/api/apolices/parcelas/${parcelaId}/pay`,
    payload
  )
  return data
}

export async function listarCorretoresPorCliente(clienteId: number) {
  const { data } = await api.get(`/api/clientes/${clienteId}/corretores`)
  return data
}

export async function vincularCorretorCliente(corretorId: number, clienteId: number) {
  await api.post("/api/corretor-clientes", { corretorId, clienteId })
}

export async function resolverCorretorClienteId(corretorId: number, clienteId: number) {
  const { data } = await api.get(
    `/api/corretor-clientes/resolve?clienteId=${clienteId}&corretorId=${corretorId}`
  )
  return typeof data === "number" ? data : data?.idCorretorCliente
}