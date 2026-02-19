import { Fragment, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ui/ConfirmModal";
import {
  listarClientes,
  type ClienteResponse,
} from "../services/clienteService";
import {
  listarSeguradoras,
  type SeguradoraResponse,
} from "../services/seguradoraService";
import {
  listarCorretores,
  type CorretorResponse,
} from "../services/corretorService";
import {
  adicionarParcela,
  atualizarApolice,
  buscarApolice,
  criarApolice,
  excluirApolice,
  listarApolices,
  listarCorretoresPorCliente,
  pagarParcela,
  resolverCorretorClienteId,
  vincularCorretorCliente,
  type ApoliceResponse,
  type ParcelaResponse,
} from "../services/apoliceService";

type ParcelaForm = {
  id: string;
  idParcela?: number;
  numeroParcela: string;
  dataVencimento: string;
  valorParcela: string;
  remover?: boolean;
};

const pageSize = 10;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getParcelaId(parcela: ParcelaResponse) {
  return parcela.id ?? parcela.idParcela;
}

function mapParcelaResponseToForm(parcela: ParcelaResponse): ParcelaForm {
  return {
    id: `parcela-${getParcelaId(parcela)}`,
    idParcela: getParcelaId(parcela),
    numeroParcela: String(parcela.numeroParcela),
    dataVencimento: parcela.dataVencimento,
    valorParcela: String(parcela.valorParcela),
    remover: false,
  };
}

function getStatusParcela(parcela: ParcelaResponse) {
  if (parcela.dataPagamento) return "PAGA";

  const hoje = new Date();
  const vencimento = new Date(parcela.dataVencimento);
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);

  return vencimento >= hoje ? "EM ABERTO" : "VENCIDA";
}

export default function Apolices() {
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [seguradoras, setSeguradoras] = useState<SeguradoraResponse[]>([]);
  const [corretores, setCorretores] = useState<CorretorResponse[]>([]);
  const [corretoresVinculados, setCorretoresVinculados] = useState<
    CorretorResponse[]
  >([]);
  const [apolices, setApolices] = useState<ApoliceResponse[]>([]);
  const [apolicesPorCliente, setApolicesPorCliente] = useState<
    Record<number, ApoliceResponse[]>
  >({});
  const [expandedClientes, setExpandedClientes] = useState<
    Record<number, boolean>
  >({});
  const [expandedApolices, setExpandedApolices] = useState<
    Record<number, boolean>
  >({});
  const [parcelasPorApolice, setParcelasPorApolice] = useState<
    Record<number, ParcelaResponse[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] =
    useState<ClienteResponse | null>(null);
  const [editingApolice, setEditingApolice] = useState<ApoliceResponse | null>(
    null,
  );
  const [corretorIdSelecionado, setCorretorIdSelecionado] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [qtdParcelas, setQtdParcelas] = useState("");
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");

  const [form, setForm] = useState({
    numeroApolice: "",
    dataEmissao: "",
    vigenciaInicio: "",
    vigenciaFim: "",
    valor: "",
    comissaoPercentual: "",
    tipoContrato: "",
    idSeguradora: "",
    idProduto: "",
  });

  const [formErrors, setFormErrors] = useState({
    numeroApolice: "",
    dataEmissao: "",
    vigenciaInicio: "",
    vigenciaFim: "",
    valor: "",
    tipoContrato: "",
    idSeguradora: "",
    idProduto: "",
    parcelas: "",
    corretor: "",
    qtdParcelas: "",
    primeiroVencimento: "",
  });

  const [parcelas, setParcelas] = useState<ParcelaForm[]>([]);
  const [parcelaErrors, setParcelaErrors] = useState<Record<string, string>>(
    {},
  );

  const [modalExcluir, setModalExcluir] = useState<{
    open: boolean;
    apolice?: ApoliceResponse;
  }>({ open: false });

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

  const apoliceNumbers = useMemo(
    () => new Set(apolices.map((a) => a.numeroApolice.trim().toLowerCase())),
    [apolices],
  );

  const produtosDisponiveis = useMemo(() => {
    const seguradoraId = Number(form.idSeguradora);
    if (!seguradoraId) return [];
    return (
      seguradoras.find((s) => s.idSeguradora === seguradoraId)?.produtos ?? []
    );
  }, [form.idSeguradora, seguradoras]);

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

  async function mapearApolicesPorCliente(
    clientesData: ClienteResponse[],
    apolicesData: ApoliceResponse[],
  ) {
    const map: Record<number, ApoliceResponse[]> = {};

    await Promise.all(
      clientesData.map(async (cliente) => {
        try {
          const vinculados = (await listarCorretoresPorCliente(
            cliente.idCliente,
          )) as CorretorResponse[];

          const ids = await Promise.all(
            vinculados.map((c) =>
              resolverCorretorClienteId(c.idCorretor, cliente.idCliente),
            ),
          );

          const idsValidos = new Set(
            ids.filter((id): id is number => typeof id === "number"),
          );

          map[cliente.idCliente] = apolicesData.filter((a) =>
            idsValidos.has(a.idCorretorCliente),
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
        const [clientesData, seguradorasData, apolicesData, corretoresData] =
          await Promise.all([
            listarClientes(),
            listarSeguradoras(),
            listarApolices(),
            listarCorretores(),
          ]);
        setClientes(clientesData);
        setSeguradoras(seguradorasData);
        setApolices(apolicesData);
        setCorretores(corretoresData);

        const map = await mapearApolicesPorCliente(clientesData, apolicesData);
        setApolicesPorCliente(map);
      } catch {
        setError("Não foi possível carregar as informações.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function gerarParcelas() {
    const quantidade = Number(qtdParcelas);
    const valorTotal = Number(form.valor);

    if (!quantidade || quantidade <= 0 || !primeiroVencimento || !valorTotal) {
      return;
    }

    const base = Math.floor((valorTotal / quantidade) * 100) / 100;
    const parcelasGeradas: ParcelaForm[] = [];
    let soma = 0;

    for (let i = 0; i < quantidade; i++) {
      const data = addMonths(new Date(primeiroVencimento), i);
      let valorParcela = base;
      if (i === quantidade - 1) {
        valorParcela = Math.round((valorTotal - soma) * 100) / 100;
      }
      soma += valorParcela;

      parcelasGeradas.push({
        id: generateId(),
        numeroParcela: String(i + 1),
        dataVencimento: formatDateISO(data),
        valorParcela: String(valorParcela),
        remover: false,
      });
    }

    const parcelasAntigasMarcadas = editingApolice
      ? parcelas.map((p) => (p.idParcela ? { ...p, remover: true } : p))
      : [];

    setParcelas([...parcelasAntigasMarcadas, ...parcelasGeradas]);
  }

  async function openModal(
    cliente: ClienteResponse,
    apolice?: ApoliceResponse,
  ) {
    setSelectedCliente(cliente);
    setEditingApolice(apolice ?? null);

    setForm({
      numeroApolice: apolice?.numeroApolice ?? "",
      dataEmissao: apolice?.dataEmissao ?? "",
      vigenciaInicio: apolice?.vigenciaInicio ?? "",
      vigenciaFim: apolice?.vigenciaFim ?? "",
      valor: apolice?.valor ? String(apolice.valor) : "",
      comissaoPercentual: apolice?.comissaoPercentual
        ? String(apolice.comissaoPercentual)
        : "",
      tipoContrato: apolice?.tipoContrato ?? "",
      idSeguradora: apolice?.idSeguradora ? String(apolice.idSeguradora) : "",
      idProduto: apolice?.idProduto ? String(apolice.idProduto) : "",
    });

    setQtdParcelas("");
    setPrimeiroVencimento("");
    setFormErrors({
      numeroApolice: "",
      dataEmissao: "",
      vigenciaInicio: "",
      vigenciaFim: "",
      valor: "",
      comissaoPercentual: "",
      tipoContrato: "",
      idSeguradora: "",
      idProduto: "",
      parcelas: "",
      corretor: "",
      qtdParcelas: "",
      primeiroVencimento: "",
    });

    setParcelas([]);
    setParcelaErrors({});
    setCorretorIdSelecionado("");
    setCorretoresVinculados([]);

    try {
      const vinculados = (await listarCorretoresPorCliente(
        cliente.idCliente,
      )) as CorretorResponse[];
      setCorretoresVinculados(vinculados);

      if (apolice) {
        const match = vinculados.find(
          (v) => v.idCorretorCliente === apolice.idCorretorCliente,
        );
        if (match) {
          setCorretorIdSelecionado(String(match.idCorretor));
        }
        const detalhe = await buscarApolice(apolice.idApolice);
        if (detalhe?.parcelas?.length) {
          setParcelas(detalhe.parcelas.map(mapParcelaResponseToForm));
          setQtdParcelas(String(detalhe.parcelas.length));
          setPrimeiroVencimento(detalhe.parcelas[0].dataVencimento);
        }
      } else if (vinculados?.length) {
        setCorretorIdSelecionado(String(vinculados[0].idCorretor));
      }
    } catch {
      setCorretoresVinculados([]);
    }

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedCliente(null);
    setEditingApolice(null);
  }

  function removeParcela(id: string) {
    setParcelas((prev) =>
      prev
        .map((p) =>
          p.id === id ? (p.idParcela ? { ...p, remover: true } : p) : p,
        )
        .filter((p) => !(p.id === id && !p.idParcela)),
    );
    setParcelaErrors((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function updateParcela(id: string, field: keyof ParcelaForm, value: string) {
    setParcelas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  async function handlePagamentoParcela(
    apoliceId: number,
    parcelaId: number,
    dataPagamento: string,
  ) {
    if (!dataPagamento) return;

    try {
      const updated = await pagarParcela(parcelaId, { dataPagamento });
      setParcelasPorApolice((prev) => ({
        ...prev,
        [apoliceId]: (prev[apoliceId] ?? []).map((p) =>
          getParcelaId(p) === parcelaId ? updated : p,
        ),
      }));
    } catch {
      setError("Erro ao atualizar pagamento da parcela.");
    }
  }

  function validateForm() {
    const errors = {
      numeroApolice: "",
      dataEmissao: "",
      vigenciaInicio: "",
      vigenciaFim: "",
      valor: "",
      comissaoPercentual: "",
      tipoContrato: "",
      idSeguradora: "",
      idProduto: "",
      parcelas: "",
      corretor: "",
      qtdParcelas: "",
      primeiroVencimento: "",
    };

    const numero = form.numeroApolice.trim();
    if (!numero) {
      errors.numeroApolice = "Informe o número da apólice.";
    } else if (!editingApolice && apoliceNumbers.has(numero.toLowerCase())) {
      errors.numeroApolice = "Número de apólice já cadastrado.";
    } else if (numero.length > 50) {
      errors.numeroApolice = "Máximo de 50 caracteres.";
    }

    if (!form.dataEmissao) errors.dataEmissao = "Informe a data de emissão.";
    if (!form.vigenciaInicio)
      errors.vigenciaInicio = "Informe o início da vigência.";
    if (!form.vigenciaFim) errors.vigenciaFim = "Informe o fim da vigência.";

    const valor = Number(form.valor);
    if (!form.valor || Number.isNaN(valor) || valor <= 0) {
      errors.valor = "Informe um valor válido.";
    }

    if (!form.tipoContrato.trim()) {
      errors.tipoContrato = "Informe o tipo de contrato.";
    } else if (form.tipoContrato.length > 50) {
      errors.tipoContrato = "Máximo de 50 caracteres.";
    }

    if (!form.idSeguradora) errors.idSeguradora = "Selecione a seguradora.";
    if (!form.idProduto) errors.idProduto = "Selecione o produto.";

    if (!corretorIdSelecionado) {
      errors.corretor = "Selecione o corretor.";
    }

    const parcelasAtivas = parcelas.filter((p) => !p.remover);
    if (parcelasAtivas.length === 0) {
      errors.parcelas = "Gere ao menos uma parcela.";
      if (!qtdParcelas) errors.qtdParcelas = "Informe a quantidade.";
      if (!primeiroVencimento)
        errors.primeiroVencimento = "Informe o 1º vencimento.";
    }

    const parcelaErrs: Record<string, string> = {};
    parcelasAtivas.forEach((p) => {
      if (!p.dataVencimento || !p.valorParcela) {
        parcelaErrs[p.id] = "Preencha data e valor.";
        return;
      }
      const valorParcela = Number(p.valorParcela);
      if (Number.isNaN(valorParcela) || valorParcela <= 0) {
        parcelaErrs[p.id] = "Valor válido é obrigatório.";
      }
    });

    setFormErrors(errors);
    setParcelaErrors(parcelaErrs);

    return (
      !Object.values(errors).some((e) => e) &&
      Object.keys(parcelaErrs).length === 0
    );
  }

  async function handleSave() {
    if (!selectedCliente) return;
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      const corretorId = Number(corretorIdSelecionado);
      const corretorJaVinculado = corretoresVinculados.some(
        (c) => c.idCorretor === corretorId,
      );

      if (!corretorJaVinculado) {
        await vincularCorretorCliente(corretorId, selectedCliente.idCliente);
      }

      const idCorretorCliente = await resolverCorretorClienteId(
        corretorId,
        selectedCliente.idCliente,
      );

      if (!idCorretorCliente) {
        setError(
          "Não foi possível resolver o vínculo do corretor com o cliente.",
        );
        return;
      }

      const parcelasPayload = parcelas.map((p) => ({
        idParcela: p.idParcela ?? null,
        dataVencimento: p.dataVencimento,
        valorParcela: Number(p.valorParcela),
        remover: Boolean(p.remover),
      }));

      const payload = {
        numeroApolice: form.numeroApolice.trim(),
        dataEmissao: form.dataEmissao,
        vigenciaInicio: form.vigenciaInicio,
        vigenciaFim: form.vigenciaFim,
        valor: Number(form.valor),
        comissaoPercentual: Number(form.comissaoPercentual),
        tipoContrato: form.tipoContrato.trim(),
        idCorretorCliente,
        idProduto: Number(form.idProduto),
        idSeguradora: Number(form.idSeguradora),
        coberturas: [],
        beneficiarios: [],
        parcelas: parcelasPayload,
      };

      if (editingApolice) {
        const updated = await atualizarApolice(
          editingApolice.idApolice,
          payload,
        );

        // adiciona parcelas novas (sem idParcela)
        const novas = parcelas.filter((p) => !p.idParcela && !p.remover);
        for (const parcela of novas) {
          await adicionarParcela(updated.idApolice, {
            numeroParcela: Number(parcela.numeroParcela),
            dataVencimento: parcela.dataVencimento,
            valorParcela: Number(parcela.valorParcela),
          });
        }

        const refreshed = await buscarApolice(updated.idApolice);

        setParcelasPorApolice((prev) => ({
          ...prev,
          [updated.idApolice]: refreshed.parcelas ?? [],
        }));

        setApolices((prev) =>
          prev.map((a) => (a.idApolice === updated.idApolice ? refreshed : a)),
        );

        if (selectedCliente) {
          setApolicesPorCliente((prev) => ({
            ...prev,
            [selectedCliente.idCliente]: (
              prev[selectedCliente.idCliente] ?? []
            ).map((a) => (a.idApolice === updated.idApolice ? refreshed : a)),
          }));
        }

        setSuccess("Apólice atualizada com sucesso.");
        setTimeout(() => setSuccess(""), 3000);
        closeModal();
        return;
      }

      const created = await criarApolice(payload);

      const parcelasSalvas: ParcelaResponse[] = [];

      for (const parcela of parcelas.filter((p) => !p.remover)) {
        const saved = await adicionarParcela(created.idApolice, {
          numeroParcela: Number(parcela.numeroParcela),
          dataVencimento: parcela.dataVencimento,
          valorParcela: Number(parcela.valorParcela),
        });
        parcelasSalvas.push(saved);
      }

      setParcelasPorApolice((prev) => ({
        ...prev,
        [created.idApolice]: parcelasSalvas,
      }));

      setApolices((prev) => [...prev, created]);

      if (selectedCliente) {
        setApolicesPorCliente((prev) => ({
          ...prev,
          [selectedCliente.idCliente]: [
            ...(prev[selectedCliente.idCliente] ?? []),
            created,
          ],
        }));
      }

      setSuccess("Apólice cadastrada com sucesso.");
      setTimeout(() => setSuccess(""), 3000);
      closeModal();
    } catch {
      setError("Erro ao salvar apólice.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExcluirApolice() {
    if (!modalExcluir.apolice) return;

    try {
      await excluirApolice(modalExcluir.apolice.idApolice);
      setApolices((prev) =>
        prev.filter((a) => a.idApolice !== modalExcluir.apolice?.idApolice),
      );
      setApolicesPorCliente((prev) => {
        const updated: Record<number, ApoliceResponse[]> = {};
        for (const key of Object.keys(prev)) {
          const id = Number(key);
          updated[id] = prev[id].filter(
            (a) => a.idApolice !== modalExcluir.apolice?.idApolice,
          );
        }
        return updated;
      });
      setModalExcluir({ open: false });
      setSuccess("Apólice excluída com sucesso.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Erro ao excluir apólice.");
    }
  }

  const parcelasEditaveis = parcelas.filter((p) => !p.remover);

  return (
    <MainLayout title="Apólices">
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
                <div className="mt-4 hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="text-left text-gray-500 border-b">
                      <tr>
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">CPF/CNPJ</th>
                        <th className="py-2 pr-4">Nascimento</th>
                        <th className="py-2 pr-4">Telefone</th>
                        <th className="py-2 pr-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedClientes.map((c) => {
                        const apolicesDoCliente =
                          apolicesPorCliente[c.idCliente] ?? [];
                        const expanded = !!expandedClientes[c.idCliente];

                        return (
                          <Fragment key={c.idCliente}>
                            <tr>
                              <td className="py-2 pr-4 font-semibold text-brand-dark">
                                {c.nome}
                              </td>
                              <td className="py-2 pr-4">{c.cpfCnpj}</td>
                              <td className="py-2 pr-4">{c.dataNascimento}</td>
                              <td className="py-2 pr-4">{c.telefone}</td>
                              <td className="py-2 pr-4">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => toggleCliente(c.idCliente)}
                                    className="text-xs px-3 py-1 rounded border border-gray-300 flex items-center gap-1"
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
                                  <button
                                    onClick={() => openModal(c)}
                                    className="text-xs px-3 py-1 rounded border border-gray-300"
                                  >
                                    ➕ Cadastrar apólice
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {expanded && (
                              <tr>
                                <td colSpan={5} className="pb-4">
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
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={() =>
                                                            openModal(c, a)
                                                          }
                                                          className="text-xs px-2 py-1 rounded border border-gray-300"
                                                        >
                                                          ✏️ Editar
                                                        </button>
                                                        <button
                                                          onClick={() =>
                                                            setModalExcluir({
                                                              open: true,
                                                              apolice: a,
                                                            })
                                                          }
                                                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 border border-red-200"
                                                        >
                                                          🗑 Excluir
                                                        </button>
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
                                                      </div>
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
                                                                          <input
                                                                            type="date"
                                                                            value={
                                                                              p.dataPagamento ??
                                                                              ""
                                                                            }
                                                                            onChange={(
                                                                              e,
                                                                            ) => {
                                                                              if (
                                                                                parcelaId
                                                                              ) {
                                                                                handlePagamentoParcela(
                                                                                  a.idApolice,
                                                                                  parcelaId,
                                                                                  e
                                                                                    .target
                                                                                    .value,
                                                                                );
                                                                              }
                                                                            }}
                                                                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                                                                          />
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
              </>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={modalExcluir.open}
        title="Excluir apólice"
        message="Deseja excluir esta apólice? Esta ação não poderá ser desfeita."
        onConfirm={handleExcluirApolice}
        onCancel={() => setModalExcluir({ open: false })}
      />

      {modalOpen && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-brand-dark">
                  {editingApolice ? "Editar Apólice" : "Nova Apólice"}
                </h3>
                <p className="text-sm text-gray-500">
                  Cliente: {selectedCliente.nome} • {selectedCliente.cpfCnpj}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-sm px-3 py-1 rounded border border-gray-300"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-brand-dark">
                  Número da apólice
                </label>
                <input
                  value={form.numeroApolice}
                  onChange={(e) =>
                    setForm({ ...form, numeroApolice: e.target.value })
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                    formErrors.numeroApolice
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                />
                {formErrors.numeroApolice && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.numeroApolice}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-dark">
                  Corretor
                </label>
                <select
                  value={corretorIdSelecionado}
                  onChange={(e) => setCorretorIdSelecionado(e.target.value)}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 bg-white ${
                    formErrors.corretor ? "border-red-400" : "border-gray-300"
                  }`}
                  disabled={corretoresVinculados.length === 0}
                >
                  <option value="">Selecione</option>
                  {corretoresVinculados.map((c) => (
                    <option key={c.idCorretor} value={c.idCorretor}>
                      {c.nomeCorretor}
                    </option>
                  ))}
                </select>
                {formErrors.corretor && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.corretor}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-dark">
                  Tipo de contrato
                </label>
                <input
                  value={form.tipoContrato}
                  onChange={(e) =>
                    setForm({ ...form, tipoContrato: e.target.value })
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                    formErrors.tipoContrato
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                />
                {formErrors.tipoContrato && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.tipoContrato}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-dark">
                  Data de emissão
                </label>
                <input
                  type="date"
                  value={form.dataEmissao}
                  onChange={(e) =>
                    setForm({ ...form, dataEmissao: e.target.value })
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                    formErrors.dataEmissao
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                />
                {formErrors.dataEmissao && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.dataEmissao}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-dark">
                  Início da vigência
                </label>
                <input
                  type="date"
                  value={form.vigenciaInicio}
                  onChange={(e) =>
                    setForm({ ...form, vigenciaInicio: e.target.value })
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                    formErrors.vigenciaInicio
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                />
                {formErrors.vigenciaInicio && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.vigenciaInicio}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-dark">
                  Fim da vigência
                </label>
                <input
                  type="date"
                  value={form.vigenciaFim}
                  onChange={(e) =>
                    setForm({ ...form, vigenciaFim: e.target.value })
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                    formErrors.vigenciaFim
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                />
                {formErrors.vigenciaFim && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.vigenciaFim}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-dark">
                  Valor
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                    formErrors.valor ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {formErrors.valor && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.valor}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-dark">
                  Seguradora
                </label>
                <select
                  value={form.idSeguradora}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      idSeguradora: e.target.value,
                      idProduto: "",
                    })
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 bg-white ${
                    formErrors.idSeguradora
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                >
                  <option value="">Selecione</option>
                  {seguradoras.map((s) => (
                    <option key={s.idSeguradora} value={s.idSeguradora}>
                      {s.nomeSeguradora}
                    </option>
                  ))}
                </select>
                {formErrors.idSeguradora && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.idSeguradora}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-dark">
                  Produto
                </label>
                <select
                  value={form.idProduto}
                  onChange={(e) =>
                    setForm({ ...form, idProduto: e.target.value })
                  }
                  className={`mt-1 w-full rounded-lg border px-3 py-2 bg-white ${
                    formErrors.idProduto ? "border-red-400" : "border-gray-300"
                  }`}
                  disabled={!form.idSeguradora}
                >
                  <option value="">Selecione</option>
                  {produtosDisponiveis.map((p) => (
                    <option key={p.idProduto} value={p.idProduto}>
                      {p.nomeProduto} — {p.tipoProduto}
                    </option>
                  ))}
                </select>
                {formErrors.idProduto && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.idProduto}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-brand-dark">
                Gerar parcelas
              </h4>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    value={qtdParcelas}
                    onChange={(e) => setQtdParcelas(e.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                      formErrors.qtdParcelas
                        ? "border-red-400"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.qtdParcelas && (
                    <p className="text-xs text-red-600 mt-1">
                      {formErrors.qtdParcelas}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    1º vencimento
                  </label>
                  <input
                    type="date"
                    value={primeiroVencimento}
                    onChange={(e) => setPrimeiroVencimento(e.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                      formErrors.primeiroVencimento
                        ? "border-red-400"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.primeiroVencimento && (
                    <p className="text-xs text-red-600 mt-1">
                      {formErrors.primeiroVencimento}
                    </p>
                  )}
                </div>

                <div className="flex items-end">
                  <button
                    onClick={gerarParcelas}
                    className="w-full text-sm px-4 py-2 rounded-lg border border-gray-300"
                  >
                    Gerar parcelas
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-brand-dark">
                  Parcelas (editáveis)
                </h4>

                {formErrors.parcelas && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.parcelas}
                  </p>
                )}

                <div className="mt-3 space-y-3">
                  {parcelasEditaveis.map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-1 md:grid-cols-4 gap-3"
                    >
                      <input
                        type="text"
                        value={p.numeroParcela}
                        disabled
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      />
                      <input
                        type="date"
                        value={p.dataVencimento}
                        onChange={(e) =>
                          updateParcela(p.id, "dataVencimento", e.target.value)
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Valor"
                        value={p.valorParcela}
                        onChange={(e) =>
                          updateParcela(p.id, "valorParcela", e.target.value)
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2"
                      />
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => removeParcela(p.id)}
                          className="text-xs px-3 py-2 rounded bg-red-50 text-red-600"
                        >
                          Remover
                        </button>
                        {parcelaErrors[p.id] && (
                          <span className="text-xs text-red-600">
                            {parcelaErrors[p.id]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="text-sm px-4 py-2 rounded-lg bg-brand-dark text-white disabled:opacity-70"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar apólice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
