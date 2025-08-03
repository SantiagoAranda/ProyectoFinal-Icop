
import { useState } from 'react';
import VistaProductos from './VistaProductos';
import VistaServicios from './VistaServicios'; 

const DashboardServicios = () => {
  const [tabActivo, setTabActivo] = useState<'productos' | 'servicios'>('productos');

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Gestión de Servicios y Productos</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTabActivo('servicios')}
          className={`px-4 py-2 rounded-md font-medium ${
            tabActivo === 'servicios' ? 'bg-primary text-white' : 'bg-muted'
          }`}
        >
          Servicios
        </button>

        <button
          onClick={() => setTabActivo('productos')}
          className={`px-4 py-2 rounded-md font-medium ${
            tabActivo === 'productos' ? 'bg-primary text-white' : 'bg-muted'
          }`}
        >
          Productos
        </button>
      </div>

      {/* Contenido dinámico */}
      {tabActivo === 'productos' && <VistaProductos />}
      {tabActivo === 'servicios' && <VistaServicios />}
    </div>
  );
};

export default DashboardServicios;
