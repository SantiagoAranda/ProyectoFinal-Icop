import { useEffect, useState } from "react";

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  margen: number;
}

function DashboardProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/productos");
        const data = await response.json();
        setProductos(data);
      } catch (error) {
        console.error("Error al obtener productos:", error);
      }
    };

    fetchProductos();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-primary">Gestión de Productos</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {productos.map((producto) => (
          <div
            key={producto.id}
            className="bg-white rounded-2xl shadow-md p-4 border border-primary/20 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {producto.nombre}
            </h2>
            <p className="text-gray-600 text-sm mb-2">{producto.descripcion}</p>
            <p className="text-primary font-semibold">
              💲 {producto.precio.toFixed(2)}
            </p>
            <p className="text-gray-500 text-sm">Stock: {producto.stock}</p>
            <p className="text-gray-500 text-sm">
              Margen: {producto.margen}%
            </p>

            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-primary text-white py-1 px-2 rounded-lg hover:bg-primary-dark transition">
                Editar
              </button>
              <button className="flex-1 bg-red-500 text-white py-1 px-2 rounded-lg hover:bg-red-600 transition">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardProductos;
