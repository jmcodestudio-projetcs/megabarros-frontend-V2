import { Fragment, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import {
  atualizarCliente,
  type ClienteResponse,
  type ClienteUpdatePayload,
} from "../services/clienteService";
import {
  listarMeusClientes,
  buscarMeuCorretor,
  type CorretorResponse,
} from "../services/corretorService";
import {
  buscarApolice,
  listarApolices,
  resolverCorretorClienteId,
  type ApoliceResponse,
  type ParcelaResponse,
} from "../services/apoliceService";

const pageSize = 10;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getParcelaId(parcela: ParcelaResponse) {
  return parcela.id ?? parcela.idParcela;
}

function getStatusParcela(parcela: ParcelaResponse) {
  if (parcela.dataPagamento) return "PAGA";

  const hoje = new Date();
  const vencimento = new Date(parcela.dataVencimento);
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);

  return vencimento >= hoje ? "EM ABERTO" : "VENCIDA";
}

function isEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPhoneValid(phone: string) {
  const digits = onlyDigits(phone);
  return digits.length === 10 || digits.length === 11;
}

function getWhatsappLink(phone: string) {
  const digits = onlyDigits(phone);
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}

export default function CorretorApolices() {
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [apolices, setApolices] = useState<ApoliceResponse[]>([]);
  const [apolicesPorCliente, setApolicesPorCliente] = useState<
    Record<number, ApoliceResponse[]>
  >({});
  const [parcelasPorApolice, setParcelasPorApolice] = useState<
    Record<number, ParcelaResponse[]>
  >({});
  const [expandedClientes, setExpandedClientes] = useState<
    Record<number, boolean>
  >({});
  const [expandedApolices, setExpandedApolices] = useState<
    Record<number, boolean>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ email: "", telefone: "" });
  const [editErrors, setEditErrors] = useState({ email: "", telefone: "" });
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchDigits = onlyDigits(searchTerm);

  const filteredClientes = clientes.filter((c) => {
    const nameMatch = c.nome.toLowerCase().includes(normalizedSearch);
    const cpfMatch = searchDigits
      ? onlyDigits(c.cpfCnpj).includes(searchDigits)
      : false;
    return normalizedSearch ? nameMatch || cpfMatch : true;
  });

  const sortedClientes = [...filteredClientes].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const totalPages = Math.max(1, Math.ceil(sortedClientes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedClientes = sortedClientes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  function toggleCliente(idCliente: number) {
    setExpandedClientes((prev) => ({
      ...prev,
      [idCliente]: !prev[idCliente],
    }));
  }

  async function toggleApolice(idApolice: number) {
    setExpandedApolices((prev) => ({
      ...prev,
      [idApolice]: !prev[idApolice],
    }));

    if (!parcelasPorApolice[idApolice]) {
      try {
        const detalhe = await buscarApolice(idApolice);
        setParcelasPorApolice((prev) => ({
          ...prev,
          [idApolice]: detalhe.parcelas ?? [],
        }));
      } catch {
        setParcelasPorApolice((prev) => ({
          ...prev,
          [idApolice]: [],
        }));
      }
    }
  }

  function iniciarEdicao(cliente: ClienteResponse) {
    setEditId(cliente.idCliente);
    setEditForm({ email: cliente.email, telefone: cliente.telefone });
    setEditErrors({ email: "", telefone: "" });
  }

  function validateUpdate(payload: ClienteUpdatePayload) {
    const errors = { email: "", telefone: "" };

    if (payload.email && !isEmailValid(payload.email)) {
      errors.email = "E-mail inválido.";
    }
    if (payload.telefone && !isPhoneValid(payload.telefone)) {
      errors.telefone = "Telefone deve ter 10 ou 11 dígitos.";
    }

    return errors;
  }

  async function salvarEdicao(clienteId: number) {
    const payload: ClienteUpdatePayload = {
      email: editForm.email.trim(),
      telefone: editForm.telefone.trim(),
    };

    const errors = validateUpdate(payload);
    setEditErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

    try {
      setUpdatingId(clienteId);
      const updated = await atualizarCliente(clienteId, payload);
      setClientes((prev) =>
        prev.map((c) => (c.idCliente === clienteId ? updated : c)),
      );
      setEditId(null);
      setSuccess("Cliente atualizado com sucesso.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Erro ao atualizar cliente.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function mapearApolicesPorCliente(
    clientesData: ClienteResponse[],
    apolicesData: ApoliceResponse[],
    corretor: CorretorResponse,
  ) {
    const map: Record<number, ApoliceResponse[]> = {};

    await Promise.all(
      clientesData.map(async (cliente) => {
        try {
          const idCorretorCliente = await resolverCorretorClienteId(
            corretor.idCorretor,
            cliente.idCliente,
          );

          if (!idCorretorCliente) {
            map[cliente.idCliente] = [];
            return;
          }

          map[cliente.idCliente] = apolicesData.filter(
            (a) => a.idCorretorCliente === idCorretorCliente,
          );
        } catch {
          map[cliente.idCliente] = [];
        }
      }),
    );

    return map;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [clientesData, apolicesData, meuCorretor] = await Promise.all([
          listarMeusClientes(),
          listarApolices(),
          buscarMeuCorretor(),
        ]);

        setClientes(clientesData);
        setApolices(apolicesData);

        const map = await mapearApolicesPorCliente(
          clientesData,
          apolicesData,
          meuCorretor,
        );
        setApolicesPorCliente(map);
      } catch {
        setError("Não foi possível carregar as informações do corretor.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <MainLayout title="Minhas Apólices">
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-dark">Clientes</h2>
            <span className="text-xs text-gray-500">
              {sortedClientes.length} resultado(s)
            </span>
          </div>

          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ"
            className="w-full sm:w-80 rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {loading ? (
          <p className="mt-2 text-sm text-gray-500">Carregando...</p>
        ) : (
          <>
            {sortedClientes.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Nenhum cliente encontrado.
              </p>
            ) : (
              <>
                {/* Mobile collapse */}
                <div className="mt-4 md:hidden space-y-3">
                  {paginatedClientes.map((c) => {
                    const apolicesDoCliente =
                      apolicesPorCliente[c.idCliente] ?? [];
                    const expanded = !!expandedClientes[c.idCliente];
                    const whatsappLink = getWhatsappLink(c.telefone);
                    const isEditing = editId === c.idCliente;

                    return (
                      <div
                        key={c.idCliente}
                        className="border rounded-lg p-4 bg-brand-gray"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-brand-dark">
                              {c.nome}
                            </p>
                            <p className="text-xs text-gray-500">{c.cpfCnpj}</p>
                          </div>

                          <div className="flex flex-wrap gap-2 justify-end">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => salvarEdicao(c.idCliente)}
                                  className="text-xs px-2 py-1 rounded bg-brand-dark text-white disabled:opacity-70"
                                  disabled={updatingId === c.idCliente}
                                >
                                  {updatingId === c.idCliente
                                    ? "Salvando..."
                                    : "💾 Salvar"}
                                </button>
                                <button
                                  onClick={() => setEditId(null)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => iniciarEdicao(c)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300"
                                >
                                  ✏️ Editar
                                </button>
                                <a
                                  href={whatsappLink || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`text-xs px-2 py-1 rounded border border-gray-300 ${
                                    whatsappLink
                                      ? ""
                                      : "pointer-events-none opacity-50"
                                  }`}
                                >
                                  💬 WhatsApp
                                </a>
                                <button
                                  onClick={() => toggleCliente(c.idCliente)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300 flex items-center gap-1"
                                >
                                  <span
                                    className={`transition-transform duration-200 ${
                                      expanded ? "rotate-90" : "rotate-0"
                                    }`}
                                  >
                                    ▸
                                  </span>
                                  {expanded
                                    ? "Ocultar"
                                    : `Ver apólices (${apolicesDoCliente.length})`}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600">
                              Email
                            </label>
                            {isEditing ? (
                              <div>
                                <input
                                  value={editForm.email}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      email: e.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                                />
                                {editErrors.email && (
                                  <p className="text-xs text-red-600 mt-1">
                                    {editErrors.email}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700">{c.email}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600">
                              Telefone
                            </label>
                            {isEditing ? (
                              <div>
                                <input
                                  value={editForm.telefone}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      telefone: e.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                                />
                                {editErrors.telefone && (
                                  <p className="text-xs text-red-600 mt-1">
                                    {editErrors.telefone}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700">
                                {c.telefone}
                              </p>
                            )}
                          </div>
                        </div>

                        {expanded && (
                          <div className="mt-4 rounded-lg bg-white border border-gray-200 p-3">
                            <p className="text-xs font-semibold text-gray-600">
                              Apólices
                            </p>

                            {apolicesDoCliente.length ? (
                              <div className="mt-2 space-y-2">
                                {apolicesDoCliente.map((a) => {
                                  const expandedApolice =
                                    !!expandedApolices[a.idApolice];
                                  return (
                                    <div
                                      key={a.idApolice}
                                      className="border rounded p-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-semibold text-brand-dark">
                                            #{a.numeroApolice}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {a.tipoContrato} •{" "}
                                            {formatCurrency(a.valor)}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() =>
                                            toggleApolice(a.idApolice)
                                          }
                                          className="text-xs px-2 py-1 rounded border border-gray-300 flex items-center gap-1"
                                        >
                                          <span
                                            className={`transition-transform duration-200 ${
                                              expandedApolice
                                                ? "rotate-90"
                                                : "rotate-0"
                                            }`}
                                          >
                                            ▸
                                          </span>
                                          Parcelas
                                        </button>
                                      </div>

                                      {expandedApolice && (
                                        <div className="mt-2">
                                          {(
                                            parcelasPorApolice[a.idApolice] ??
                                            []
                                          ).length ? (
                                            <div className="space-y-1">
                                              {(
                                                parcelasPorApolice[
                                                  a.idApolice
                                                ] ?? []
                                              ).map((p) => {
                                                const parcelaId =
                                                  getParcelaId(p);
                                                const status =
                                                  getStatusParcela(p);
                                                return (
                                                  <div
                                                    key={parcelaId}
                                                    className="flex justify-between text-xs text-gray-700"
                                                  >
                                                    <span>
                                                      #{p.numeroParcela} •{" "}
                                                      {p.dataVencimento}
                                                    </span>
                                                    <span
                                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                        status === "PAGA"
                                                          ? "bg-green-50 text-green-700"
                                                          : status ===
                                                              "EM ABERTO"
                                                            ? "bg-yellow-50 text-yellow-700"
                                                            : "bg-red-50 text-red-700"
                                                      }`}
                                                    >
                                                      {status}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-gray-500">
                                              Nenhuma parcela.
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-gray-500">
                                Nenhuma apólice.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[1100px]">
                    <thead className="text-left text-gray-500 border-b">
                      <tr>
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">CPF/CNPJ</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Telefone</th>
                        <th className="py-2 pr-4">Nascimento</th>
                        <th className="py-2 pr-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedClientes.map((c) => {
                        const apolicesDoCliente =
                          apolicesPorCliente[c.idCliente] ?? [];
                        const expanded = !!expandedClientes[c.idCliente];
                        const whatsappLink = getWhatsappLink(c.telefone);

                        return (
                          <Fragment key={c.idCliente}>
                            <tr>
                              <td className="py-2 pr-4 font-semibold text-brand-dark">
                                {c.nome}
                              </td>
                              <td className="py-2 pr-4">{c.cpfCnpj}</td>
                              <td className="py-2 pr-4">
                                {editId === c.idCliente ? (
                                  <div>
                                    <input
                                      value={editForm.email}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          email: e.target.value,
                                        })
                                      }
                                      className="w-full rounded border border-gray-300 px-2 py-1"
                                    />
                                    {editErrors.email && (
                                      <p className="text-xs text-red-600 mt-1">
                                        {editErrors.email}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  c.email
                                )}
                              </td>
                              <td className="py-2 pr-4">
                                {editId === c.idCliente ? (
                                  <div>
                                    <input
                                      value={editForm.telefone}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          telefone: e.target.value,
                                        })
                                      }
                                      className="w-full rounded border border-gray-300 px-2 py-1"
                                    />
                                    {editErrors.telefone && (
                                      <p className="text-xs text-red-600 mt-1">
                                        {editErrors.telefone}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  c.telefone
                                )}
                              </td>
                              <td className="py-2 pr-4">{c.dataNascimento}</td>
                              <td className="py-2 pr-4">
                                <div className="flex gap-2">
                                  {editId === c.idCliente ? (
                                    <>
                                      <button
                                        onClick={() => salvarEdicao(c.idCliente)}
                                        className="text-xs px-2 py-1 rounded bg-brand-dark text-white disabled:opacity-70"
                                        disabled={updatingId === c.idCliente}
                                      >
                                        {updatingId === c.idCliente
                                          ? "Salvando..."
                                          : "💾 Salvar"}
                                      </button>
                                      <button
                                        onClick={() => setEditId(null)}
                                        className="text-xs px-2 py-1 rounded border border-gray-300"
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => iniciarEdicao(c)}
                                        className="text-xs px-2 py-1 rounded border border-gray-300"
                                      >
                                        ✏️ Editar
                                      </button>
                                      <a
                                        href={whatsappLink || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`text-xs px-2 py-1 rounded border border-gray-300 ${
                                          whatsappLink
                                            ? ""
                                            : "pointer-events-none opacity-50"
                                        }`}
                                      >
                                        💬 WhatsApp
                                      </a>
                                      <button
                                        onClick={() => toggleCliente(c.idCliente)}
                                        className="text-xs px-2 py-1 rounded border border-gray-300 flex items-center gap-1"
                                      >
                                        <span
                                          className={`transition-transform duration-200 ${
                                            expanded ? "rotate-90" : "rotate-0"
                                          }`}
                                        >
                                          ▸
                                        </span>
                                        {expanded
                                          ? "Ocultar"
                                          : `Ver apólices (${apolicesDoCliente.length})`}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {expanded && (
                              <tr>
                                <td colSpan={6} className="pb-4">
                                  <div className="mt-2 rounded-lg bg-brand-gray/40 border border-gray-200 p-3">
                                    <p className="text-xs font-semibold text-gray-600">
                                      Apólices
                                    </p>

                                    {apolicesDoCliente.length ? (
                                      <div className="mt-2 overflow-x-auto">
                                        <table className="w-full text-xs sm:text-sm">
                                          <thead className="text-left text-gray-500 border-b">
                                            <tr>
                                              <th className="py-1 pr-3">
                                                Número
                                              </th>
                                              <th className="py-1 pr-3">
                                                Contrato
                                              </th>
                                              <th className="py-1 pr-3">
                                                Valor
                                              </th>
                                              <th className="py-1 pr-3">
                                                Status
                                              </th>
                                              <th className="py-1 pr-3">
                                                Vigência
                                              </th>
                                              <th className="py-1 pr-3">
                                                Ações
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y">
                                            {apolicesDoCliente.map((a) => {
                                              const expandedApolice =
                                                !!expandedApolices[a.idApolice];
                                              return (
                                                <Fragment key={a.idApolice}>
                                                  <tr>
                                                    <td className="py-1 pr-3 font-medium text-brand-dark">
                                                      #{a.numeroApolice}
                                                    </td>
                                                    <td className="py-1 pr-3">
                                                      {a.tipoContrato}
                                                    </td>
                                                    <td className="py-1 pr-3">
                                                      {formatCurrency(a.valor)}
                                                    </td>
                                                    <td className="py-1 pr-3">
                                                      <span className="px-2 py-0.5 rounded text-[11px] bg-green-50 text-green-700">
                                                        {a.statusAtual}
                                                      </span>
                                                    </td>
                                                    <td className="py-1 pr-3 text-gray-600">
                                                      {a.vigenciaInicio} →{" "}
                                                      {a.vigenciaFim}
                                                    </td>
                                                    <td className="py-1 pr-3">
                                                      <button
                                                        onClick={() =>
                                                          toggleApolice(
                                                            a.idApolice,
                                                          )
                                                        }
                                                        className="text-xs px-2 py-1 rounded border border-gray-300 flex items-center gap-1"
                                                      >
                                                        <span
                                                          className={`transition-transform duration-200 ${
                                                            expandedApolice
                                                              ? "rotate-90"
                                                              : "rotate-0"
                                                          }`}
                                                        >
                                                          ▸
                                                        </span>
                                                        Parcelas
                                                      </button>
                                                    </td>
                                                  </tr>

                                                  {expandedApolice && (
                                                    <tr>
                                                      <td
                                                        colSpan={6}
                                                        className="py-2"
                                                      >
                                                        <div className="rounded-md bg-white border border-gray-200 p-3">
                                                          <p className="text-xs font-semibold text-gray-600">
                                                            Parcelas
                                                          </p>

                                                          {(
                                                            parcelasPorApolice[
                                                              a.idApolice
                                                            ] ?? []
                                                          ).length ? (
                                                            <div className="mt-2 overflow-x-auto">
                                                              <table className="w-full text-xs sm:text-sm">
                                                                <thead className="text-left text-gray-500 border-b">
                                                                  <tr>
                                                                    <th className="py-1 pr-3">
                                                                      Nº
                                                                    </th>
                                                                    <th className="py-1 pr-3">
                                                                      Vencimento
                                                                    </th>
                                                                    <th className="py-1 pr-3">
                                                                      Valor
                                                                    </th>
                                                                    <th className="py-1 pr-3">
                                                                      Status
                                                                    </th>
                                                                    <th className="py-1 pr-3">
                                                                      Pagamento
                                                                    </th>
                                                                  </tr>
                                                                </thead>
                                                                <tbody className="divide-y">
                                                                  {(
                                                                    parcelasPorApolice[
                                                                      a
                                                                        .idApolice
                                                                    ] ?? []
                                                                  ).map((p) => {
                                                                    const parcelaId =
                                                                      getParcelaId(
                                                                        p,
                                                                      );
                                                                    const status =
                                                                      getStatusParcela(
                                                                        p,
                                                                      );
                                                                    return (
                                                                      <tr
                                                                        key={
                                                                          parcelaId
                                                                        }
                                                                      >
                                                                        <td className="py-1 pr-3">
                                                                          {
                                                                            p.numeroParcela
                                                                          }
                                                                        </td>
                                                                        <td className="py-1 pr-3">
                                                                          {
                                                                            p.dataVencimento
                                                                          }
                                                                        </td>
                                                                        <td className="py-1 pr-3">
                                                                          {formatCurrency(
                                                                            p.valorParcela,
                                                                          )}
                                                                        </td>
                                                                        <td className="py-1 pr-3">
                                                                          <span
                                                                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                                              status ===
                                                                              "PAGA"
                                                                                ? "bg-green-50 text-green-700"
                                                                                : status ===
                                                                                    "EM ABERTO"
                                                                                  ? "bg-yellow-50 text-yellow-700"
                                                                                  : "bg-red-50 text-red-700"
                                                                            }`}
                                                                          >
                                                                            {
                                                                              status
                                                                            }
                                                                          </span>
                                                                        </td>
                                                                        <td className="py-1 pr-3">
                                                                          {p.dataPagamento ??
                                                                            "—"}
                                                                        </td>
                                                                      </tr>
                                                                    );
                                                                  })}
                                                                </tbody>
                                                              </table>
                                                            </div>
                                                          ) : (
                                                            <p className="mt-2 text-sm text-gray-500">
                                                              Nenhuma parcela.
                                                            </p>
                                                          )}
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </Fragment>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="mt-2 text-sm text-gray-500">
                                        Nenhuma apólice.
                                      </p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded border border-gray-300"
                      disabled={currentPage === 1}
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 rounded border border-gray-300"
                      disabled={currentPage === totalPages}
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}