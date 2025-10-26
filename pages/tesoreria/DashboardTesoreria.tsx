import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const DashboardTesoreria: React.FC = () => {
  // ======== DATOS DE EJEMPLO ========
  const resumen = [
    { label: 'Ingresos', valor: 125000, color: 'bg-green-100 text-green-700' },
    { label: 'Egresos', valor: 64000, color: 'bg-red-100 text-red-700' },
    { label: 'Ganancia neta', valor: 61000, color: 'bg-yellow-100 text-yellow-800' },
    { label: 'Turnos completados', valor: 58, color: 'bg-blue-100 text-blue-700' },
    { label: 'Cancelaciones', valor: '12%', color: 'bg-pink-100 text-pink-700' },
  ];

  const ingresosPorDia = [
    { dia: 'Lun', ingresos: 12000, egresos: 5000 },
    { dia: 'Mar', ingresos: 15500, egresos: 6000 },
    { dia: 'Mié', ingresos: 9800, egresos: 4000 },
    { dia: 'Jue', ingresos: 17200, egresos: 7000 },
    { dia: 'Vie', ingresos: 19300, egresos: 9000 },
    { dia: 'Sáb', ingresos: 22000, egresos: 8000 },
  ];

  const ingresosPorEmpleado = [
    { nombre: 'Camila', total: 34000 },
    { nombre: 'Sofía', total: 28000 },
    { nombre: 'Martina', total: 25000 },
    { nombre: 'Lucía', total: 20000 },
    { nombre: 'Valentina', total: 18000 },
  ];

  const clientesFrecuentes = [
    { nombre: 'María', turnos: 8 },
    { nombre: 'Carla', turnos: 6 },
    { nombre: 'Ana', turnos: 5 },
    { nombre: 'Sabrina', turnos: 5 },
    { nombre: 'Florencia', turnos: 4 },
  ];

  const productosMasVendidos = [
    { nombre: 'Shampoo', cantidad: 40 },
    { nombre: 'Acondicionador', cantidad: 35 },
    { nombre: 'Ampolla', cantidad: 22 },
    { nombre: 'Tinte', cantidad: 18 },
    { nombre: 'Mascarilla', cantidad: 14 },
  ];

  const facturacionPorEspecialidad = [
    { nombre: 'Peluquería', total: 64000 },
    { nombre: 'Manicura', total: 28000 },
    { nombre: 'Coloración', total: 22000 },
    { nombre: 'Depilación', total: 11000 },
  ];

  const COLORS = ['#ec4899', '#facc15', '#4ade80', '#60a5fa', '#f87171', '#c084fc'];

  // ======== ESTADO DE FILTRO ========
  const [rango, setRango] = useState<'dia' | 'semana' | 'mes'>('semana');

  // ======== FORMATEADORES ========
  const formatMoney = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  // ======== DATOS DERIVADOS ========
  const totalIngresos = useMemo(() => ingresosPorDia.reduce((a, b) => a + b.ingresos, 0), []);
  const totalEgresos = useMemo(() => ingresosPorDia.reduce((a, b) => a + b.egresos, 0), []);
  const totalGanancia = totalIngresos - totalEgresos;

  // ======== COMPONENTE ========
  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-8">Panel de Tesorería</h1>

      {/* === FILTRO === */}
      <div className="flex justify-end mb-6">
        <select
          value={rango}
          onChange={(e) => setRango(e.target.value as any)}
          className="border border-gray-300 px-3 py-2 rounded-md text-gray-700"
        >
          <option value="dia">Día</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
      </div>

      {/* === TARJETAS DE RESUMEN === */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {resumen.map((card) => (
          <div
            key={card.label}
            className={`p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-center items-center ${card.color}`}
          >
            <div className="text-lg font-semibold">{card.label}</div>
            <div className="text-2xl font-bold mt-2">
              {typeof card.valor === 'number' ? formatMoney(card.valor) : card.valor}
            </div>
          </div>
        ))}
      </div>

      {/* === GRAFICO INGRESOS vs EGRESOS === */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Ingresos vs Egresos</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ingresosPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip formatter={(value: any) => formatMoney(value)} />
            <Legend />
            <Bar dataKey="ingresos" fill="#ec4899" name="Ingresos" />
            <Bar dataKey="egresos" fill="#f87171" name="Egresos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* === INGRESOS POR EMPLEADO === */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Ingresos por empleado</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ingresosPorEmpleado}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" />
            <YAxis />
            <Tooltip formatter={(value: any) => formatMoney(value)} />
            <Bar dataKey="total" fill="#60a5fa" name="Ingresos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* === CLIENTES FRECUENTES === */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Clientes con más turnos</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={clientesFrecuentes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="turnos" fill="#facc15" name="Turnos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* === PRODUCTOS MAS VENDIDOS === */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Productos más vendidos</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={productosMasVendidos}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cantidad" fill="#c084fc" name="Cantidad" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* === FACTURACION POR ESPECIALIDAD === */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Facturación por especialidad</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={facturacionPorEspecialidad}
              dataKey="total"
              nameKey="nombre"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(e) => e.nombre}
            >
              {facturacionPorEspecialidad.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => formatMoney(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* === GRAFICO DE GANANCIA NETA === */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Tendencia de ganancia neta</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ingresosPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip formatter={(value: any) => formatMoney(value)} />
            <Line type="monotone" dataKey="ingresos" stroke="#ec4899" name="Ingresos" />
            <Line type="monotone" dataKey="egresos" stroke="#f87171" name="Egresos" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardTesoreria;
