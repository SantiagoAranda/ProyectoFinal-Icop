
import { useEffect, useState } from 'react';
import TarjetaEmpleado from '@/componentes/TarjetaEmpleado';

interface Empleado {
  id: number;
  nombre: string;
  email: string;
  especialidad?: string;
}

const VistaEmpleados = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  useEffect(() => {
    const fetchEmpleados = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/empleados');
        const data = await res.json();
        setEmpleados(data);
      } catch (error) {
        console.error('Error al obtener empleados:', error);
      }
    };

    fetchEmpleados();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-400 text-transparent bg-clip-text mb-6">
        Lista de empleados
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {empleados.map((empleado) => (
          <TarjetaEmpleado key={empleado.id} empleado={empleado} />
        ))}
      </div>
    </div>
  );
};

export default VistaEmpleados;
