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

type FormData = {
  nombre: string;
  descripcion: string;
  precio: number | "";
  stock?: number | "";
};

const baseURL = "http://localhost:3001/api";

function DashboardServicios() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"productos" | "servicios">("servicios");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
  });

  const fetchData = async () => {
    try {
      const [resServicios, resProductos] = await Promise.all([
        fetch(`${baseURL}/servicios`),
        fetch(`${baseURL}/productos`),
      ]);
      setServicios(await resServicios.json());
      setProductos(await resProductos.json());
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        nombre: item.nombre,
        descripcion: item.descripcion,
        precio: item.precio,
        stock: item.stock ?? "",
      });
    } else {
      setEditingId(null);
      setFormData({ nombre: "", descripcion: "", precio: "", stock: "" });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url =
        activeTab === "servicios"
          ? `${baseURL}/servicios${editingId ? `/${editingId}` : ""}`
          : `${baseURL}/productos${editingId ? `/${editingId}` : ""}`;
      const method = editingId ? "PUT" : "POST";

      const body =
        activeTab === "servicios"
          ? {
              nombre: formData.nombre,
              descripcion: formData.descripcion,
              precio: formData.precio,
            }
          : {
              nombre: formData.nombre,
              descripcion: formData.descripcion,
              precio: formData.precio,
              stock: formData.stock,
            };

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este elemento?")) return;
    try {
      const url =
        activeTab === "servicios"
          ? `${baseURL}/servicios/${id}`
          : `${baseURL}/productos/${id}`;
      await fetch(url, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  if (loading) return <p className="text-center mt-10">Cargando datos...</p>;

  const data = activeTab === "servicios" ? servicios : productos;

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
            activeTab === "servicios" ? "bg-primary text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Servicios
        </button>
        <button
          onClick={() => setActiveTab("productos")}
          className={`px-4 py-2 rounded-lg ${
            activeTab === "productos" ? "bg-primary text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Productos
        </button>
      </div>

      {/* Botón agregar */}
      <div className="mb-6">
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark transition"
        >
          + {activeTab === "servicios" ? "Agregar Servicio" : "Agregar Producto"}
        </button>
      </div>

      {/* LISTADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item: any) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl shadow flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-primary">{item.nombre}</h2>
            <p className="text-gray-600">{item.descripcion}</p>
            <p className="text-lg font-bold mt-2">${item.precio}</p>
            {"stock" in item && <p className="text-sm text-gray-500">Stock: {item.stock}</p>}

            <div className="flex gap-2 mt-2">
              <button onClick={() => openModal(item)} className="px-2 py-1 bg-blue-500 text-white rounded">
                Editar
              </button>
              <button onClick={() => handleDelete(item.id)} className="px-2 py-1 bg-red-500 text-white rounded">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-primary">
              {editingId ? "Editar" : "Agregar"} {activeTab === "servicios" ? "Servicio" : "Producto"}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Nombre"
                className="border p-2 rounded"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
              <textarea
                placeholder="Descripción"
                className="border p-2 rounded"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Precio"
                className="border p-2 rounded"
                value={formData.precio}
                onChange={(e) =>
                  setFormData({ ...formData, precio: e.target.value === "" ? "" : Number(e.target.value) })
                }
                required
                min={0}
              />
              {activeTab === "productos" && (
                <input
                  type="number"
                  placeholder="Stock"
                  className="border p-2 rounded"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  required
                  min={0}
                />
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded">
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
