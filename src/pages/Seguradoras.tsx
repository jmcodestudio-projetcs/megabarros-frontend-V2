import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ui/ConfirmModal";
import {
  atualizarProduto,
  atualizarSeguradora,
  criarProduto,
  criarSeguradora,
  excluirProduto,
  excluirSeguradora,
  listarSeguradoras,
} from "../services/seguradoraService";
import type { SeguradoraResponse } from "../services/seguradoraService";

export default function Seguradoras() {
  const [seguradoras, setSeguradoras] = useState<SeguradoraResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [nomeSeguradora, setNomeSeguradora] = useState("");
  const [nomeProduto, setNomeProduto] = useState("");
  const [tipoProduto, setTipoProduto] = useState("");
  const [seguradoraId, setSeguradoraId] = useState<number | "">("");

  const [editId, setEditId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editNomeError, setEditNomeError] = useState("");

  const [editProduto, setEditProduto] = useState<{
    seguradoraId: number;
    idProduto: number;
  } | null>(null);
  const [editProdutoNome, setEditProdutoNome] = useState("");
  const [editProdutoTipo, setEditProdutoTipo] = useState("");
  const [editProdutoError, setEditProdutoError] = useState("");

  const [fieldErrors, setFieldErrors] = useState({
    nomeSeguradora: "",
    seguradoraId: "",
    nomeProduto: "",
    tipoProduto: "",
  });

  const [isCreatingSeg, setIsCreatingSeg] = useState(false);
  const [isCreatingProd, setIsCreatingProd] = useState(false);
  const [updatingSegId, setUpdatingSegId] = useState<number | null>(null);
  const [updatingProdId, setUpdatingProdId] = useState<number | null>(null);
  const [deletingSegId, setDeletingSegId] = useState<number | null>(null);
  const [deletingProdId, setDeletingProdId] = useState<number | null>(null);

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
  const filteredSeguradoras = seguradoras.filter((s) =>
    normalizedSearch
      ? s.nomeSeguradora.toLowerCase().includes(normalizedSearch)
      : true,
  );

  const sortedSeguradoras = [...filteredSeguradoras].sort((a, b) =>
    a.nomeSeguradora.localeCompare(b.nomeSeguradora, "pt-BR"),
  );

  const totalPages = Math.max(
    1,
    Math.ceil(sortedSeguradoras.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedSeguradoras = sortedSeguradoras.slice(
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
      const data = await listarSeguradoras();
      setSeguradoras(data);
    } catch (e) {
      setError("Não foi possível carregar as seguradoras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCriarSeguradora(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors((prev) => ({ ...prev, nomeSeguradora: "" }));
    if (!nomeSeguradora.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        nomeSeguradora: "Informe o nome da seguradora.",
      }));
      return;
    }

    try {
      setIsCreatingSeg(true);
      const criada = await criarSeguradora(nomeSeguradora.trim());
      setNomeSeguradora("");
      setSeguradoras((prev) => [...prev, criada]);
      setSeguradoraId(criada.idSeguradora);
      showSuccess("Seguradora cadastrada com sucesso.");
    } catch {
      setError("Erro ao criar seguradora.");
    } finally {
      setIsCreatingSeg(false);
    }
  }

  async function handleCriarProduto(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({
      nomeSeguradora: "",
      seguradoraId: "",
      nomeProduto: "",
      tipoProduto: "",
    });

    if (!seguradoraId) {
      setFieldErrors((prev) => ({
        ...prev,
        seguradoraId: "Selecione a seguradora.",
      }));
      return;
    }
    if (!nomeProduto.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        nomeProduto: "Informe o nome do produto.",
      }));
      return;
    }
    if (!tipoProduto.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        tipoProduto: "Informe o tipo do produto.",
      }));
      return;
    }

    try {
      setIsCreatingProd(true);
      const produto = await criarProduto(
        seguradoraId,
        nomeProduto.trim(),
        tipoProduto.trim(),
      );
      setNomeProduto("");
      setTipoProduto("");
      setSeguradoras((prev) =>
        prev.map((s) =>
          s.idSeguradora === seguradoraId
            ? { ...s, produtos: [...(s.produtos ?? []), produto] }
            : s,
        ),
      );
      showSuccess("Produto cadastrado com sucesso.");
    } catch {
      setError("Erro ao criar produto.");
    } finally {
      setIsCreatingProd(false);
    }
  }

  function iniciarEdicao(seg: SeguradoraResponse) {
    setEditId(seg.idSeguradora);
    setEditNome(seg.nomeSeguradora);
    setEditNomeError("");
  }

  async function salvarEdicao(id: number) {
    if (!editNome.trim()) {
      setEditNomeError("Informe o nome da seguradora.");
      return;
    }

    try {
      setUpdatingSegId(id);
      const atualizada = await atualizarSeguradora(id, editNome.trim());
      setSeguradoras((prev) =>
        prev.map((s) => (s.idSeguradora === id ? atualizada : s)),
      );
      setEditId(null);
      setEditNome("");
      showSuccess("Seguradora atualizada com sucesso.");
    } catch {
      setError("Erro ao atualizar seguradora.");
    } finally {
      setUpdatingSegId(null);
    }
  }

  function iniciarEdicaoProduto(
    seguradoraId: number,
    idProduto: number,
    nomeProduto: string,
    tipoProduto: string,
  ) {
    setEditProduto({ seguradoraId, idProduto });
    setEditProdutoNome(nomeProduto);
    setEditProdutoTipo(tipoProduto);
    setEditProdutoError("");
  }

  async function salvarEdicaoProduto() {
    if (!editProduto) return;
    if (!editProdutoNome.trim()) {
      setEditProdutoError("Informe o nome do produto.");
      return;
    }
    if (!editProdutoTipo.trim()) {
      setEditProdutoError("Informe o tipo do produto.");
      return;
    }

    try {
      setUpdatingProdId(editProduto.idProduto);
      const atualizado = await atualizarProduto(
        editProduto.seguradoraId,
        editProduto.idProduto,
        editProdutoNome.trim(),
        editProdutoTipo.trim(),
      );

      setSeguradoras((prev) =>
        prev.map((s) =>
          s.idSeguradora === editProduto.seguradoraId
            ? {
                ...s,
                produtos: s.produtos.map((p) =>
                  p.idProduto === editProduto.idProduto ? atualizado : p,
                ),
              }
            : s,
        ),
      );

      setEditProduto(null);
      setEditProdutoNome("");
      setEditProdutoTipo("");
      showSuccess("Produto atualizado com sucesso.");
    } catch {
      setError("Erro ao atualizar produto.");
    } finally {
      setUpdatingProdId(null);
    }
  }

  function abrirModalSeguradora(id: number) {
    setModal({
      open: true,
      title: "Excluir seguradora",
      message:
        "Deseja excluir esta seguradora? Esta ação não poderá ser desfeita.",
      onConfirm: async () => {
        try {
          setDeletingSegId(id);
          await excluirSeguradora(id);
          setSeguradoras((prev) => prev.filter((s) => s.idSeguradora !== id));
          showSuccess("Seguradora excluída com sucesso.");
        } catch {
          setError("Erro ao excluir seguradora.");
        } finally {
          setDeletingSegId(null);
          setModal((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }

  function abrirModalProduto(idProduto: number, idSeguradora: number) {
    setModal({
      open: true,
      title: "Excluir produto",
      message:
        "Deseja excluir este produto? Esta ação não poderá ser desfeita.",
      onConfirm: async () => {
        try {
          setDeletingProdId(idProduto);
          await excluirProduto(idSeguradora, idProduto);
          setSeguradoras((prev) =>
            prev.map((s) =>
              s.idSeguradora === idSeguradora
                ? {
                    ...s,
                    produtos: s.produtos.filter(
                      (p) => p.idProduto !== idProduto,
                    ),
                  }
                : s,
            ),
          );
          showSuccess("Produto excluído com sucesso.");
        } catch {
          setError("Erro ao excluir produto.");
        } finally {
          setDeletingProdId(null);
          setModal((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }

  return (
    <MainLayout title="Seguradoras">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-brand-dark">
            Nova Seguradora
          </h2>
          <form className="mt-4 space-y-3" onSubmit={handleCriarSeguradora}>
            <div>
              <label className="text-sm font-medium text-brand-dark">
                Nome da seguradora
              </label>
              <input
                value={nomeSeguradora}
                onChange={(e) => setNomeSeguradora(e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                  fieldErrors.nomeSeguradora
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-brand-light"
                }`}
                placeholder="Ex: Porto Seguro"
              />
              {fieldErrors.nomeSeguradora && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.nomeSeguradora}
                </p>
              )}
            </div>
            <button
              className="rounded-lg bg-brand-dark text-white px-4 py-2 hover:bg-brand-light transition disabled:opacity-70"
              disabled={isCreatingSeg}
            >
              {isCreatingSeg ? "Salvando..." : "➕ Cadastrar seguradora"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-brand-dark">
            Novo Produto
          </h2>
          <form className="mt-4 space-y-3" onSubmit={handleCriarProduto}>
            <div>
              <label className="text-sm font-medium text-brand-dark">
                Seguradora
              </label>
              <select
                value={seguradoraId}
                onChange={(e) => setSeguradoraId(Number(e.target.value) || "")}
                className={`mt-1 w-full rounded-lg border px-3 py-2 bg-white focus:outline-none focus:ring-2 ${
                  fieldErrors.seguradoraId
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-brand-light"
                }`}
              >
                <option value="">Selecione</option>
                {seguradoras.map((s) => (
                  <option key={s.idSeguradora} value={s.idSeguradora}>
                    {s.nomeSeguradora}
                  </option>
                ))}
              </select>
              {fieldErrors.seguradoraId && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.seguradoraId}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-brand-dark">
                Nome do produto
              </label>
              <input
                value={nomeProduto}
                onChange={(e) => setNomeProduto(e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                  fieldErrors.nomeProduto
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-brand-light"
                }`}
                placeholder="Ex: Auto, Residencial"
              />
              {fieldErrors.nomeProduto && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.nomeProduto}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-brand-dark">
                Tipo do produto
              </label>
              <input
                value={tipoProduto}
                onChange={(e) => setTipoProduto(e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                  fieldErrors.tipoProduto
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-brand-light"
                }`}
                placeholder="Ex: AUTO"
              />
              {fieldErrors.tipoProduto && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.tipoProduto}
                </p>
              )}
            </div>

            <button
              className="rounded-lg bg-brand-dark text-white px-4 py-2 hover:bg-brand-light transition disabled:opacity-70"
              disabled={isCreatingProd}
            >
              {isCreatingProd ? "Salvando..." : "➕ Cadastrar produto"}
            </button>
          </form>
        </div>
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
              Seguradoras
            </h2>
            <span className="text-xs text-gray-500">
              {sortedSeguradoras.length} resultado(s)
            </span>
          </div>

          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por seguradora"
            className="w-full sm:w-80 rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {loading ? (
          <p className="mt-2 text-sm text-gray-500">Carregando...</p>
        ) : (
          <>
            {filteredSeguradoras.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Nenhuma seguradora encontrada.
              </p>
            ) : (
              <>
                {/* Mobile collapse */}
                <div className="mt-4 md:hidden space-y-3">
                  {paginatedSeguradoras.map((s) => (
                    <div
                      key={s.idSeguradora}
                      className="border rounded-lg p-4 bg-brand-gray"
                    >
                      <div className="flex items-center justify-between">
                        {editId === s.idSeguradora ? (
                          <input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          />
                        ) : (
                          <p className="font-semibold text-brand-dark">
                            {s.nomeSeguradora}
                          </p>
                        )}

                        <div className="flex gap-2">
                          {editId === s.idSeguradora ? (
                            <>
                              <button
                                onClick={() => salvarEdicao(s.idSeguradora)}
                                className="text-xs px-2 py-1 rounded bg-brand-dark text-white"
                              >
                                💾 Salvar
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
                                onClick={() => iniciarEdicao(s)}
                                className="text-xs px-2 py-1 rounded border border-gray-300"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() =>
                                  abrirModalSeguradora(s.idSeguradora)
                                }
                                className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                              >
                                🗑 Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <details className="mt-3 text-sm text-gray-600">
                        <summary className="cursor-pointer">Produtos</summary>
                        <div className="mt-2 space-y-2">
                          {s.produtos?.length ? (
                            s.produtos.map((p) => {
                              const isEditing =
                                editProduto?.idProduto === p.idProduto &&
                                editProduto?.seguradoraId === s.idSeguradora;

                              return (
                                <div
                                  key={p.idProduto}
                                  className="bg-white rounded px-3 py-2 border"
                                >
                                  {isEditing ? (
                                    <div className="flex flex-col gap-2">
                                      <input
                                        value={editProdutoNome}
                                        onChange={(e) =>
                                          setEditProdutoNome(e.target.value)
                                        }
                                        className="rounded border px-2 py-1"
                                      />
                                      <input
                                        value={editProdutoTipo}
                                        onChange={(e) =>
                                          setEditProdutoTipo(e.target.value)
                                        }
                                        className="rounded border px-2 py-1"
                                      />
                                      {editProdutoError && (
                                        <p className="text-xs text-red-600">
                                          {editProdutoError}
                                        </p>
                                      )}
                                      <div className="flex gap-2">
                                        <button
                                          onClick={salvarEdicaoProduto}
                                          className="text-xs px-2 py-1 rounded bg-brand-dark text-white"
                                        >
                                          💾 Salvar
                                        </button>
                                        <button
                                          onClick={() => setEditProduto(null)}
                                          className="text-xs px-2 py-1 rounded border border-gray-300"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span>
                                        {p.nomeProduto} — {p.tipoProduto}
                                      </span>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() =>
                                            iniciarEdicaoProduto(
                                              s.idSeguradora,
                                              p.idProduto,
                                              p.nomeProduto,
                                              p.tipoProduto,
                                            )
                                          }
                                          className="text-xs px-2 py-1 rounded border border-gray-300"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() =>
                                            abrirModalProduto(
                                              p.idProduto,
                                              s.idSeguradora,
                                            )
                                          }
                                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <span>Nenhum produto</span>
                          )}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[820px]">
                    <thead className="text-left text-gray-500 border-b">
                      <tr>
                        <th className="py-2 pr-4">Seguradora</th>
                        <th className="py-2 pr-4">Produtos</th>
                        <th className="py-2 pr-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedSeguradoras.map((s) => (
                        <tr key={s.idSeguradora}>
                          <td className="py-2 pr-4">
                            {editId === s.idSeguradora ? (
                              <input
                                value={editNome}
                                onChange={(e) => setEditNome(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                              />
                            ) : (
                              <span className="font-semibold text-brand-dark">
                                {s.nomeSeguradora}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-gray-600">
                            {s.produtos?.length ?? 0}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex gap-2">
                              {editId === s.idSeguradora ? (
                                <>
                                  <button
                                    onClick={() => salvarEdicao(s.idSeguradora)}
                                    className="text-sm px-3 py-1 rounded-lg bg-brand-dark text-white"
                                  >
                                    💾 Salvar
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
                                    onClick={() => iniciarEdicao(s)}
                                    className="text-sm px-3 py-1 rounded-lg border border-gray-300"
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    onClick={() =>
                                      abrirModalSeguradora(s.idSeguradora)
                                    }
                                    className="text-sm px-3 py-1 rounded-lg bg-red-600 text-white"
                                  >
                                    🗑 Excluir
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
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
        loading={deletingSegId !== null || deletingProdId !== null}
      />
    </MainLayout>
  );
}
