import React from 'react';

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-6 text-center">Bienvenido al Sistema de Gestión</h1>
      <p className="text-lg text-gray-600 text-center mb-2">Administra empleados, turnos y servicios fácilmente.</p>
      <p className="text-md text-gray-500 text-center">Usá el menú para navegar por las distintas secciones.</p>
    </div>
  );
}

export default Home;
