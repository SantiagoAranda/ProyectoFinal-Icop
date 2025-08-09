import { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '@/context/UserContext';

interface Empleado {
  id: number;
  nombre: string;
  especialidad?: string | null;
}

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
}

const GenerarTurnoCliente = () => {
  const { user } = useUser();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [empleadoId, setEmpleadoId] = useState<number>();
  const [servicioId, setServicioId] = useState<number>();
  const [fechaHora, setFechaHora] = useState('');
  const [mensaje, setMensaje] = useState('');

  // obtener empleados y servicios al cargar el componente
  useEffect(() => {
    const fetchData = async () => {
      const [empleadosRes, serviciosRes] = await Promise.all([
        axios.get('http://localhost:3001/api/empleados'),
        axios.get('http://localhost:3001/api/servicios')
      ]);
      setEmpleados(empleadosRes.data);
      setServicios(serviciosRes.data);
    };

    fetchData();
  }, []);

  // envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empleadoId || !servicioId || !fechaHora) {
      setMensaje('Todos los campos son obligatorios.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3001/api/turnos',
        {
          empleadoId,
          servicioId,
          fechaHora,
          clienteId: user?.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMensaje('Turno generado exitosamente ✅');
    } catch (error) {
      console.error('Error al generar turno', error);
      setMensaje('Error al generar el turno ❌');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-card border border-border rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-semibold text-primary mb-4">Reservar nuevo turno</h2>

      {mensaje && <p className="mb-4 text-sm text-center">{mensaje}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-medium">Empleado</label>
          <select
            value={empleadoId}
            onChange={(e) => setEmpleadoId(Number(e.target.value))}
            className="w-full border border-border px-3 py-2 rounded-md bg-background"
          >
            <option value="">Seleccione un empleado</option>
            {empleados.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre} ({emp.especialidad})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">Servicio</label>
          <select
            value={servicioId}
            onChange={(e) => setServicioId(Number(e.target.value))}
            className="w-full border border-border px-3 py-2 rounded-md bg-background"
          >
            <option value="">Seleccione un servicio</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} - ${s.precio}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">Fecha y Hora</label>
          <input
            type="datetime-local"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            className="w-full border border-border px-3 py-2 rounded-md bg-background"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition"
        >
          Confirmar Turno
        </button>
      </form>
    </div>
  );
};

export default GenerarTurnoCliente;
