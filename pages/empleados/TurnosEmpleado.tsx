// src/pages/Empleado/TurnosEmpleado.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../../src/context/UserContext';
import { FaCheck, FaTrash } from 'react-icons/fa';

interface Cliente {
  id: number;
  nombre?: string;
  email?: string;
}

interface Servicio {
  id: number;
  nombre?: string;
  precio?: number;
  duracion?: number;
}

interface Turno {
  id: number;
  fechaHora: string;
  estado: string;
  cliente?: Cliente;
  servicio?: Servicio;
  empleadoId: number;
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-AR')} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const TurnosEmpleado: React.FC = () => {
  const { user } = useUser();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'todos' | 'reservado' | 'completado' | 'cancelado'>('todos');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // 🔒 Validar rol
  if (!user || user.role !== 'empleado') {
    return (
      <div className="text-center p-10 text-gray-700">
        <h1 className="text-2xl font-semibold">Acceso restringido</h1>
        <p className="text-gray-600 mt-2">Esta sección es solo para empleados.</p>
      </div>
    );
  }

  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const res = await axios.get('http://localhost:3001/api/turnos', { headers });
      const allTurnos = res.data as Turno[];
      const turnosEmpleado = allTurnos.filter((t) => t.empleadoId === user.id);
      setTurnos(turnosEmpleado);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los turnos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurnos();
  }, []);

  const handleChangeEstado = async (id: number, nuevoEstado: string) => {
    if (!confirm(`¿Seguro que deseas marcar este turno como ${nuevoEstado}?`)) return;
    try {
      setUpdatingId(id);
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await axios.patch(`http://localhost:3001/api/turnos/${id}`, { estado: nuevoEstado }, { headers });
      await fetchTurnos();
    } catch (err) {
      console.error('Error actualizando estado', err);
      alert('No se pudo actualizar el estado. Revisa la consola.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTurnos =
    filter === 'todos' ? turnos : turnos.filter((t) => t.estado.toLowerCase() === filter);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-8">Mis Turnos</h1>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="border border-gray-300 px-3 py-2 rounded-md text-gray-700"
        >
          <option value="todos">Todos</option>
          <option value="reservado">Reservado</option>
          <option value="completado">Completado</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <button
          onClick={fetchTurnos}
          className="ml-auto bg-primary text-white px-4 py-2 rounded-md shadow hover:bg-primary/90 transition"
        >
          Refrescar
        </button>
      </div>

      {/* Tabla de turnos */}
      {loading ? (
        <p className="text-gray-700">Cargando...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : filteredTurnos.length === 0 ? (
        <p className="text-gray-600">No hay turnos que mostrar.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-3">Fecha / Hora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTurnos.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-4 py-2">{formatDateTime(t.fechaHora)}</td>
                  <td className="px-4 py-2">{t.cliente?.nombre ?? '-'}</td>
                  <td className="px-4 py-2">
                    {t.servicio?.nombre ?? '-'}{' '}
                    {t.servicio?.precio ? `($${t.servicio.precio})` : ''}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        t.estado === 'cancelado'
                          ? 'bg-red-100 text-red-700'
                          : t.estado === 'completado'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-3">
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
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TurnosEmpleado;