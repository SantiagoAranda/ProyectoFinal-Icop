import React, { useEffect, useMemo, useState } from "react";
import api from "../../src/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  type TooltipProps,
} from "recharts";
import EgresosMensualesModal from "../../src/componentes/EgresosMensualesModal";
import HistorialVentasFisicasPanel from "../../src/componentes/HistorialVentasFisicasPanel";

/* ===========================================================
   TIPOS
=========================================================== */

interface ResumenTesoreria {
  ingresosTotales: number;
  egresosTotales: number;
  gananciaNeta: number;
  completados: number;
  cancelaciones: number;
  totalTurnos: number;
}

interface DatosMensuales {
  mes: string;
  ingresos: number;
  egresos: number;
}

interface ResumenEgresoDetalle {
  subcategoria?: string | null;
  nota?: string | null;
  total: number;
}

interface ResumenEgresoCategoria {
  categoria: string;
  total: number;
  detalle?: ResumenEgresoDetalle[];
}

interface ResumenEgresos {
  totalPeriodo: number;
  porCategoria: ResumenEgresoCategoria[];
}

type EgresoFijo = {
  id?: number;
  categoria?: string | null;
  monto?: number | null;
  subcategoria?: string | null;
  nota?: string | null;
  updatedAt?: string | null;
};

type DetalleTesoreria = {
  ingresosPorDia?: Array<{ dia: string; ingresos: number; egresos: number }>;
  ingresosPorEmpleado?: Array<{ nombre: string; total: number }>;
  ingresosPorEspecialidad?: Array<{ nombre: string; total: number }>;
};

type ClienteFrecuente = { nombre: string; turnos: number };
type ProductoMasVendido = { nombre: string; cantidad: number };

type ApiResumenClientes =
  | ClienteFrecuente[]
  | { clientes?: ClienteFrecuente[] };

type ApiResumenProductos =
  | ProductoMasVendido[]
  | { items?: ProductoMasVendido[] };

/* ===========================================================
   COMPONENTE
=========================================================== */

const DashboardTesoreria: React.FC = (): React.ReactElement => {
  const hoy = new Date();

  const [resumen, setResumen] = useState<ResumenTesoreria | null>(null);
  const [detalle, setDetalle] = useState<DetalleTesoreria | null>(null);

  const [clientesFrecuentes, setClientesFrecuentes] = useState<ClienteFrecuente[]>([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState<ProductoMasVendido[]>([]);
  const [egresosFijos, setEgresosFijos] = useState<EgresoFijo[]>([]);

  const [ingresosMensuales, setIngresosMensuales] = useState<DatosMensuales[]>([]);
  const [resumenEgresos, setResumenEgresos] = useState<ResumenEgresos | null>(null);

  const [mesSeleccionado, setMesSeleccionado] = useState<number>(hoy.getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(hoy.getFullYear());

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showEgresosModal, setShowEgresosModal] = useState<boolean>(false);
  const [showHistorialPanel, setShowHistorialPanel] = useState<boolean>(false);

  const COLORS = useMemo<string[]>(
    () => ["#ec4899", "#f87171", "#4ade80", "#60a5fa", "#facc15", "#c084fc"],
    []
  );

  const normalizarEspecialidad = (nombre: string): string => {
    if (!nombre) return "";

    const sinTildes = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const mapeo: Record<string, string> = {
      peluquero: "peluqueria",
      peluquera: "peluqueria",
      masajista: "masajes",
      depiladora: "depilacion",
      depilador: "depilacion",
      unas: "unas",
    };

    return mapeo[sinTildes] || sinTildes;
  };

  const formatMoney = (n: number): string =>
    n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

  /* ===========================================================
     FETCH GENERAL
  =========================================================== */
  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const paramsPeriodo = {
        params: { mes: mesSeleccionado, anio: anioSeleccionado },
      };

      const [
        resumenRes,
        detalleRes,
        clientesRes,
        productosRes,
        egresosRes,
        mensualesRes,
        resumenEgresosRes,
      ] = await Promise.all([
        api.get<ResumenTesoreria>("/tesoreria/resumen", paramsPeriodo),
        api.get<DetalleTesoreria>("/tesoreria/detalle", paramsPeriodo),
        api.get<ApiResumenClientes>("/tesoreria/clientes"),
        api.get<ApiResumenProductos>("/tesoreria/productos"),
        api.get<EgresoFijo[]>("/egresos", paramsPeriodo),
        api.get<DatosMensuales[]>("/tesoreria/ingresos-mensuales", {
          params: { anio: anioSeleccionado },
        }),
        api.get<ResumenEgresos>("/egresos/resumen", paramsPeriodo),
      ]);

      setResumen(resumenRes.data ?? null);
      setDetalle(detalleRes.data ?? null);

      const clientesData = clientesRes.data;
      setClientesFrecuentes(
        Array.isArray(clientesData) ? clientesData : clientesData?.clientes ?? []
      );

      const productosData = productosRes.data;
      setProductosMasVendidos(
        Array.isArray(productosData) ? productosData : productosData?.items ?? []
      );

      setEgresosFijos(Array.isArray(egresosRes.data) ? egresosRes.data : []);
      setIngresosMensuales(Array.isArray(mensualesRes.data) ? mensualesRes.data : []);
      setResumenEgresos(resumenEgresosRes.data ?? null);
    } catch (err) {
      console.error("Error al obtener datos de tesorería:", err);
      setError("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSeleccionado, anioSeleccionado]);

  /* ===========================================================
     CÁLCULOS
  =========================================================== */
  const ingresosPorDia = detalle?.ingresosPorDia ?? [];
  const ingresosPorEmpleado = detalle?.ingresosPorEmpleado ?? [];
  const ingresosPorEspecialidad = detalle?.ingresosPorEspecialidad ?? [];

  // viene del backend, lo dejamos por debug/comparación
  const resumenCategoriasBackend = (resumenEgresos?.porCategoria ?? []) as ResumenEgresoCategoria[];

  const etiquetaEgreso = (e: EgresoFijo): string => {
    const cat = (e?.categoria ?? "").trim();
    if (cat === "Servicios" && e?.subcategoria) return String(e.subcategoria);
    if (cat === "Otros" && e?.nota) return String(e.nota);
    return cat || "-";
  };

  const resumenCategoriasFront = useMemo<ResumenEgresoCategoria[]>(() => {
    const acc: Record<string, number> = {};

    for (const e of egresosFijos ?? []) {
      const cat = (e?.categoria ?? "Sin categoría").trim();
      const monto = Number(e?.monto) || 0;
      acc[cat] = (acc[cat] ?? 0) + monto;
    }

    return Object.entries(acc).map(([categoria, total]) => ({ categoria, total }));
  }, [egresosFijos]);

  const normalizeKey = (txt: string): string =>
    (txt || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const egresosFijosAgrupados = useMemo(() => {
    type Row = {
      key: string;
      categoria: string;
      detalle: string;
      monto: number;
      updatedAt?: string | null;
    };

    const map = new Map<string, Row>();

    for (const e of egresosFijos ?? []) {
      const categoria = (e?.categoria ?? "Sin categoría").trim();
      const detalleTxt = etiquetaEgreso(e);
      const monto = Number(e?.monto) || 0;

      const key = `${normalizeKey(categoria)}__${normalizeKey(detalleTxt)}`;

      const current = map.get(key);
      if (!current) {
        map.set(key, {
          key,
          categoria,
          detalle: detalleTxt,
          monto,
          updatedAt: e?.updatedAt ?? null,
        });
      } else {
        current.monto += monto;

        const currDate = current.updatedAt ? new Date(current.updatedAt) : null;
        const newDate = e?.updatedAt ? new Date(e.updatedAt) : null;

        if (newDate && (!currDate || newDate > currDate)) {
          current.updatedAt = e.updatedAt ?? null;
        }
      }
    }

    return Array.from(map.values());
  }, [egresosFijos]);

  /* ===========================================================
     UI STATES
  =========================================================== */
  if (loading) return <p className="text-center text-gray-600">Cargando datos...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;
  if (!resumen) return <p className="text-center text-gray-500">No hay datos</p>;

  const totalIngresosHistoricos = ingresosMensuales.reduce((sum, item) => sum + (item.ingresos || 0), 0);
  const totalEgresosHistoricos = ingresosMensuales.reduce((sum, item) => sum + (item.egresos || 0), 0);
  const totalGananciaHistorica = totalIngresosHistoricos - totalEgresosHistoricos;

  const pieTotalEgresos = resumenCategoriasFront.reduce((sum, c) => sum + (c.total || 0), 0);

  /* ===========================================================
     RENDER
  =========================================================== */
  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-pink-50 to-white">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard de Tesorería</h1>
        </div>

        {/* Resumen Global Histórico */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="text-2xl"></span> Resumen Histórico Total
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border-2 border-green-200 p-6 shadow-md hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-600">Ingresos Totales</h4>
              </div>
              <p className="text-3xl font-bold text-green-600">{formatMoney(totalIngresosHistoricos)}</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-red-200 p-6 shadow-md hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-600">Egresos Totales</h4>
              </div>
              <p className="text-3xl font-bold text-red-600">{formatMoney(totalEgresosHistoricos)}</p>
            </div>

            <div
              className={`bg-white rounded-xl border-2 p-6 shadow-md hover:shadow-lg transition ${
                totalGananciaHistorica >= 0 ? "border-blue-200" : "border-red-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-600">Ganancia Neta</h4>
              </div>
              <p className={`text-3xl font-bold ${totalGananciaHistorica >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatMoney(totalGananciaHistorica)}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros mensuales */}
        <div className="flex items-center gap-3 flex-wrap mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Mes</label>
            <select
              value={mesSeleccionado}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMesSeleccionado(Number(e.target.value))}
              className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-pink-400"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("es-AR", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Año</label>
            <input
              type="number"
              min={2020}
              max={3000}
              value={anioSeleccionado}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnioSeleccionado(Number(e.target.value))}
              className="border border-gray-300 rounded-lg p-2 w-24 focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowHistorialPanel(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
          >
            Ver historial de ventas físicas
          </button>

          <button
            type="button"
            onClick={() => setShowEgresosModal(true)}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg shadow hover:bg-pink-600 transition"
          >
            Administrar Egresos Mensuales
          </button>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-6 bg-green-100 border border-green-200 rounded-xl text-center shadow-sm">
            <h2 className="text-lg text-green-700 font-semibold">Ingresos Totales (mes)</h2>
            <p className="text-2xl font-bold text-green-600 mt-2">{formatMoney(resumen.ingresosTotales)}</p>
          </div>

          <div className="p-6 bg-red-100 border border-red-200 rounded-xl text-center shadow-sm">
            <h2 className="text-lg text-red-700 font-semibold">Egresos Totales (mes)</h2>
            <p className="text-2xl font-bold text-red-600 mt-2">{formatMoney(resumen.egresosTotales)}</p>
          </div>

          <div className="p-6 bg-pink-100 border border-pink-200 rounded-xl text-center shadow-sm">
            <h2 className="text-lg text-pink-700 font-semibold">Ganancia Neta (mes)</h2>
            <p className="text-2xl font-bold text-pink-600 mt-2">{formatMoney(resumen.gananciaNeta)}</p>
          </div>
        </div>

        {/* Ingresos/Egresos por día */}
        <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Ingresos, Egresos y Ganancia Neta (por día)
          </h2>

          {ingresosPorDia.length === 0 ? (
            <p className="text-center text-gray-500">Sin datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={ingresosPorDia.map((dia) => ({
                  ...dia,
                  gananciaNeta: (dia.ingresos ?? 0) - (dia.egresos ?? 0),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip formatter={(v: number | string) => formatMoney(Number(v) || 0)} />
                <Legend />
                <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                <Bar dataKey="egresos" fill="#ef4444" name="Egresos" />
                <Bar dataKey="gananciaNeta" fill="#ec4899" name="Ganancia Neta" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ingresos por empleado */}
        <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Ingresos por empleado</h2>

          {ingresosPorEmpleado.length === 0 ? (
            <p className="text-center text-gray-500">Sin datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ingresosPorEmpleado}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-15} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(v: number | string) => formatMoney(Number(v) || 0)} />
                <Bar dataKey="total" fill="#60a5fa" name="Ingresos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ingresos por especialidad */}
        <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Ingresos por especialidad</h2>

          {ingresosPorEspecialidad.length === 0 ? (
            <p className="text-center text-gray-500">Sin datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={ingresosPorEspecialidad.filter((esp) => {
                  const validas = ["peluqueria", "unas", "masajes", "depilacion"];
                  const nombreNormalizado = normalizarEspecialidad(esp.nombre || "");
                  return validas.includes(nombreNormalizado);
                })}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip formatter={(v: number | string) => formatMoney(Number(v) || 0)} />
                <Legend />
                <Bar dataKey="total" fill="#ec4899" name="Ingresos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Clientes frecuentes */}
        <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Clientes frecuentes</h2>

          {clientesFrecuentes.length === 0 ? (
            <p className="text-center text-gray-500">Sin datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientesFrecuentes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="turnos" fill="#facc15" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Productos más vendidos */}
        <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Productos más vendidos</h2>

          {productosMasVendidos.length === 0 ? (
            <p className="text-center text-gray-500">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productosMasVendidos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#c084fc" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie de egresos por categoría */}
        <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Gráfico de egresos por categoría</h2>
            <span className="text-sm text-gray-500">
              Total egresos: {formatMoney(pieTotalEgresos)}
            </span>
          </div>

          {resumenCategoriasFront.length === 0 ? (
            <p className="text-center text-gray-500">Sin egresos registrados en el período</p>
          ) : (
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resumenCategoriasFront}
                    dataKey="total"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={(entry: ResumenEgresoCategoria) => entry.categoria}
                  >
                    {resumenCategoriasFront.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | string) => formatMoney(Number(v) || 0)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Debug opcional:
          <pre className="mt-4 text-xs text-gray-500">
            {JSON.stringify(resumenCategoriasBackend, null, 2)}
          </pre>
          */}
        </div>

        {/* Egresos detallados */}
        <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Egresos detallados</h2>

          {egresosFijosAgrupados.length === 0 ? (
            <p className="text-center text-gray-500">Sin egresos registrados</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-left">
                  <th className="p-2">Categoría</th>
                  <th className="p-2">Detalle</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-right">Última modificación</th>
                </tr>
              </thead>
              <tbody>
                {egresosFijosAgrupados.map((e) => (
                  <tr key={e.key} className="border-t">
                    <td className="p-2">{e.categoria}</td>
                    <td className="p-2">{e.detalle}</td>
                    <td className="p-2 text-right">{formatMoney(e.monto)}</td>
                    <td className="p-2 text-right">
                      {e.updatedAt
                        ? new Date(e.updatedAt).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modales */}
        {showEgresosModal && (
          <EgresosMensualesModal
            onClose={() => {
              setShowEgresosModal(false);
              void fetchData();
            }}
          />
        )}

        {showHistorialPanel && (
          <HistorialVentasFisicasPanel onClose={() => setShowHistorialPanel(false)} />
        )}
      </div>
    </div>
  );
};

export default DashboardTesoreria;
