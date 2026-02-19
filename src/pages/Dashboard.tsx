import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";
import { getDashboardCounts } from "../services/dashboardService";
import seguradoraIcon from "../assets/seguradora.png";
import corretorIcon from "../assets/segurados.png";
import clientesIcon from "../assets/cliente.png";

type CardProps = {
  title: string;
  value: number;
};

function StatCard({ title, value }: CardProps) {
  return (
    <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-brand-dark">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({
    corretores: 0,
    clientes: 0,
    apolices: 0,
    seguradoras: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        const data = await getDashboardCounts();
        setCounts(data);
      } catch (e) {
        setError("Não foi possível carregar as métricas.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <MainLayout title="Dashboard">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-brand-dark">Visão geral</h2>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Corretores cadastrados" value={counts.corretores} />
        <StatCard title="Clientes cadastrados" value={counts.clientes} />
        <StatCard title="Apólices cadastradas" value={counts.apolices} />
        <StatCard title="Seguradoras cadastradas" value={counts.seguradoras} />
      </div>

      {loading && (
        <p className="mt-4 text-sm text-gray-500">Carregando métricas...</p>
      )}

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-brand-dark mb-3">
          Ações rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/seguradoras")}
            className="bg-white rounded-xl shadow p-5 border border-gray-100 text-left hover:border-brand-light transition flex gap-4 items-center"
          >
            <img
              src={seguradoraIcon}
              alt="Seguradoras"
              className="w-12 h-12 object-contain"
            />
            <div>
              <p className="text-sm text-gray-500">Cadastro</p>
              <p className="mt-1 text-lg font-semibold text-brand-dark">
                Seguradora e Produto
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate("/corretores")}
            className="bg-white rounded-xl shadow p-5 border border-gray-100 text-left hover:border-brand-light transition flex gap-4 items-center"
          >
            <img
              src={corretorIcon}
              alt="Corretores"
              className="w-12 h-12 object-contain"
            />
            <div>
              <p className="text-sm text-gray-500">Cadastro</p>
              <p className="mt-1 text-lg font-semibold text-brand-dark">
                Corretores
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate("/clientes")}
            className="bg-white rounded-xl shadow p-5 border border-gray-100 text-left hover:border-brand-light transition flex gap-4 items-center"
          >
            <img
              src={clientesIcon}
              alt="Clientes"
              className="w-12 h-12 object-contain"
            />
            <div>
              <p className="text-sm text-gray-500">Cadastro</p>
              <p className="mt-1 text-lg font-semibold text-brand-dark">
                Clientes
              </p>
            </div>
          </button>
          <button
            onClick={() => navigate("/apolices")}
            className="bg-white rounded-xl shadow p-5 border border-gray-100 text-left hover:border-brand-light transition flex gap-4 items-center"
          >
            <div className="w-12 h-12 flex items-center justify-center text-3xl">
              📄
            </div>
            <div>
              <p className="text-sm text-gray-500">Cadastro</p>
              <p className="mt-1 text-lg font-semibold text-brand-dark">
                Apólices
              </p>
            </div>
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
