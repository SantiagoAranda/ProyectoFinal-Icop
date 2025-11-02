import React, { useState, useEffect } from 'react'
import axios from 'axios'
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
} from 'recharts'

interface ResumenTesoreria {
  ingresosTotales: number
  egresosTotales: number
  gananciaNeta: number
  completados: number
  cancelaciones: number
  totalTurnos: number
}

const DashboardTesoreria: React.FC = () => {
  const [resumen, setResumen] = useState<ResumenTesoreria | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<any | null>(null)

  const COLORS = ['#ec4899', '#f87171', '#4ade80', '#60a5fa', '#facc15', '#c084fc']

  // ======== FORMATEADOR ========
  const formatMoney = (n: number) =>
    n.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    })

  // ======== CARGA DE DATOS ========
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resumenRes, detalleRes] = await Promise.all([
          axios.get('http://localhost:3001/api/tesoreria/resumen'),
          axios.get('http://localhost:3001/api/tesoreria/detalle'),
        ])
        setResumen(resumenRes.data)
        setDetalle(detalleRes.data)
      } catch (error) {
        console.error('Error al obtener datos de tesorería:', error)
        setError('No se pudieron cargar los datos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // ======== DATOS SIMULADOS ========
  const ingresosPorDia = detalle?.ingresosPorDia ?? []

  const ingresosPorEmpleado = detalle?.ingresosPorEmpleado ?? []

  const ingresosPorServicio = detalle?.ingresosPorServicio ?? []

  const clientesFrecuentes = [
    { nombre: 'María', turnos: 8 },
    { nombre: 'Carla', turnos: 6 },
    { nombre: 'Ana', turnos: 5 },
    { nombre: 'Sabrina', turnos: 4 },
    { nombre: 'Florencia', turnos: 3 },
  ]

  const productosMasVendidos = [
    { nombre: 'Shampoo', cantidad: 40 },
    { nombre: 'Acondicionador', cantidad: 35 },
    { nombre: 'Ampolla', cantidad: 22 },
    { nombre: 'Tinte', cantidad: 18 },
    { nombre: 'Mascarilla', cantidad: 14 },
  ]

  // ======== COMPONENTE ========
  if (loading) return <p className="text-center text-gray-600">Cargando datos de tesorería...</p>
  if (error) return <p className="text-center text-red-600">{error}</p>
  if (!resumen) return <p className="text-center text-gray-500">No hay datos disponibles</p>

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard de Tesorería</h1>

      {/* === TARJETAS RESUMEN === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-green-100 border border-green-200 rounded-xl text-center shadow-sm">
          <h2 className="text-lg text-green-700 font-semibold">Ingresos Totales</h2>
          <p className="text-2xl font-bold text-green-600 mt-2">{formatMoney(resumen.ingresosTotales)}</p>
        </div>

        <div className="p-6 bg-red-100 border border-red-200 rounded-xl text-center shadow-sm">
          <h2 className="text-lg text-red-700 font-semibold">Egresos Totales</h2>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatMoney(resumen.egresosTotales)}</p>
        </div>

        <div className="p-6 bg-pink-100 border border-pink-200 rounded-xl text-center shadow-sm">
          <h2 className="text-lg text-pink-700 font-semibold">Ganancia Neta</h2>
          <p className="text-2xl font-bold text-pink-600 mt-2">{formatMoney(resumen.gananciaNeta)}</p>
        </div>
      </div>

      {/* === INGRESOS vs EGRESOS (Barras) === */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ingresos vs Egresos</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ingresosPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip formatter={(v: any) => formatMoney(v)} />
            <Legend />
            <Bar dataKey="ingresos" fill="#ec4899" name="Ingresos" />
            <Bar dataKey="egresos" fill="#f87171" name="Egresos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* === INGRESOS POR EMPLEADO === */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ingresos por empleado</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ingresosPorEmpleado}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" />
            <YAxis />
            <Tooltip formatter={(v: any) => formatMoney(v)} />
            <Bar dataKey="total" fill="#60a5fa" name="Ingresos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* === INGRESOS POR ESPECIALIDAD === */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ingresos por especialidad</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={detalle?.ingresosPorEspecialidad ?? []}
              dataKey="total"
              nameKey="nombre"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => entry.nombre}
            >
              {(detalle?.ingresosPorEspecialidad ?? []).map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: any) => formatMoney(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* === CLIENTES FRECUENTES === */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Clientes frecuentes</h2>
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

      {/* === PRODUCTOS MÁS VENDIDOS === */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Productos más vendidos</h2>
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

      {/* === TENDENCIA DE GANANCIA NETA === */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Tendencia de ganancia neta</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ingresosPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip formatter={(v: any) => formatMoney(v)} />
            <Line type="monotone" dataKey="ingresos" stroke="#ec4899" name="Ingresos" />
            <Line type="monotone" dataKey="egresos" stroke="#f87171" name="Egresos" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default DashboardTesoreria
