import { Fragment, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ui/ConfirmModal";
import {
  atualizarCorretor,
  criarCorretor,
  excluirCorretor,
  listarCorretores,
  type CorretorPayload,
  type CorretorResponse,
} from "../services/corretorService";
import {
  listarUsuarios,
  type UsuarioResponse,
} from "../services/usuarioService"



const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const initialForm: CorretorPayload = {
  idUsuario: null,
  nomeCorretor: "",
  corretora: "",
  cpfCnpj: "",
  susepPj: "",
  susepPf: "",
  email: "",
  telefone: "",
  uf: "",
  dataNascimento: "",
  doc: "",
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskCpfCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^(\d{2})\s(\d{4})(\d)/, "($1) $2-$3");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^(\d{2})\s(\d{5})(\d)/, "($1) $2-$3");
}

function isEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPhoneValid(phone: string) {
  const digits = onlyDigits(phone);
  return digits.length === 10 || digits.length === 11;
}

export default function Corretores() {
  const [corretores, setCorretores] = useState<CorretorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<CorretorPayload>(initialForm);

  const [fieldErrors, setFieldErrors] = useState({
    idUsuario: "",
    nomeCorretor: "",
    corretora: "",
    cpfCnpj: "",
    susepPj: "",
    susepPf: "",
    email: "",
    telefone: "",
    uf: "",
    doc: "",
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CorretorPayload>(initialForm);

  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchDigits = onlyDigits(searchTerm);

  const filteredCorretores = corretores.filter((c) => {
    const nameMatch = c.nomeCorretor.toLowerCase().includes(normalizedSearch);
    const cpfMatch = searchDigits
      ? onlyDigits(c.cpfCnpj ?? "").includes(searchDigits)
      : false;
    return normalizedSearch ? nameMatch || cpfMatch : true;
  });

  const sortedCorretores = [...filteredCorretores].sort((a, b) =>
    a.nomeCorretor.localeCompare(b.nomeCorretor, "pt-BR"),
  );

  const totalPages = Math.max(1, Math.ceil(sortedCorretores.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedCorretores = sortedCorretores.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function carregar() {
    setError("");
    setLoading(true);
    try {
      const data = await listarCorretores();
      setCorretores(data);
    } catch {
      setError("Não foi possível carregar os corretores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function handleChange<K extends keyof CorretorPayload>(
    key: K,
    value: CorretorPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateForm(payload: CorretorPayload) {
    const errors = {
      idUsuario: "",
      nomeCorretor: "",
      corretora: "",
      cpfCnpj: "",
      susepPj: "",
      susepPf: "",
      email: "",
      telefone: "",
      uf: "",
      doc: "",
    };

    if (!payload.idUsuario) {
      errors.idUsuario = "Informe o ID do usuário.";
    }
    if (!payload.nomeCorretor.trim()) {
      errors.nomeCorretor = "Informe o nome do corretor.";
    }
    if (payload.nomeCorretor.length > 150) {
      errors.nomeCorretor = "Máximo de 150 caracteres.";
    }
    if (payload.corretora && payload.corretora.length > 150) {
      errors.corretora = "Máximo de 150 caracteres.";
    }

    const cpfCnpjDigits = onlyDigits(payload.cpfCnpj ?? "");
    if (
      payload.cpfCnpj &&
      !(cpfCnpjDigits.length === 11 || cpfCnpjDigits.length === 14)
    ) {
      errors.cpfCnpj = "CPF deve ter 11 ou CNPJ 14 dígitos.";
    }
    if (payload.cpfCnpj && payload.cpfCnpj.length > 18) {
      errors.cpfCnpj = "Máximo de 18 caracteres.";
    }

    if (payload.susepPj && payload.susepPj.length > 50) {
      errors.susepPj = "Máximo de 50 caracteres.";
    }
    if (payload.susepPf && payload.susepPf.length > 50) {
      errors.susepPf = "Máximo de 50 caracteres.";
    }

    if (payload.email) {
      if (!isEmailValid(payload.email)) {
        errors.email = "E-mail inválido.";
      }
      if (payload.email.length > 150) {
        errors.email = "Máximo de 150 caracteres.";
      }
    }

    if (payload.telefone) {
      if (!isPhoneValid(payload.telefone)) {
        errors.telefone = "Telefone deve ter 10 ou 11 dígitos.";
      }
      if (payload.telefone.length > 20) {
        errors.telefone = "Máximo de 20 caracteres.";
      }
    }

    if (payload.uf && payload.uf.length !== 2) {
      errors.uf = "UF deve ter 2 letras.";
    }

    if (payload.doc && payload.doc.length > 1000) {
      errors.doc = "Máximo de 1000 caracteres.";
    }

    return errors;
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

    try {
      setIsSaving(true);
      const created = await criarCorretor(form);
      setCorretores((prev) => [...prev, created]);
      setForm(initialForm);
      showSuccess("Corretor cadastrado com sucesso.");
    } catch {
      setError("Erro ao cadastrar corretor.");
    } finally {
      setIsSaving(false);
    }
  }

  function iniciarEdicao(c: CorretorResponse) {
    setEditId(c.idCorretor);
    setEditForm({
      idUsuario: c.idUsuario ?? null,
      nomeCorretor: c.nomeCorretor ?? "",
      corretora: c.corretora ?? "",
      cpfCnpj: c.cpfCnpj ?? "",
      susepPj: c.susepPj ?? "",
      susepPf: c.susepPf ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      uf: c.uf ?? "",
      dataNascimento: c.dataNascimento ?? "",
      doc: c.doc ?? "",
    });
  }

  async function salvarEdicao(id: number) {
    const errors = validateForm(editForm);

    if (Object.values(errors).some((e) => e)) return;

    try {
      setUpdatingId(id);
      const updated = await atualizarCorretor(id, editForm);
      setCorretores((prev) =>
        prev.map((c) => (c.idCorretor === id ? updated : c)),
      );
      setEditId(null);
      showSuccess("Corretor atualizado com sucesso.");
    } catch {
      setError("Erro ao atualizar corretor.");
    } finally {
      setUpdatingId(null);
    }
  }

  function abrirModalExcluir(id: number) {
    setModal({
      open: true,
      title: "Excluir corretor",
      message:
        "Deseja excluir este corretor? Esta ação não poderá ser desfeita.",
      onConfirm: async () => {
        try {
          setDeletingId(id);
          await excluirCorretor(id);
          setCorretores((prev) => prev.filter((c) => c.idCorretor !== id));
          showSuccess("Corretor excluído com sucesso.");
        } catch {
          setError("Erro ao excluir corretor.");
        } finally {
          setDeletingId(null);
          setModal((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }

  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])

  useEffect(() => {
    async function loadUsuarios() {
      try {
        const data = await listarUsuarios()
        setUsuarios(data.filter((u) => u.perfil === "CORRETOR"))
      } catch {
        setUsuarios([])
      }
    }

    loadUsuarios()
  }, [])

  const usuariosVinculados = new Set(
  corretores.map((c) => c.idUsuario).filter(Boolean) as number[],
  )

  function getUsuariosDisponiveis(currentId?: number | null) {
    return usuarios.filter(
      (u) => !usuariosVinculados.has(u.idUsuario) || u.idUsuario === currentId,
    )
  }

  return (
    <MainLayout title="Corretores">
      <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-brand-dark">Novo Corretor</h2>

        <form
          className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={handleCriar}
        >

        <div>
        <label className="text-sm font-medium text-brand-dark">
          Usuário (perfil CORRETOR)
        </label>
        <select
          value={form.idUsuario ?? ""}
          onChange={(e) =>
            handleChange(
              "idUsuario",
              e.target.value ? Number(e.target.value) : null,
            )
          }
          className={`mt-1 w-full rounded-lg border px-3 py-2 bg-white focus:outline-none focus:ring-2 ${
            fieldErrors.idUsuario
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:ring-brand-light"
          }`}
        >
          <option value="">Selecione um usuário</option>
          {getUsuariosDisponiveis().map((u) => (
            <option key={u.idUsuario} value={u.idUsuario}>
              {u.nome} • {u.email}
            </option>
          ))}
        </select>
        {fieldErrors.idUsuario && (
          <p className="text-xs text-red-600 mt-1">{fieldErrors.idUsuario}</p>
        )}
      </div>  

          <div>
            <label className="text-sm font-medium text-brand-dark">
              Nome do corretor
            </label>
            <input
              value={form.nomeCorretor}
              onChange={(e) => handleChange("nomeCorretor", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                fieldErrors.nomeCorretor
                  ? "border-red-400 focus:ring-red-300"
                  : "border-gray-300 focus:ring-brand-light"
              }`}
            />
            {fieldErrors.nomeCorretor && (
              <p className="text-xs text-red-600 mt-1">
                {fieldErrors.nomeCorretor}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">
              Corretora
            </label>
            <input
              value={form.corretora ?? ""}
              onChange={(e) => handleChange("corretora", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.corretora ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.corretora && (
              <p className="text-xs text-red-600 mt-1">
                {fieldErrors.corretora}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">
              CPF/CNPJ
            </label>
            <input
              value={form.cpfCnpj ?? ""}
              onChange={(e) =>
                handleChange("cpfCnpj", maskCpfCnpj(e.target.value))
              }
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.cpfCnpj ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.cpfCnpj && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.cpfCnpj}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">
              SUSEP PJ
            </label>
            <input
              value={form.susepPj ?? ""}
              onChange={(e) => handleChange("susepPj", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.susepPj ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.susepPj && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.susepPj}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">
              SUSEP PF
            </label>
            <input
              value={form.susepPf ?? ""}
              onChange={(e) => handleChange("susepPf", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.susepPf ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.susepPf && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.susepPf}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">Email</label>
            <input
              value={form.email ?? ""}
              onChange={(e) => handleChange("email", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.email ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">
              Telefone
            </label>
            <input
              value={form.telefone ?? ""}
              onChange={(e) =>
                handleChange("telefone", maskPhone(e.target.value))
              }
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.telefone ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.telefone && (
              <p className="text-xs text-red-600 mt-1">
                {fieldErrors.telefone}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">UF</label>
            <select
              value={form.uf ?? ""}
              onChange={(e) => handleChange("uf", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 bg-white ${
                fieldErrors.uf ? "border-red-400" : "border-gray-300"
              }`}
            >
              <option value="">Selecione</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {fieldErrors.uf && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.uf}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">
              Data de nascimento
            </label>
            <input
              type="date"
              value={form.dataNascimento ?? ""}
              onChange={(e) => handleChange("dataNascimento", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-brand-dark">
              Documento
            </label>
            <textarea
              value={form.doc ?? ""}
              onChange={(e) => handleChange("doc", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 min-h-[90px] ${
                fieldErrors.doc ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.doc && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.doc}</p>
            )}
          </div>

          <div className="md:col-span-2 mt-4 flex justify-end">
            <button
              className="w-full sm:w-auto sm:min-w-[220px] rounded-lg bg-brand-dark text-white px-4 py-2 hover:bg-brand-light transition disabled:opacity-70"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "➕ Cadastrar corretor"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      <div className="mt-8 bg-white rounded-2xl shadow p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-dark">
              Corretores
            </h2>
            <span className="text-xs text-gray-500">
              {sortedCorretores.length} resultado(s)
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
            {filteredCorretores.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Nenhum corretor encontrado.
              </p>
            ) : (
              <>
                {/* Mobile collapse */}
                <div className="mt-4 md:hidden space-y-3">
                  {paginatedCorretores.map((c) => {
                    const isEditing = editId === c.idCorretor;

                    return (
                      <div
                        key={c.idCorretor}
                        className="border rounded-lg p-4 bg-brand-gray"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-brand-dark">
                              {c.nomeCorretor}
                            </p>
                            <p className="text-xs text-gray-500">
                              {c.cpfCnpj || "-"}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => salvarEdicao(c.idCorretor)}
                                  className="text-xs px-2 py-1 rounded bg-brand-dark text-white disabled:opacity-70"
                                  disabled={updatingId === c.idCorretor}
                                >
                                  {updatingId === c.idCorretor
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
                                <button
                                  onClick={() =>
                                    abrirModalExcluir(c.idCorretor)
                                  }
                                  className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                                >
                                  🗑️ Excluir
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="mt-3 grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-sm font-medium text-brand-dark">
                                Nome
                              </label>
                              <input
                                value={editForm.nomeCorretor}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    nomeCorretor: e.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-brand-dark">
                                CPF/CNPJ
                              </label>
                              <input
                                value={editForm.cpfCnpj ?? ""}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    cpfCnpj: maskCpfCnpj(e.target.value),
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-brand-dark">
                                Email
                              </label>
                              <input
                                value={editForm.email ?? ""}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-brand-dark">
                                Telefone
                              </label>
                              <input
                                value={editForm.telefone ?? ""}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    telefone: maskPhone(e.target.value),
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                              />
                            </div>
                          </div>
                        ) : (
                          <details className="mt-3 text-sm text-gray-600">
                            <summary className="cursor-pointer">
                              Detalhes
                            </summary>
                            <div className="mt-2 grid gap-1">
                              <span>Email: {c.email || "-"}</span>
                              <span>Telefone: {c.telefone || "-"}</span>
                              <span>UF: {c.uf || "-"}</span>
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[1000px]">
                    <thead className="text-left text-gray-500 border-b">
                      <tr>
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Telefone</th>
                        <th className="py-2 pr-4">CPF/CNPJ</th>
                        <th className="py-2 pr-4">UF</th>
                        <th className="py-2 pr-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedCorretores.map((c) => {
                        const isEditing = editId === c.idCorretor;

                        return (
                          <Fragment key={c.idCorretor}>
                            <tr>
                              <td className="py-2 pr-4 font-semibold text-brand-dark">
                                {c.nomeCorretor}
                              </td>
                              <td className="py-2 pr-4">{c.email || "-"}</td>
                              <td className="py-2 pr-4">{c.telefone || "-"}</td>
                              <td className="py-2 pr-4">{c.cpfCnpj || "-"}</td>
                              <td className="py-2 pr-4">{c.uf || "-"}</td>
                              <td className="py-2 pr-4">
                                <div className="flex gap-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() =>
                                          salvarEdicao(c.idCorretor)
                                        }
                                        className="text-sm px-3 py-1 rounded-lg bg-brand-dark text-white disabled:opacity-70"
                                        disabled={updatingId === c.idCorretor}
                                      >
                                        {updatingId === c.idCorretor
                                          ? "Salvando..."
                                          : "💾 Salvar"}
                                      </button>
                                      <button
                                        onClick={() => setEditId(null)}
                                        className="text-sm px-3 py-1 rounded-lg border border-gray-300"
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => iniciarEdicao(c)}
                                        className="text-sm px-3 py-1 rounded-lg border border-gray-300"
                                      >
                                        ✏️ Editar
                                      </button>
                                      <button
                                        onClick={() =>
                                          abrirModalExcluir(c.idCorretor)
                                        }
                                        className="text-sm px-3 py-1 rounded-lg bg-red-600 text-white"
                                      >
                                        🗑️ Excluir
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {isEditing && (
                              <tr>
                                <td colSpan={6} className="pb-4">
                                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-sm font-medium text-brand-dark">
                                        Nome
                                      </label>
                                      <input
                                        value={editForm.nomeCorretor}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            nomeCorretor: e.target.value,
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-brand-dark">
                                        Corretora
                                      </label>
                                      <input
                                        value={editForm.corretora ?? ""}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            corretora: e.target.value,
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-brand-dark">
                                        CPF/CNPJ
                                      </label>
                                      <input
                                        value={editForm.cpfCnpj ?? ""}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            cpfCnpj: maskCpfCnpj(
                                              e.target.value,
                                            ),
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-brand-dark">
                                        SUSEP PJ
                                      </label>
                                      <input
                                        value={editForm.susepPj ?? ""}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            susepPj: e.target.value,
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-brand-dark">
                                        SUSEP PF
                                      </label>
                                      <input
                                        value={editForm.susepPf ?? ""}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            susepPf: e.target.value,
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-brand-dark">
                                        Email
                                      </label>
                                      <input
                                        value={editForm.email ?? ""}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            email: e.target.value,
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-brand-dark">
                                        Telefone
                                      </label>
                                      <input
                                        value={editForm.telefone ?? ""}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            telefone: maskPhone(e.target.value),
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-brand-dark">
                                        UF
                                      </label>
                                      <select
                                        value={editForm.uf ?? ""}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            uf: e.target.value,
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                                      >
                                        <option value="">Selecione</option>
                                        {UFS.map((uf) => (
                                          <option key={uf} value={uf}>
                                            {uf}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-brand-dark">
                                        Data nascimento
                                      </label>
                                      <input
                                        type="date"
                                        value={editForm.dataNascimento ?? ""}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            dataNascimento: e.target.value,
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                      />
                                    </div>

                                    <div className="md:col-span-2">
                                      <label className="text-sm font-medium text-brand-dark">
                                        Documento
                                      </label>
                                      <textarea
                                        value={editForm.doc ?? ""}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            doc: e.target.value,
                                          }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[90px]"
                                      />
                                    </div>
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
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

      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal((prev) => ({ ...prev, open: false }))}
        loading={deletingId !== null}
      />
    </MainLayout>
  );
}
