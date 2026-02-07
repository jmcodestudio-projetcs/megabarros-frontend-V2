import { api } from "./api"

export type DashboardCounts = {
  corretores: number
  clientes: number
  apolices: number
  seguradoras: number
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [corretores, clientes, apolices, seguradoras] = await Promise.all([
    api.get("/api/corretores"),
    api.get("/api/clientes"),
    api.get("/api/apolices"),
    api.get("/api/seguradoras"),
  ])

  return {
    corretores: corretores.data.length ?? 0,
    clientes: clientes.data.length ?? 0,
    apolices: apolices.data.length ?? 0,
    seguradoras: seguradoras.data.length ?? 0,
  }
}