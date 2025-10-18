import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../../src/context/UserContext.tsx';

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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
};

export default function DashboardTurnos() {
  const { user } = useUser();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Turno | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [search, setSearch] = useState<string>('');

  const fetchTurnos = async () => {
    setLoading(true);
    setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      // traer productos (para poder completar nombre/precio si el backend no los incluyó)
      const productosRes = await axios.get<any[]>('http://localhost:3001/api/productos', { headers }).catch(() => ({ data: [] }));
      const productosList: any[] = Array.isArray(productosRes.data) ? productosRes.data : productosRes.data?.productos ?? [];
      const productosMap = new Map<number, any>();
      productosList.forEach((p) => productosMap.set(p.id, p));

      // traer turnos
      const res = await axios.get<Turno[]>('http://localhost:3001/api/turnos', { headers });
      const rawTurnos: Turno[] = Array.isArray(res.data) ? res.data : [];

      // normalizar productos dentro de cada turno
      const normalized = rawTurnos.map((t) => {
        const copy = { ...t };
        if (Array.isArray(copy.productos)) {
          copy.productos = copy.productos.map((pt: any) => {
            // si ya tiene producto embebido, dejarlo
            if (pt.producto && (pt.producto.nombre || pt.producto.precio)) return pt;
            // si el backend devolvió sólo productoId + cantidad, completar desde productosMap
            const prod = productosMap.get(Number(pt.productoId)) ?? null;
            return { ...pt, producto: prod };
          });
        }
        return copy;
      });

      setTurnos(normalized);
    } catch (err) {
      console.error('Error fetching turnos', err);
      setError('No se pudieron cargar los turnos. Revisa la consola.');
      setTurnos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeEstado = async (id: number, nuevoEstado: string) => {
    if (!confirm(`Confirma cambiar estado a "${nuevoEstado}" para el turno ${id}?`)) return;
    try {
      setUpdatingId(id);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      // PATCH/PUT según tu backend; ajusta si tu API usa otra ruta/forma
      await axios.patch(`http://localhost:3001/api/turnos/${id}`, { estado: nuevoEstado }, { headers });
      await fetchTurnos();
      setSelected((prev) => (prev && prev.id === id ? { ...prev, estado: nuevoEstado } : prev));
    } catch (err) {
      console.error('Error updating estado', err);
      alert('Error al actualizar estado. Revisa la consola.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = turnos
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
    })
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Turnos reservados</h1>
        <div className="flex gap-2">
          <button onClick={fetchTurnos} className="px-3 py-1 bg-primary text-white rounded-md">
            Refrescar
          </button>
        </div>
      </div>

      <div className="flex gap-3 items-center mb-4">
        <div>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="border px-2 py-1 rounded-md"
          >
            <option value="todos">Todos</option>
            <option value="reservado">Reservado</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <input
          type="search"
          placeholder="Buscar por id, cliente, empleado o servicio"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-1 rounded-md flex-1"
        />
      </div>

      {loading ? (
        <p>Cargando turnos...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <p>No hay turnos que mostrar.</p>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Fecha / Hora</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Empleado</th>
                <th className="px-4 py-2">Servicio</th>
                <th className="px-4 py-2">Productos</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 align-top">{t.id}</td>
                  <td className="px-4 py-2 align-top">{formatDateTime(t.fechaHora)}</td>
                  <td className="px-4 py-2 align-top">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        t.estado === 'cancelado'
                          ? 'bg-red-100 text-red-700'
                          : t.estado === 'completado'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {t.estado ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <div className="text-sm font-medium">{t.cliente?.nombre ?? `#${t.clienteId ?? '-'}`}</div>
                    <div className="text-xs text-gray-600">{t.cliente?.email ?? ''}</div>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <div className="text-sm">{t.empleado?.nombre ?? `#${t.empleadoId ?? '-'}`}</div>
                    <div className="text-xs text-gray-600">{t.empleado?.especialidad ?? ''}</div>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <div className="text-sm">{t.servicio?.nombre ?? `#${t.servicioId ?? '-'}`}</div>
                    <div className="text-xs text-gray-600">{t.servicio?.duracion ? `${t.servicio?.duracion}h` : ''}</div>
                  </td>
                  <td className="px-4 py-2 align-top">
                    {t.productos && t.productos.length > 0 ? (
                      <div className="text-sm">
                        {t.productos.map((pt) => (
                          <div key={pt.productoId} className="text-xs text-gray-700">
                            {pt.producto?.nombre ?? `#${pt.productoId}`} x {pt.cantidad} (
                            {pt.producto?.precio ? `${(pt.producto.precio * pt.cantidad).toLocaleString('es-AR')}` : '—'})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">—</div>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setSelected(t)}
                        className="px-2 py-1 bg-gray-200 rounded text-sm"
                      >
                        Ver
                      </button>

                      <button
                        onClick={() => handleChangeEstado(t.id, 'completado')}
                        disabled={updatingId === t.id || t.estado === 'completado'}
                        className="px-2 py-1 bg-green-500 text-white rounded text-sm disabled:opacity-60"
                      >
                        Marcar completado
                      </button>

                      <button
                        onClick={() => handleChangeEstado(t.id, 'cancelado')}
                        disabled={updatingId === t.id || t.estado === 'cancelado'}
                        className="px-2 py-1 bg-red-500 text-white rounded text-sm disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / panel detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-2xl bg-white rounded shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Detalle turno #{selected.id}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1 bg-gray-200 rounded-md"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-600">Fecha / Hora</div>
                <div className="font-medium">{formatDateTime(selected.fechaHora)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-600">Estado</div>
                <div className="font-medium">{selected.estado ?? '—'}</div>
              </div>

              <div>
                <div className="text-xs text-gray-600">Cliente</div>
                <div className="font-medium">{selected.cliente?.nombre ?? `#${selected.clienteId ?? '-'}`}</div>
                <div className="text-sm text-gray-600">{selected.cliente?.email ?? ''}</div>
              </div>

              <div>
                <div className="text-xs text-gray-600">Empleado</div>
                <div className="font-medium">{selected.empleado?.nombre ?? `#${selected.empleadoId ?? '-'}`}</div>
                <div className="text-sm text-gray-600">{selected.empleado?.especialidad ?? ''}</div>
              </div>

              <div className="col-span-2">
                <div className="text-xs text-gray-600">Servicio</div>
                <div className="font-medium">{selected.servicio?.nombre ?? `#${selected.servicioId ?? '-'}`}</div>
                <div className="text-sm text-gray-600">
                  Precio: {selected.servicio?.precio ? selected.servicio.precio.toLocaleString('es-AR') : '—'} — Duración:{' '}
                  {selected.servicio?.duracion ?? '-'}h
                </div>
              </div>

              <div className="col-span-2">
                <div className="text-xs text-gray-600">Productos</div>
                {selected.productos && selected.productos.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    {selected.productos.map((pt) => (
                      <div key={pt.productoId} className="flex justify-between">
                        <div>
                          {pt.producto?.nombre ?? `#${pt.productoId}`} x {pt.cantidad}
                        </div>
                        <div className="text-sm text-gray-600">
                          {pt.producto?.precio ? (pt.producto.precio * pt.cantidad).toLocaleString('es-AR') : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No hay productos</div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => {
                  if (selected) handleChangeEstado(selected.id, 'completado');
                }}
                className="px-3 py-1 bg-green-500 text-white rounded-md"
              >
                Marcar completado
              </button>
              <button
                onClick={() => {
                  if (selected) handleChangeEstado(selected.id, 'cancelado');
                }}
                className="px-3 py-1 bg-red-500 text-white rounded-md"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
