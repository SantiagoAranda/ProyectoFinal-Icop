import { Outlet } from 'react-router-dom';
import Navbar from '@/componentes/Navbar';

function MainLayout() {
  return (
    <>
      <Navbar />
      <main className="p-4">
        <Outlet />
      </main>
    </>
  );
}

export default MainLayout;