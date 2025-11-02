import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { useUser } from '../../src/context/UserContext.tsx';
import { FaEye, FaCheck, FaTrash, FaTimes } from 'react-icons/fa';
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  View,
} from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface Cliente {
  id: number;
  nombre?: string | null;
  email?: string | null;
  role?: string | null;
}
interface Empleado {
  id: number;
  nombre?: string | null;
  especialidad?: string | null;
  email?: string | null;
}
interface Servicio {
  id: number;
  nombre?: string | null;
  precio?: number | null;
  duracion?: number | null;
}
interface ProductoTurno {
  productoId: number;
  cantidad: number;
  producto?: { id: number; nombre?: string; precio?: number };
}
interface Turno {
  id: number;
  fechaHora: string;
  estado?: string;
  clienteId?: number;
  empleadoId?: number;
  servicioId?: number;
  createdAt?: string;
  cliente?: Cliente;
  empleado?: Empleado;
  servicio?: Servicio;
  productos?: ProductoTurno[];
}

const pad = (n: number) => n.toString().padStart(2, '0');
const formatDateTime = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

export default function DashboardTurnos() {
  const { user } = useUser();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Turno | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [filterEstado, setFilterEstado] = useState<string>('reservado');
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<string>('fechaHora');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [vista, setVista] = useState<'tabla' | 'scheduler'>('tabla');

  const [calendarView, setCalendarView] = useState<View>(Views.WEEK);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | 'todos'>('todos');

  const minTime = useMemo(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  }, []);
  const maxTime = useMemo(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  }, []);

  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [turnosRes, empleadosRes, productosRes] = await Promise.all([
        axios.get<Turno[]>('http://localhost:3001/api/turnos', { headers }),
        axios.get<Empleado[]>('http://localhost:3001/api/empleados', { headers }),
        axios.get<any[]>('http://localhost:3001/api/productos', { headers }).catch(() => ({ data: [] as any[] })),
      ]);

      const productosList: any[] = Array.isArray((productosRes as any).data)
        ? (productosRes as any).data
        : (productosRes as any).data?.productos ?? [];
      const productosMap = new Map<number, any>();
      productosList.forEach((p) => productosMap.set(p.id, p));

      const rawTurnos: Turno[] = Array.isArray(turnosRes.data) ? turnosRes.data : [];
      const normalized = rawTurnos.map((t) => {
        const copy = { ...t };
        if (Array.isArray(copy.productos)) {
          copy.productos = copy.productos.map((pt: any) => {
            if (pt.producto && (pt.producto.nombre || pt.producto.precio)) return pt;
            const prod = productosMap.get(Number(pt.productoId)) ?? null;
            return { ...pt, producto: prod };
          });
        }
        return copy;
      });

      setTurnos(normalized);
      setEmpleados(empleadosRes.data ?? []);
    } catch (err) {
      console.error('Error al cargar datos', err);
      setError('No se pudieron cargar los turnos. Revisa la consola.');
      setTurnos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  // ✅ Corregido: endpoint correcto para actualizar estado
  const handleChangeEstado = async (id: number, nuevoEstado: string) => {
    if (!confirm(`¿Confirma cambiar el estado a "${nuevoEstado}" para el turno ${id}?`)) return;
    try {
      setUpdatingId(id);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 🔹 Aquí el cambio de endpoint
      await axios.patch(`http://localhost:3001/api/turnos/${id}/estado`, { estado: nuevoEstado }, { headers });

      await fetchTurnos();
      setSelected((prev) => (prev && prev.id === id ? { ...prev, estado: nuevoEstado } : prev));
    } catch (err) {
      console.error('Error actualizando estado:', err);
      alert('Error al actualizar estado. Revisa la consola del backend.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(
    () =>
      turnos
        .filter((t) => (filterEstado === 'todos' ? true : (t.estado ?? '').toLowerCase() === filterEstado))
        .filter((t) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            String(t.id).includes(q) ||
            (t.cliente?.nombre ?? '').toLowerCase().includes(q) ||
            (t.cliente?.email ?? '').toLowerCase().includes(q) ||
            (t.empleado?.nombre ?? '').toLowerCase().includes(q) ||
            (t.servicio?.nombre ?? '').toLowerCase().includes(q)
          );
        }),
    [turnos, filterEstado, search]
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortField === 'fechaHora') {
      arr.sort((a, b) => {
        const dateA = new Date(a.fechaHora).getTime();
        const dateB = new Date(b.fechaHora).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
      return arr;
    }
    if (sortField === 'estado') {
      const order = ['reservado', 'completado', 'cancelado'];
      arr.sort((a, b) => {
        const idxA = order.indexOf((a.estado ?? '').toLowerCase());
        const idxB = order.indexOf((b.estado ?? '').toLowerCase());
        return sortOrder === 'asc' ? idxA - idxB : idxB - idxA;
      });
      return arr;
    }
    return arr;
  }, [filtered, sortField, sortOrder]);

  const resources = useMemo(
    () =>
      empleados.map((e) => ({
        resourceId: e.id,
        resourceTitle: e.nombre ?? `Empleado ${e.id}`,
      })),
    [empleados]
  );

  const events = useMemo(
    () =>
      turnos.map((t) => {
        const start = new Date(t.fechaHora);
        const dur = t.servicio?.duracion ?? 1;
        const end = addHours(start, dur);
        return {
          id: t.id,
          title: `${t.servicio?.nombre ?? 'Turno'} — ${t.cliente?.nombre ?? 'Cliente'}`,
          start,
          end,
          resourceId: t.empleadoId,
          resource: t,
        };
      }),
    [turnos]
  );

  const resourcesFiltered = useMemo(
    () => (selectedEmpleadoId === 'todos' ? resources : resources.filter((r) => r.resourceId === selectedEmpleadoId)),
    [resources, selectedEmpleadoId]
  );
  const eventsFiltered = useMemo(
    () => (selectedEmpleadoId === 'todos' ? events : events.filter((e) => e.resourceId === selectedEmpleadoId)),
    [events, selectedEmpleadoId]
  );

  const handleCalendarViewChange = (view: View) => setCalendarView(view);
  const handleCalendarNavigate = (date: Date) => setCalendarDate(date);

  // === RENDER ===
  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">Gestión de Turnos</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchTurnos}
            className="px-4 py-2 bg-primary text-white rounded-md shadow hover:bg-primary/90 transition"
          >
            Refrescar
          </button>
          <div className="ml-2 inline-flex rounded-md overflow-hidden border border-gray-200">
            <button
              onClick={() => setVista('tabla')}
              className={`px-4 py-2 text-sm ${vista === 'tabla' ? 'bg-primary text-white' : 'bg-white text-gray-700'
                }`}
            >
              Tabla
            </button>
            <button
              onClick={() => setVista('scheduler')}
              className={`px-4 py-2 text-sm ${vista === 'scheduler' ? 'bg-primary text-white' : 'bg-white text-gray-700'
                }`}
            >
              Scheduler
            </button>
          </div>
        </div>
      </div>

      {/* Filtros / búsqueda */}
      {vista === 'tabla' && (
        <div className="flex gap-3 items-center mb-6">
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-md text-gray-700"
          >
            <option value="todos">Todos</option>
            <option value="reservado">Reservado</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <input
            type="search"
            placeholder="Buscar por id, cliente, empleado o servicio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-md flex-1 text-gray-700"
          />
        </div>
      )}

      {/* TABLA */}
      {vista === 'tabla' && (
        <>
          {loading ? (
            <p>Cargando turnos...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : sorted.length === 0 ? (
            <p>No hay turnos que mostrar.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
              <table className="min-w-full text-left">
                <thead className="bg-gray-100 select-none">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">ID</th>
                    <th
                      onClick={() => handleSort('fechaHora')}
                      className="px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer"
                    >
                      Fecha / Hora {sortField === 'fechaHora' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      onClick={() => handleSort('estado')}
                      className="px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer"
                    >
                      Estado {sortField === 'estado' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Empleado</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Servicio</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Productos</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-2">{t.id}</td>
                      <td className="px-4 py-2">{formatDateTime(t.fechaHora)}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${t.estado === 'cancelado'
                            ? 'bg-red-100 text-red-700'
                            : t.estado === 'completado'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {t.estado ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-800">
                          {t.cliente?.nombre ?? `#${t.clienteId ?? '-'}`}
                        </div>
                        <div className="text-xs text-gray-500">{t.cliente?.email ?? ''}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm text-gray-800">
                          {t.empleado?.nombre ?? `#${t.empleadoId ?? '-'}`}
                        </div>
                        <div className="text-xs text-gray-500">{t.empleado?.especialidad ?? ''}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm text-gray-800">
                          {t.servicio?.nombre ?? `#${t.servicioId ?? '-'}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.servicio?.duracion ? `${t.servicio?.duracion}h` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {t.productos?.length ? (
                          <div className="text-sm text-gray-700 leading-tight">
                            {Object.values(
                              t.productos.reduce((acc: any, p) => {
                                const nombre = p.producto?.nombre ?? `#${p.productoId}`;
                                if (!acc[nombre]) acc[nombre] = { nombre, cantidad: 0 };
                                acc[nombre].cantidad += p.cantidad;
                                return acc;
                              }, {})
                            ).map((p: any) => (
                              <div key={p.nombre}>
                                {p.nombre} × {p.cantidad}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-3 items-center">
                          <button
                            onClick={() => setSelected(t)}
                            className="text-gray-700 hover:text-gray-900"
                            title="Ver detalles"
                          >
                            <FaEye size={16} />
                          </button>
                          <button
                            onClick={() => handleChangeEstado(t.id, 'completado')}
                            disabled={updatingId === t.id || t.estado === 'completado'}
                            className="text-green-600 hover:text-green-800 disabled:opacity-40"
                            title="Marcar completado"
                          >
                            <FaCheck size={16} />
                          </button>
                          <button
                            onClick={() => handleChangeEstado(t.id, 'cancelado')}
                            disabled={updatingId === t.id || t.estado === 'cancelado'}
                            className="text-red-600 hover:text-red-800 disabled:opacity-40"
                            title="Cancelar turno"
                          >
                            <FaTrash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* SCHEDULER */}
      {vista === 'scheduler' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="text-sm text-gray-600">Empleado:</label>
            <select
              value={selectedEmpleadoId}
              onChange={(e) =>
                setSelectedEmpleadoId(e.target.value === 'todos' ? 'todos' : Number(e.target.value))
              }
              className="border border-gray-300 px-3 py-2 rounded-md text-gray-700"
            >
              <option value="todos">Todos</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre ?? `Empleado ${e.id}`} {e.especialidad ? `(${e.especialidad})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 bg-white p-4 rounded-lg shadow border border-gray-200">
            <Calendar
              localizer={localizer}
              events={eventsFiltered}
              resources={resourcesFiltered}
              resourceIdAccessor="resourceId"
              resourceTitleAccessor="resourceTitle"
              startAccessor="start"
              endAccessor="end"
              style={{ height: 650 }}
              view={calendarView}
              onView={handleCalendarViewChange}
              date={calendarDate}
              onNavigate={handleCalendarNavigate}
              defaultView={Views.WEEK}
              views={[Views.DAY, Views.WEEK, Views.MONTH]}
              culture="es"
              step={60}
              timeslots={1}
              min={minTime}
              max={maxTime}
              messages={{
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                today: 'Hoy',
                previous: '←',
                next: '→',
                noEventsInRange: 'Sin turnos en este rango',
              }}
              eventPropGetter={(event) => {
                let bg = '#facc15';
                const estado = event.resource?.estado?.toLowerCase();
                if (estado === 'completado') bg = '#4ade80';
                if (estado === 'cancelado') bg = '#f87171';
                return {
                  style: {
                    backgroundColor: bg,
                    color: '#111827',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                  },
                };
              }}
              onSelectEvent={(event) => setSelected(event.resource)}
            />
          </div>
        </>
      )}

      {/* MODAL DETALLE */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-8 relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-800 transition"
              title="Cerrar"
            >
              <FaTimes size={18} />
            </button>

            <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
              Detalle del turno #{selected.id}
            </h2>

            <div className="grid grid-cols-2 gap-5 text-gray-700 text-sm">
              <div>
                <div className="text-xs text-gray-500">Fecha / Hora</div>
                <div className="font-medium">{formatDateTime(selected.fechaHora)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Estado</div>
                <div className="font-medium capitalize">{selected.estado ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Cliente</div>
                <div className="font-medium">{selected.cliente?.nombre ?? `#${selected.clienteId ?? '-'}`}</div>
                <div className="text-xs">{selected.cliente?.email ?? ''}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Empleado</div>
                <div className="font-medium">{selected.empleado?.nombre ?? `#${selected.empleadoId ?? '-'}`}</div>
                <div className="text-xs">{selected.empleado?.especialidad ?? ''}</div>
              </div>

              <div className="col-span-2">
                <div className="text-xs text-gray-500">Servicio</div>
                <div className="font-medium">{selected.servicio?.nombre ?? `#${selected.servicioId ?? '-'}`}</div>
                <div className="text-xs text-gray-600">
                  Precio: {selected.servicio?.precio?.toLocaleString('es-AR') ?? '—'} — Duración:{' '}
                  {selected.servicio?.duracion ?? '-'}h
                </div>
              </div>

              <div className="col-span-2">
                <div className="text-xs text-gray-500">Productos</div>
                {selected.productos?.length ? (
                  <div className="mt-1 space-y-1 text-sm text-gray-700">
                    {selected.productos.map((pt) => (
                      <div key={pt.productoId} className="flex justify-between">
                        <span>
                          {pt.producto?.nombre ?? `#${pt.productoId}`} × {pt.cantidad}
                        </span>
                        <span>
                          {pt.producto?.precio
                            ? (pt.producto.precio * pt.cantidad).toLocaleString('es-AR')
                            : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No hay productos</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => handleChangeEstado(selected.id, 'completado')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
              >
                <FaCheck />
                Completar
              </button>
              <button
                onClick={() => handleChangeEstado(selected.id, 'cancelado')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                <FaTrash />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
