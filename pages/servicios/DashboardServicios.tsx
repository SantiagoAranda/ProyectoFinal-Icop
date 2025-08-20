import React, { useEffect, useState } from "react";

type Producto = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
};

type Servicio = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
};

function DashboardServicios() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"productos" | "servicios">("servicios");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
  });

  // --- FETCH DE DATOS ---
  const fetchData = async () => {
    try {
      const [resServicios, resProductos] = await Promise.all([
        fetch("http://localhost:3001/api/servicios"),
        fetch("http://localhost:3001/api/productos"),
      ]);

      const dataServicios = await resServicios.json();
      const dataProductos = await resProductos.json();

      setServicios(dataServicios);
      setProductos(dataProductos);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- CREAR ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url =
        activeTab === "servicios"
          ? "http://localhost:3001/api/servicios"
          : "http://localhost:3001/api/productos";

      const body =
        activeTab === "servicios"
          ? {
              nombre: formData.nombre,
              descripcion: formData.descripcion,
              precio: Number(formData.precio),
            }
          : {
              nombre: formData.nombre,
              descripcion: formData.descripcion,
              precio: Number(formData.precio),
              stock: Number(formData.stock),
            };

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setShowModal(false);
      setFormData({ nombre: "", descripcion: "", precio: "", stock: "" });
      fetchData();
    } catch (error) {
      console.error("Error al crear:", error);
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Cargando datos...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">
        Gestión de Productos y Servicios
      </h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("servicios")}
          className={`px-4 py-2 rounded-lg ${
            activeTab === "servicios"
              ? "bg-primary text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Servicios
        </button>
        <button
          onClick={() => setActiveTab("productos")}
          className={`px-4 py-2 rounded-lg ${
            activeTab === "productos"
              ? "bg-primary text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Productos
        </button>
      </div>

      {/* Botón agregar */}
      <div className="mb-6">
        {activeTab === "servicios" ? (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark transition"
          >
            + Agregar Servicio
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark transition"
          >
            + Agregar Producto
          </button>
        )}
      </div>

      {/* LISTADO */}
      {activeTab === "servicios" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicios.map((servicio) => (
            <div
              key={servicio.id}
              className="bg-white p-4 rounded-2xl shadow hover:shadow-lg transition flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-primary">
                  {servicio.nombre}
                </h2>
                <p className="text-gray-600">{servicio.descripcion}</p>
                <p className="text-lg font-bold mt-2">${servicio.precio}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productos.map((producto) => (
            <div
              key={producto.id}
              className="bg-white p-4 rounded-2xl shadow hover:shadow-lg transition flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-primary">
                  {producto.nombre}
                </h2>
                <p className="text-gray-600">{producto.descripcion}</p>
                <p className="text-lg font-bold mt-2">${producto.precio}</p>
                <p className="text-sm text-gray-500">Stock: {producto.stock}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-primary">
              {activeTab === "servicios"
                ? "Agregar Servicio"
                : "Agregar Producto"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Nombre"
                className="border p-2 rounded"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Descripción"
                className="border p-2 rounded"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                required
              />
              <input
                type="number"
                placeholder="Precio"
                className="border p-2 rounded"
                value={formData.precio}
                onChange={(e) =>
                  setFormData({ ...formData, precio: e.target.value })
                }
                required
              />

              {activeTab === "productos" && (
                <input
                  type="number"
                  placeholder="Stock"
                  className="border p-2 rounded"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  required
                />
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardServicios;
