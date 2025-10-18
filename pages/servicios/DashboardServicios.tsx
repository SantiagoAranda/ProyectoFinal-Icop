import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { toast } from "react-toastify";

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

  // Validaciones
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { user } = useUser();

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
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // validadores mínimos
  const validateField = (name: string, value: any) => {
    let msg = "";
    if (name === "nombre") {
      const val = String(value ?? "").trim();
      if (val.length === 0) msg = "El nombre es obligatorio.";
      else if (val.length < 2) msg = "El nombre debe tener al menos 2 caracteres.";
    }
    if (name === "descripcion") {
      const val = String(value ?? "").trim();
      if (val.length === 0) msg = "La descripción es obligatoria.";
      else if (val.length < 5) msg = "La descripción debe tener al menos 5 caracteres.";
    }
    if (name === "precio") {
      const num = Number(value);
      if (value === "" || value === null) msg = "El precio es obligatorio.";
      else if (Number.isNaN(num) || num <= 0) msg = "El precio debe ser un número mayor que 0.";
    }
    if (name === "stock") {
      const num = Number(value);
      if (activeTab === "productos") {
        if (value === "" || value === null) msg = "El stock es obligatorio.";
        else if (!Number.isInteger(num) || num < 0) msg = "El stock debe ser un entero >= 0.";
      }
    }

    setFormErrors((prev) => {
      const copy = { ...prev };
      if (msg) copy[name] = msg;
      else delete copy[name];
      return copy;
    });
  };

  const validateAll = () => {
    validateField("nombre", formData.nombre);
    validateField("descripcion", formData.descripcion);
    validateField("precio", formData.precio);
    if (activeTab === "productos") validateField("stock", formData.stock);
    return Object.keys({
      ...formErrors,
      ...(formData ? {} : {}),
    }).length === 0;
  };

  const isFormValid = () => {
    // quick check: required fields present and no errors
    if (!formData.nombre || !formData.descripcion || formData.precio === "") return false;
    if (activeTab === "productos" && formData.stock === "") return false;
    return Object.keys(formErrors).length === 0;
  };

  // --- CREAR / EDITAR ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validar antes de enviar
    validateField("nombre", formData.nombre);
    validateField("descripcion", formData.descripcion);
    validateField("precio", formData.precio);
    if (activeTab === "productos") validateField("stock", formData.stock);
    if (Object.keys(formErrors).length > 0) {
      toast.error("Corrige los errores del formulario antes de guardar.");
      return;
    }

    // comprobación final sobre valores parseados
    const precioNum = Number(formData.precio);
    const stockNum = activeTab === "productos" ? Number(formData.stock) : undefined;
    if (Number.isNaN(precioNum) || precioNum <= 0) {
      toast.error("El precio debe ser un número válido mayor a 0.");
      return;
    }
    if (activeTab === "productos" && (!Number.isInteger(stockNum) || stockNum! < 0)) {
      toast.error("El stock debe ser un entero >= 0.");
      return;
    }

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
              precio: Number(precioNum),
              stock: Number(stockNum),
            };

      await fetch(url, {
        method: formData.id ? "PUT" : "POST", // PUT si es edición
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      toast.success(formData.id ? "Actualizado correctamente" : "Creado correctamente");
      setShowModal(false);
      setFormData({ nombre: "", descripcion: "", precio: "", stock: "" });
      setFormErrors({});
      fetchData();
    } catch (error) {
      toast.error("Error al guardar");
    }
  };

  // --- EDITAR ---
  const handleEdit = (item: any) => {
    setFormData(item);
    // validar pre-llenado
    setTimeout(() => {
      validateField("nombre", item.nombre);
      validateField("descripcion", item.descripcion);
      validateField("precio", item.precio);
      if (activeTab === "productos") validateField("stock", item.stock);
    }, 0);
    setShowModal(true);
  };

  // --- ELIMINAR ---
  const handleDelete = async (id: number) => {
    try {
      const urlBase =
        activeTab === "servicios"
          ? "http://localhost:3001/api/servicios"
          : "http://localhost:3001/api/productos";

      await fetch(`${urlBase}/${id}`, {
        method: "DELETE",
      });

      toast.success("Eliminado correctamente");
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar");
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
      {user?.role === "admin" && (
        <div className="mb-6">
          <button
            onClick={() => {
              setFormData({ nombre: "", descripcion: "", precio: "", stock: "" });
              setFormErrors({});
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark transition"
          >
            + {activeTab === "servicios" ? "Agregar Servicio" : "Agregar Producto"}
          </button>
        </div>
      )}

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
              {user?.role === "admin" && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(servicio)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(servicio.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded"
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
              {user?.role === "admin" && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(producto)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(producto.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-primary">
              {activeTab === "servicios" ? "Agregar Servicio" : "Agregar Producto"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Nombre"
                className="border p-2 rounded"
                value={formData.nombre}
                onChange={(e) => {
                  setFormData({ ...formData, nombre: e.target.value });
                  validateField("nombre", e.target.value);
                }}
                required
              />
              {formErrors.nombre && <div className="text-sm text-red-600">{formErrors.nombre}</div>}
              <textarea
                placeholder="Descripción"
                className="border p-2 rounded"
                value={formData.descripcion}
                onChange={(e) => {
                  setFormData({ ...formData, descripcion: e.target.value });
                  validateField("descripcion", e.target.value);
                }}
                required
              />
              {formErrors.descripcion && <div className="text-sm text-red-600">{formErrors.descripcion}</div>}
              <input
                type="number"
                placeholder="Precio"
                className="border p-2 rounded"
                value={formData.precio}
                onChange={(e) => {
                  setFormData({ ...formData, precio: e.target.value });
                  validateField("precio", e.target.value);
                }}
                required
              />
              {formErrors.precio && <div className="text-sm text-red-600">{formErrors.precio}</div>}

              {activeTab === "productos" && (
                <input
                  type="number"
                  placeholder="Stock"
                  className="border p-2 rounded"
                  value={formData.stock}
                  onChange={(e) => {
                    setFormData({ ...formData, stock: e.target.value });
                    validateField("stock", e.target.value);
                  }}
                  required
                />
              )}
              {activeTab === "productos" && formErrors.stock && <div className="text-sm text-red-600">{formErrors.stock}</div>}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid()}
                  className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-60"
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
