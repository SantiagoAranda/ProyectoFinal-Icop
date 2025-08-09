import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';

function Home() {
  const navigate = useNavigate();
  const { user } = useUser();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-6">
        Bienvenido {user ? user.nombre : 'al Sistema de Gestión'} 
      </h1>

      <p className="text-lg text-gray-600 mb-2">
        {user
          ? 'Administra empleados, turnos y servicios fácilmente.'
          : 'Inicia sesión para acceder a todas las funciones.'}
      </p>

      <p className="text-md text-gray-500 mb-8">
        Usa el menú para navegar por las distintas secciones.
      </p>

      {/* Botón solo para clientes */}
      {user?.role === 'cliente' && (
        <button
          onClick={() => navigate('/turnos/nuevo')}
          className="bg-primary text-white px-6 py-3 rounded-lg text-lg shadow-md hover:bg-primary-dark transition"
        >
          Reservar Turno
        </button>
      )}

      {/* Sección informativa para todos */}
      <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl w-full">
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="font-semibold text-lg">Servicios Destacados</h2>
          <p className="text-gray-600">
            Descubre nuestros servicios más populares y elige el tuyo.
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="font-semibold text-lg">Horarios</h2>
          <p className="text-gray-600">
            Estamos disponibles de lunes a sábado de 9:00 a 18:00.
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="font-semibold text-lg">Promociones</h2>
          <p className="text-gray-600">
            Aprovecha nuestras ofertas especiales de este mes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
