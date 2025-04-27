import Navbar from '@/componentes/Navbar';

function Home() {
  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-4xl font-bold mb-4">Bienvenido a Mi Sistema</h1>
        <p className="text-lg text-gray-600">Gestiona turnos, productos y más.</p>
      </div>
    </>
  );
}

export default Home;