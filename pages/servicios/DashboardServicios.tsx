import React, { useEffect, useState } from "react";
import { useUser } from "../../src/context/UserContext";
import { toast } from "react-toastify";
import RenovarStockModal from "../../src/componentes/RenovarStockModal";

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
  duracion: number;
  especialidad: string;
};

function DashboardServicios() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"productos" | "servicios">("servicios");

  const [showModal, setShowModal] = useState(false);
  const [showRenovarModal, setShowRenovarModal] = useState(false);

  const [formData, setFormData] = useState<any>({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    duracion: "",
    especialidad: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { user } = useUser();

  // --- Cargar datos ---
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
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Validaciones ---
  const validateField = (name: string, value: any) => {
    let msg = "";
    const val = String(value ?? "").trim();

    if (name === "nombre" && val.length < 2) msg = "El nombre debe tener al menos 2 caracteres.";
    if (name === "descripcion" && val.length < 5) msg = "La descripción debe tener al menos 5 caracteres.";
    if (name === "precio" && (isNaN(Number(value)) || Number(value) <= 0)) msg = "El precio debe ser mayor que 0.";
    if (name === "stock" && activeTab === "productos" && (!Number.isInteger(Number(value)) || Number(value) < 0))
      msg = "El stock debe ser un número entero mayor o igual a 0.";
    if (name === "duracion" && activeTab === "servicios" && (isNaN(Number(value)) || Number(value) <= 0))
      msg = "La duración debe ser mayor que 0.";
    if (name === "especialidad" && activeTab === "servicios" && val.length < 3)
      msg = "La especialidad debe tener al menos 3 caracteres.";

    setFormErrors((prev) => ({ ...prev, [name]: msg }));
  };

  const isFormValid = () => {
    if (Object.values(formErrors).some((e) => e)) return false;
    if (!formData.nombre || !formData.descripcion || !formData.precio) return false;
    if (activeTab === "productos" && formData.stock === "") return false;
    if (activeTab === "servicios" && (!formData.duracion || !formData.especialidad)) return false;
    return true;
  };

  // --- Crear / Editar ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast.error("Corrige los errores antes de guardar.");
      return;
    }

    try {
      const baseUrl =
        activeTab === "servicios"
          ? "http://localhost:3001/api/servicios"
          : "http://localhost:3001/api/productos";

      const body =
        activeTab === "servicios"
          ? {
              nombre: formData.nombre,
              descripcion: formData.descripcion,
              precio: Number(formData.precio),
              duracion: Number(formData.duracion),
              especialidad: formData.especialidad,
            }
          : {
              nombre: formData.nombre,
              descripcion: formData.descripcion,
              precio: Number(formData.precio),
              stock: Number(formData.stock),
            };

      const method = formData.id ? "PUT" : "POST";
      const url = formData.id ? `${baseUrl}/${formData.id}` : baseUrl;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error en la solicitud");

      toast.success(formData.id ? "Actualizado correctamente" : "Creado correctamente");
      setShowModal(false);
      setFormData({
        nombre: "",
        descripcion: "",
        precio: "",
        stock: "",
        duracion: "",
        especialidad: "",
      });
      setFormErrors({});
      fetchData();
    } catch {
      toast.error("Error al guardar");
    }
  };

  const handleEdit = (item: any) => {
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const urlBase =
        activeTab === "servicios"
          ? "http://localhost:3001/api/servicios"
          : "http://localhost:3001/api/productos";

      await fetch(`${urlBase}/${id}`, { method: "DELETE" });
      toast.success("Eliminado correctamente");
      fetchData();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  if (loading) return <p className="text-center mt-10">Cargando datos...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">Gestión de Productos y Servicios</h1>

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

      {/* Botones admin */}
      {user?.role === "admin" && (
        <>
          <button
            onClick={() => {
              setFormData({
                nombre: "",
                descripcion: "",
                precio: "",
                stock: "",
                duracion: "",
                especialidad: "",
              });
              setShowModal(true);
            }}
            className="mb-3 px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark transition"
          >
            + {activeTab === "servicios" ? "Agregar Servicio" : "Agregar Producto"}
          </button>

          {/* 🔹 Botón Renovar stock */}
          {activeTab === "productos" && (
            <button
              onClick={() => setShowRenovarModal(true)}
              className="mb-6 ml-3 px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
            >
              Renovar stock
            </button>
          )}
        </>
      )}

      {/* Listado */}
      {activeTab === "servicios" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicios.map((s) => (
            <div
              key={s.id}
              className="bg-white p-4 rounded-2xl shadow hover:shadow-lg transition flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-primary">{s.nombre}</h2>
                <p className="text-gray-600">{s.descripcion}</p>
                <p className="text-lg font-bold mt-2">${s.precio}</p>
                <p className="text-sm text-gray-500">
                  Duración: {s.duracion}h | Especialidad: {s.especialidad}
                </p>
              </div>
              {user?.role === "admin" && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(s)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productos.map((p) => (
            <div
              key={p.id}
              className="bg-white p-4 rounded-2xl shadow hover:shadow-lg transition flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-primary">{p.nombre}</h2>
                <p className="text-gray-600">{p.descripcion}</p>
                <p className="text-lg font-bold mt-2">${p.precio}</p>
                <p className="text-sm text-gray-500">Stock actual: {p.stock}</p>
              </div>
              {user?.role === "admin" && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(p)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal agregar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-xl p-8 relative"
            style={{ animation: "fadeZoomIn 0.25s ease-out" }}
          >
            <h2 className="text-2xl font-semibold text-primary mb-4 text-center">
              {formData.id
                ? activeTab === "servicios"
                  ? "Editar Servicio"
                  : "Editar Producto"
                : activeTab === "servicios"
                ? "Agregar Servicio"
                : "Agregar Producto"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { name: "nombre", type: "text", label: "Nombre", placeholder: "Nombre del producto o servicio" },
                { name: "descripcion", type: "textarea", label: "Descripción", placeholder: "Descripción detallada" },
                { name: "precio", type: "number", label: "Precio", placeholder: "Precio en pesos" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      placeholder={field.placeholder}
                      className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-primary/50"
                      value={formData[field.name]}
                      onChange={(e) => {
                        setFormData({ ...formData, [field.name]: e.target.value });
                        validateField(field.name, e.target.value);
                      }}
                    />
                  ) : (
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-primary/50"
                      value={formData[field.name]}
                      onChange={(e) => {
                        setFormData({ ...formData, [field.name]: e.target.value });
                        validateField(field.name, e.target.value);
                      }}
                    />
                  )}
                  {formErrors[field.name] && (
                    <p className="text-red-600 text-sm mt-1">{formErrors[field.name]}</p>
                  )}
                </div>
              ))}

              {activeTab === "servicios" && (
                <>
                  <div>
                    <input
                      type="number"
                      placeholder="Duración (horas)"
                      className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-primary/50"
                      value={formData.duracion}
                      onChange={(e) => {
                        setFormData({ ...formData, duracion: e.target.value });
                        validateField("duracion", e.target.value);
                      }}
                    />
                    {formErrors.duracion && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.duracion}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Especialidad"
                      className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-primary/50"
                      value={formData.especialidad}
                      onChange={(e) => {
                        setFormData({ ...formData, especialidad: e.target.value });
                        validateField("especialidad", e.target.value);
                      }}
                    />
                    {formErrors.especialidad && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.especialidad}</p>
                    )}
                  </div>
                </>
              )}

              {activeTab === "productos" && null}

              {/* Botones */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid()}
                  className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark disabled:opacity-60 transition"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔹 Nuevo modal: Renovar stock */}
      {showRenovarModal && (
        <RenovarStockModal
          onClose={() => setShowRenovarModal(false)}
          onCompraRealizada={fetchData}
        />
      )}

      {/* Animación */}
      <style>{`
        @keyframes fadeZoomIn {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default DashboardServicios;
