
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  categoria?: string;
  marca?: string;
  imagen?: string;
}

const VistaProductos = () => {
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await api.get('/productos');
        setProductos(res.data);
      } catch (error) {
        console.error('Error al obtener productos:', error);
      }
    };

    fetchProductos();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {productos.map((producto) => (
        <div key={producto.id} className="border rounded-xl p-4 shadow-md bg-white">
          <h2 className="text-lg font-bold">{producto.nombre}</h2>
          <p className="text-sm text-gray-600">{producto.descripcion || 'Sin descripción'}</p>

          <div className="mt-2 text-sm">
            <p><strong>Precio:</strong> ${producto.precio}</p>
            <p><strong>Stock:</strong> {producto.stock} unidades</p>
            {producto.marca && <p><strong>Marca:</strong> {producto.marca}</p>}
            {producto.categoria && <p><strong>Categoría:</strong> {producto.categoria}</p>}
          </div>

          <div className="flex justify-between mt-4">
            <button className="text-blue-600 hover:underline">Editar</button>
            <button className="text-red-600 hover:underline">Eliminar</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VistaProductos;
