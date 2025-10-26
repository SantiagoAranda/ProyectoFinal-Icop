import { useEffect, useState } from "react";

interface Empleado {
  id: number;
  nombre: string;
  email: string;
  especialidad?: string;
  eficiencia?: number; // ← nuevo campo
}

const VistaEmpleados = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  useEffect(() => {
    const fetchEmpleados = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/empleados");
        const data = await res.json();
        setEmpleados(data);
      } catch (error) {
        console.error("Error al obtener empleados:", error);
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
          <div
            key={empleado.id}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-all"
          >
            {/* Encabezado */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-100 text-pink-600 font-bold">
                {empleado.nombre
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{empleado.nombre}</p>
                <p className="text-sm text-pink-500">
                  {empleado.especialidad ?? "Sin especialidad"}
                </p>
              </div>
            </div>

            {/* Email */}
            <p className="text-sm text-gray-600 mb-1">
              {empleado.email}
            </p>
            <p className="text-xs text-green-600 mb-3">● Activo</p>

            {/* Etiqueta de especialidad */}
            {empleado.especialidad && (
              <span className="inline-block px-3 py-1 text-xs font-medium text-pink-600 bg-pink-100 rounded-full mb-3">
                {empleado.especialidad}
              </span>
            )}

            {/* Barra de eficiencia */}
            <p className="text-sm font-medium text-gray-700 mb-1">Ocupacion</p>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1">
              <div
                className="bg-pink-400 h-2 transition-all"
                style={{ width: `${empleado.eficiencia ?? 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {empleado.eficiencia ? `${empleado.eficiencia}%` : "0%"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VistaEmpleados;
