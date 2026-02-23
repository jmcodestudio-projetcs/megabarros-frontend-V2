import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ui/ConfirmModal";
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  excluirUsuario,
  type UsuarioResponse,
  type UsuarioCreatePayload,
  type UsuarioUpdatePayload,
} from "../services/usuarioService";
import { getAuth } from "../services/tokenStorage";

const initialForm: UsuarioCreatePayload = {
  nome: "",
  email: "",
  senha: "",
  perfil: "USUARIO",
  ativo: true,
  mustChangePassword: false,
};

const PERFIS = ["ADMIN", "USUARIO", "CORRETOR"];

function isEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Usuarios() {
  const role = getAuth()?.role?.toUpperCase();
  const isAdmin = role === "ADMIN";

  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<UsuarioCreatePayload>(initialForm);

  const [fieldErrors, setFieldErrors] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: "",
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UsuarioUpdatePayload>({});
  const [editErrors, setEditErrors] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await listarUsuarios();
        setUsuarios(data);
      } catch {
        setError("Não foi possível carregar os usuários.");
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin) load();
  }, [isAdmin]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  function validateCreate(payload: UsuarioCreatePayload) {
    const errors = { nome: "", email: "", senha: "", perfil: "" };

    if (!payload.nome.trim()) {
      errors.nome = "Informe o nome.";
    } else if (payload.nome.length > 100) {
      errors.nome = "Máximo de 100 caracteres.";
    }

    if (!payload.email.trim()) {
      errors.email = "Informe o e-mail.";
    } else if (!isEmailValid(payload.email)) {
      errors.email = "E-mail inválido.";
    } else if (payload.email.length > 150) {
      errors.email = "Máximo de 150 caracteres.";
    }

    if (!payload.senha.trim()) {
      errors.senha = "Informe a senha.";
    } else if (payload.senha.length < 12) {
      errors.senha = "Senha deve ter no mínimo 12 caracteres.";
    } else if (payload.senha.length > 100) {
      errors.senha = "Máximo de 100 caracteres.";
    }

    if (!payload.perfil.trim()) {
      errors.perfil = "Selecione o perfil.";
    }

    return errors;
  }

  function validateUpdate(payload: UsuarioUpdatePayload) {
    const errors = { nome: "", email: "", senha: "", perfil: "" };

    if (payload.nome && payload.nome.length > 100) {
      errors.nome = "Máximo de 100 caracteres.";
    }

    if (payload.email && !isEmailValid(payload.email)) {
      errors.email = "E-mail inválido.";
    } else if (payload.email && payload.email.length > 150) {
      errors.email = "Máximo de 150 caracteres.";
    }

    if (payload.senha && payload.senha.length < 12) {
      errors.senha = "Senha deve ter no mínimo 12 caracteres.";
    } else if (payload.senha && payload.senha.length > 100) {
      errors.senha = "Máximo de 100 caracteres.";
    }

    if (payload.perfil && !payload.perfil.trim()) {
      errors.perfil = "Selecione o perfil.";
    }

    return errors;
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();

    const payload: UsuarioCreatePayload = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      senha: form.senha.trim(),
      perfil: form.perfil.trim(),
      ativo: Boolean(form.ativo),
      mustChangePassword: Boolean(form.mustChangePassword),
    };

    const errors = validateCreate(payload);
    setFieldErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

    try {
      setIsSaving(true);
      const created = await criarUsuario(payload);
      setUsuarios((prev) => [...prev, created]);
      setForm(initialForm);
      showSuccess("Usuário cadastrado com sucesso.");
    } catch {
      setError("Erro ao cadastrar usuário.");
    } finally {
      setIsSaving(false);
    }
  }

  function iniciarEdicao(u: UsuarioResponse) {
    setEditId(u.idUsuario);
    setEditForm({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      ativo: u.ativo,
      mustChangePassword: u.mustChangePassword,
    });
    setEditErrors({ nome: "", email: "", senha: "", perfil: "" });
  }

  async function salvarEdicao(id: number) {
    const errors = validateUpdate(editForm);
    setEditErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

    try {
      setUpdatingId(id);
      const updated = await atualizarUsuario(id, editForm);
      setUsuarios((prev) =>
        prev.map((u) => (u.idUsuario === id ? updated : u)),
      );
      setEditId(null);
      showSuccess("Usuário atualizado com sucesso.");
    } catch {
      setError("Erro ao atualizar usuário.");
    } finally {
      setUpdatingId(null);
    }
  }

  function abrirModalExcluir(id: number) {
    setModal({
      open: true,
      title: "Excluir usuário",
      message:
        "Deseja excluir este usuário? Esta ação não poderá ser desfeita.",
      onConfirm: async () => {
        try {
          setDeletingId(id);
          await excluirUsuario(id);
          setUsuarios((prev) => prev.filter((u) => u.idUsuario !== id));
          showSuccess("Usuário excluído com sucesso.");
        } catch {
          setError("Erro ao excluir usuário.");
        } finally {
          setDeletingId(null);
          setModal((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }

  if (!isAdmin) {
    return (
      <MainLayout title="Usuários">
        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
          <p className="text-sm text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Usuários">
      <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-brand-dark">Novo Usuário</h2>

        <form
          className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={handleCriar}
        >
          <div>
            <label className="text-sm font-medium text-brand-dark">Nome</label>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.nome ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.nome && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.nome}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">
              E-mail
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.email ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">Senha</label>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.senha ? "border-red-400" : "border-gray-300"
              }`}
            />
            {fieldErrors.senha && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.senha}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-dark">
              Perfil
            </label>
            <select
              value={form.perfil}
              onChange={(e) => setForm({ ...form, perfil: e.target.value })}
              className={`mt-1 w-full rounded-lg border px-3 py-2 bg-white ${
                fieldErrors.perfil ? "border-red-400" : "border-gray-300"
              }`}
            >
              {PERFIS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {fieldErrors.perfil && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.perfil}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            <span className="text-sm text-gray-700">Ativo</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.mustChangePassword}
              onChange={(e) =>
                setForm({ ...form, mustChangePassword: e.target.checked })
              }
            />
            <span className="text-sm text-gray-700">Exigir troca de senha</span>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              className="rounded-lg bg-brand-dark text-white px-4 py-2 hover:bg-brand-light transition disabled:opacity-70"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "➕ Cadastrar usuário"}
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
        <h2 className="text-lg font-semibold text-brand-dark">Usuários</h2>

        {loading ? (
          <p className="mt-2 text-sm text-gray-500">Carregando...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Perfil</th>
                  <th className="py-2 pr-4">Ativo</th>
                  <th className="py-2 pr-4">Trocar senha</th>
                  <th className="py-2 pr-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {usuarios.map((u) => {
                  const isEditing = editId === u.idUsuario;
                  return (
                    <tr key={u.idUsuario}>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <input
                            value={editForm.nome ?? ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, nome: e.target.value })
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1"
                          />
                        ) : (
                          u.nome
                        )}
                        {isEditing && editErrors.nome && (
                          <p className="text-xs text-red-600 mt-1">
                            {editErrors.nome}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <input
                            value={editForm.email ?? ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                email: e.target.value,
                              })
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1"
                          />
                        ) : (
                          u.email
                        )}
                        {isEditing && editErrors.email && (
                          <p className="text-xs text-red-600 mt-1">
                            {editErrors.email}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <select
                            value={editForm.perfil ?? "USUARIO"}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                perfil: e.target.value,
                              })
                            }
                            className="rounded border border-gray-300 px-2 py-1 bg-white"
                          >
                            {PERFIS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        ) : (
                          u.perfil
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={!!editForm.ativo}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                ativo: e.target.checked,
                              })
                            }
                          />
                        ) : u.ativo ? (
                          "Sim"
                        ) : (
                          "Não"
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={!!editForm.mustChangePassword}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                mustChangePassword: e.target.checked,
                              })
                            }
                          />
                        ) : u.mustChangePassword ? (
                          "Sim"
                        ) : (
                          "Não"
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => salvarEdicao(u.idUsuario)}
                                className="text-xs px-2 py-1 rounded bg-brand-dark text-white disabled:opacity-70"
                                disabled={updatingId === u.idUsuario}
                              >
                                {updatingId === u.idUsuario
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
                                onClick={() => iniciarEdicao(u)}
                                className="text-xs px-2 py-1 rounded border border-gray-300"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => abrirModalExcluir(u.idUsuario)}
                                className="text-xs px-2 py-1 rounded bg-red-600 text-white disabled:opacity-70"
                                disabled={deletingId === u.idUsuario}
                              >
                                🗑 Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
