import React, { useEffect, useState } from "react";
import { useUser } from "../../src/context/UserContext";
import { toast } from "react-toastify";
import RenovarStockModal from "../../src/componentes/RenovarStockModal";
import api from "../../src/lib/api";

type Producto = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  stockPendiente: number;
  stockDisponible: number;
};

type Servicio = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  duracion: number;
  especialidad: string;
};

type VentaProducto = {
  productoId: number;
  cantidad: number;
};

function DashboardServicios() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"productos" | "servicios">(
    "servicios"
  );

  const [showModal, setShowModal] = useState(false);
  const [showRenovarModal, setShowRenovarModal] = useState(false);

  // 馃啎 Modal de venta f铆sica
  const [showVentaModal, setShowVentaModal] = useState(false);
  const [ventaProductos, setVentaProductos] = useState<VentaProducto[]>([]);
  const [ventaProductoSelect, setVentaProductoSelect] = useState<number | "">(
    ""
  );

  // 馃啎 Modal Historial de Compras
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialData, setHistorialData] = useState<any[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  // paginaci贸n
  const [historialPage, setHistorialPage] = useState(1);
  const historialPageSize = 5;
  const [historialTotalPages, setHistorialTotalPages] = useState(1);

  const fetchHistorialCompras = async (page = 1) => {
    try {
      setHistorialLoading(true);
      const res = await api.get("/compras", {
        params: { page, pageSize: historialPageSize },
      });

      setHistorialData(res.data.data);
      setHistorialTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("Error cargando historial:", err);
      toast.error("Error al cargar historial de compras.");
    } finally {
      setHistorialLoading(false);
    }
  };

  const [ventaCantidad, setVentaCantidad] = useState<number>(1);
  const [ventaLoading, setVentaLoading] = useState(false);

  const [formData, setFormData] = useState<any>({
    id: undefined,
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
        api.get("/servicios"),
        api.get("/productos"),
      ]);

      setServicios(resServicios.data);
      setProductos(resProductos.data);
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

    if (name === "nombre" && val.length < 2)
      msg = "El nombre debe tener al menos 2 caracteres.";
    if (name === "descripcion" && val.length < 5)
      msg = "La descripci贸n debe tener al menos 5 caracteres.";
    if (name === "precio" && (isNaN(Number(value)) || Number(value) <= 0))
      msg = "El precio debe ser mayor que 0.";
    if (
      name === "stock" &&
      activeTab === "productos" &&
      (!Number.isInteger(Number(value)) || Number(value) < 0)
    )
      msg = "El stock debe ser un n煤mero entero mayor o igual a 0.";
    if (
      name === "duracion" &&
      activeTab === "servicios" &&
      (isNaN(Number(value)) || Number(value) <= 0)
    )
      msg = "La duraci贸n debe ser mayor que 0.";
    if (name === "especialidad" && activeTab === "servicios" && !val)
      msg = "Debes seleccionar una especialidad.";

    setFormErrors((prev) => ({ ...prev, [name]: msg }));
  };

  const isFormValid = () => {
    if (Object.values(formErrors).some((e) => e)) return false;
    if (!formData.nombre || !formData.descripcion || !formData.precio)
      return false;
    if (activeTab === "productos" && formData.stock === "") return false;
    if (
      activeTab === "servicios" &&
      (!formData.duracion || !formData.especialidad)
    )
      return false;
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
      const baseUrl = activeTab === "servicios" ? "/servicios" : "/productos";

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

      const method = formData.id ? "put" : "post";
      const url = formData.id ? `${baseUrl}/${formData.id}` : baseUrl;

      if (method === "post") {
        await api.post(url, body);
      } else {
        await api.put(url, body);
      }

      toast.success(
        formData.id ? "Actualizado correctamente" : "Creado correctamente"
      );
      setShowModal(false);
      setFormData({
        id: undefined,
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
    setFormData({
      id: item.id,
      nombre: item.nombre,
      descripcion: item.descripcion,
      precio: item.precicio ?? item.precio, // por si viene distinto
      stock: "stock" in item ? item.stock : "",
      stockPendiente: "stockPendiente" in item ? item.stockPendiente : 0,  // 馃啎 Guardar stockPendiente
      duracion: "duracion" in item ? item.duracion : "",
      especialidad: "especialidad" in item ? item.especialidad : "",
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const urlBase = activeTab === "servicios" ? "/servicios" : "/productos";
      await api.delete(`${urlBase}/${id}`);
      toast.success("Eliminado correctamente");
      fetchData();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  // ============================
  // 馃啎 L脫GICA VENTA F脥SICA
  // ============================

  const agregarProductoVenta = () => {
    if (ventaProductoSelect === "") return;

    const prod = productos.find((p) => p.id === Number(ventaProductoSelect));
    if (!prod) return;

    if (prod.stockDisponible <= 0) {
      toast.error("Ese producto no tiene stock disponible.");
      return;
    }

    // Evitar duplicados
    if (ventaProductos.some((vp) => vp.productoId === prod.id)) {
      toast.info("Ese producto ya est谩 en la lista.");
      return;
    }

    const cantidadValida = Math.min(
      Math.max(1, ventaCantidad),
      prod.stockDisponible
    );

    setVentaProductos((prev) => [
      ...prev,
      { productoId: prod.id, cantidad: cantidadValida },
    ]);

    setVentaProductoSelect("");
    setVentaCantidad(1);
  };

  const cambiarCantidadProductoVenta = (
    productoId: number,
    cantidad: number
  ) => {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return;

    let nueva = Math.floor(cantidad);
    if (isNaN(nueva) || nueva <= 0) nueva = 1;
    if (nueva > prod.stockDisponible) {
      nueva = prod.stockDisponible;
      toast.info(`M谩ximo disponible: ${prod.stockDisponible}`);
    }

    setVentaProductos((prev) =>
      prev.map((vp) =>
        vp.productoId === productoId ? { ...vp, cantidad: nueva } : vp
      )
    );
  };

  const eliminarProductoVenta = (productoId: number) => {
    setVentaProductos((prev) =>
      prev.filter((vp) => vp.productoId !== productoId)
    );
  };

  const totalVenta = ventaProductos.reduce((sum, vp) => {
    const prod = productos.find((p) => p.id === vp.productoId);
    if (!prod) return sum;
    return sum + prod.precio * vp.cantidad;
  }, 0);

  const registrarVentaFisica = async () => {
    if (ventaProductos.length === 0) {
      toast.error("Agrega al menos un producto a la venta.");
      return;
    }

    // Validaci贸n final contra stock
    for (const vp of ventaProductos) {
      const prod = productos.find((p) => p.id === vp.productoId);
      if (!prod) {
        toast.error("Hay un producto inv谩lido en la lista.");
        return;
      }
      if (vp.cantidad > prod.stockDisponible) {
        toast.error(
          `Stock insuficiente para ${prod.nombre}. Disponible: ${prod.stockDisponible}`
        );
        return;
      }
    }

    try {
      setVentaLoading(true);
      const token = localStorage.getItem("token");

      await api.post(
        "/ventas-fisicas",
        { productos: ventaProductos },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      toast.success("Venta registrada correctamente.");
      setShowVentaModal(false);
      setVentaProductos([]);
      setVentaProductoSelect("");
      setVentaCantidad(1);
      fetchData();
    } catch (error) {
      console.error("Error registrando venta:", error);
      toast.error("Error del servidor al registrar venta.");
    } finally {
      setVentaLoading(false);
    }
  };

  if (loading) return <p className="text-center mt-10">Cargando datos...</p>;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-pink-50 to-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary mb-6">
          Gesti贸n de Productos y Servicios
        </h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("servicios")}
            className={`px-4 py-2 rounded-lg ${activeTab === "servicios"
              ? "bg-primary text-white"
              : "bg-gray-200 text-gray-700"
              }`}
          >
            Servicios
          </button>
          <button
            onClick={() => setActiveTab("productos")}
            className={`px-4 py-2 rounded-lg ${activeTab === "productos"
              ? "bg-primary text-white"
              : "bg-gray-200 text-gray-700"
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
                  id: undefined,
                  nombre: "",
                  descripcion: "",
                  precio: "",
                  stock: "",
                  duracion: "",
                  especialidad: "",
                });
                setFormErrors({});
                setShowModal(true);
              }}
              className="mb-3 px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark transition"
            >
              +{" "}
              {activeTab === "servicios"
                ? "Agregar Servicio"
                : "Agregar Producto"}
            </button>

            {/* 馃敼 Botones adicionales cuando est谩 en productos */}
            {activeTab === "productos" && (
              <>
                <button
                  onClick={() => setShowRenovarModal(true)}
                  className="mb-6 ml-3 px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
                >
                  Renovar stock
                </button>

                <button
                  onClick={() => setShowVentaModal(true)}
                  className="mb-6 ml-3 px-4 py-2 bg-amber-500 text-white rounded-lg shadow hover:bg-amber-600 transition"
                >
                  Registrar venta f铆sica
                </button>
                <button
                  onClick={() => {
                    setShowHistorialModal(true);
                    fetchHistorialCompras(1);
                  }}
                  className="mb-6 ml-3 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                >
                  Ver historial de compras
                </button>
              </>
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
                  <h2 className="text-xl font-semibold text-primary">
                    {s.nombre}
                  </h2>
                  <p className="text-gray-600">{s.descripcion}</p>
                  <p className="text-lg font-bold mt-2">${s.precio}</p>
                  <p className="text-sm text-gray-500">
                    Duraci贸n: {s.duracion}h | Especialidad: {s.especialidad}
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
                  <h2 className="text-xl font-semibold text-primary">
                    {p.nombre}
                  </h2>
                  <p className="text-gray-600">{p.descripcion}</p>
                  <p className="text-lg font-bold mt-2">${p.precio}</p>
                  {user?.role === "admin" ? (
                    <>
                      <p className="text-sm text-gray-500">
                        Stock real: {p.stock}
                      </p>
                      <p className="text-sm text-gray-500">
                        Reservado: {p.stockPendiente}
                      </p>
                      <p className="text-sm text-green-600 font-semibold">
                        Disponible: {p.stockDisponible}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-green-600 font-semibold">
                      Disponible: {p.stockDisponible}
                    </p>
                  )}
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
                  {
                    name: "nombre",
                    type: "text",
                    label: "Nombre",
                    placeholder: "Nombre del producto o servicio",
                  },
                  {
                    name: "descripcion",
                    type: "textarea",
                    label: "Descripci贸n",
                    placeholder: "Descripci贸n detallada",
                  },
                  {
                    name: "precio",
                    type: "number",
                    label: "Precio",
                    placeholder: "Precio en pesos",
                  },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        placeholder={field.placeholder}
                        className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-primary/50"
                        value={formData[field.name]}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            [field.name]: e.target.value,
                          });
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
                          let value = e.target.value;
                          // Remover ceros al inicio para campos num茅ricos
                          if (field.name === "precio" && value.length > 1 && value.startsWith("0") && value[1] !== ".") {
                            value = value.replace(/^0+/, '');
                          }
                          setFormData({
                            ...formData,
                            [field.name]: value,
                          });
                          validateField(field.name, value);
                        }}
                      />
                    )}
                    {formErrors[field.name] && (
                      <p className="text-red-600 text-sm mt-1">
                        {formErrors[field.name]}
                      </p>
                    )}
                  </div>
                ))}

                {activeTab === "servicios" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duraci贸n
                      </label>
                      <input
                        type="number"
                        placeholder="Duraci贸n (horas)"
                        className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-primary/50"
                        value={formData.duracion}
                        onChange={(e) => {
                          let value = e.target.value;
                          // Remover ceros al inicio
                          if (value.length > 1 && value.startsWith("0") && value[1] !== ".") {
                            value = value.replace(/^0+/, '');
                          }
                          setFormData({
                            ...formData,
                            duracion: value,
                          });
                          validateField("duracion", value);
                        }}
                      />
                      {formErrors.duracion && (
                        <p className="text-red-600 text-sm mt-1">
                          {formErrors.duracion}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Especialidad
                      </label>
                      <select
                        className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-primary/50"
                        value={formData.especialidad}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            especialidad: e.target.value,
                          });
                          validateField("especialidad", e.target.value);
                        }}
                      >
                        <option value="">Selecciona una especialidad</option>
                        <option value="Peluquer铆a">Peluquer铆a</option>
                        <option value="U帽as">U帽as</option>
                        <option value="Masajes">Masajes</option>
                        <option value="Depilaci贸n">Depilaci贸n</option>
                      </select>
                      {formErrors.especialidad && (
                        <p className="text-red-600 text-sm mt-1">
                          {formErrors.especialidad}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {activeTab === "productos" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock inicial
                    </label>
                    <input
                      type="number"
                      placeholder="Stock inicial"
                      className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-primary/50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={formData.stock}
                      disabled={formData.id && formData.stockPendiente > 0}  // 馃啎 Deshabilitar si hay reservas
                      onChange={(e) => {
                        let value = e.target.value;
                        // Remover ceros al inicio
                        if (value.length > 1 && value.startsWith("0") && value[1] !== ".") {
                          value = value.replace(/^0+/, '');
                        }
                        setFormData({
                          ...formData,
                          stock: value,
                        });
                        validateField("stock", value);
                      }}
                    />
                    {/* 馃啎 Mensaje cuando est谩 deshabilitado */}
                    {formData.id && formData.stockPendiente > 0 && (
                      <p className="text-amber-600 text-sm mt-1 flex items-center gap-1">
                        <span>鈿狅笍</span>
                        No se puede modificar el stock porque hay {formData.stockPendiente} producto(s) reservado(s)
                      </p>
                    )}
                    {formErrors.stock && (
                      <p className="text-red-600 text-sm mt-1">
                        {formErrors.stock}
                      </p>
                    )}
                  </div>
                )}

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

        {/* 馃敼 Modal: Renovar stock */}
        {showRenovarModal && (
          <RenovarStockModal
            onClose={() => setShowRenovarModal(false)}
            onCompraRealizada={fetchData}
          />
        )}

        {/* 馃敼 Modal: Venta f铆sica */}
        {showVentaModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 relative">
              <h2 className="text-2xl font-semibold text-primary mb-4 text-center">
                Registrar venta f铆sica
              </h2>

              {/* Selector + cantidad + bot贸n Agregar */}
              <div className="flex flex-wrap gap-2 mb-4">
                <select
                  className="flex-1 min-w-[160px] border border-gray-300 p-2 h-[42px] rounded-lg"
                  value={ventaProductoSelect}
                  onChange={(e) =>
                    setVentaProductoSelect(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                >
                  <option value="">Selecciona un producto</option>
                  {productos
                    .filter((p) => p.stockDisponible > 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} 鈥� ${p.precio} (Disp: {p.stockDisponible})
                      </option>
                    ))}
                </select>

                <input
                  type="number"
                  min={1}
                  className="w-20 border border-gray-300 p-2 h-[42px] rounded-lg"
                  value={ventaCantidad}
                  onChange={(e) => setVentaCantidad(Number(e.target.value))}
                />

                <button
                  type="button"
                  onClick={agregarProductoVenta}
                  disabled={ventaProductoSelect === "" || ventaCantidad <= 0 || String(ventaCantidad).startsWith('0')}
                  className="px-4 h-[42px] bg-primary text-white rounded-lg shadow hover:bg-primary-dark disabled:opacity-60 transition"
                >
                  Agregar
                </button>
              </div>

              {/* Lista de productos en la venta */}
              {ventaProductos.length === 0 ? (
                <p className="text-sm text-gray-600 mb-4">
                  No hay productos agregados a la venta.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
                  {ventaProductos.map((vp) => {
                    const prod = productos.find((p) => p.id === vp.productoId);
                    if (!prod) return null;

                    return (
                      <div
                        key={vp.productoId}
                        className="flex items-center justify-between gap-2 border rounded-lg p-2"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {prod.nombre}
                          </p>
                          <p className="text-xs text-gray-500">
                            ${prod.precio} c/u 鈥� Disp: {prod.stockDisponible}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            className="w-20 border border-gray-300 p-1 rounded"
                            value={vp.cantidad}
                            onChange={(e) =>
                              cambiarCantidadProductoVenta(
                                vp.productoId,
                                Number(e.target.value)
                              )
                            }
                          />

                          <span className="text-sm font-semibold text-gray-800">
                            ${prod.precio * vp.cantidad}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              eliminarProductoVenta(vp.productoId)
                            }
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center border-t pt-3 mb-4">
                <span className="font-semibold text-gray-700">
                  Total de la venta:
                </span>
                <span className="text-lg font-bold text-primary">
                  ${totalVenta}
                </span>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowVentaModal(false);
                    setVentaProductos([]);
                    setVentaProductoSelect("");
                    setVentaCantidad(1);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={registrarVentaFisica}
                  disabled={ventaLoading || ventaProductos.length === 0}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg shadow hover:bg-amber-600 disabled:opacity-60 transition"
                >
                  {ventaLoading ? "Registrando..." : "Confirmar venta"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 馃敼 Modal: Historial de Compras */}
        {showHistorialModal && (
          <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowHistorialModal(false)}
            ></div>

            {/* Panel lateral */}
            <div className="relative ml-auto h-full w-[450px] bg-white shadow-xl transform transition-all duration-300 translate-x-0">
              {/* ENCABEZADO */}
              <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
                <h2 className="text-xl font-semibold">Historial de Compras</h2>
                <button
                  onClick={() => setShowHistorialModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  脳
                </button>
              </div>

              {/* CONTENIDO */}
              <div className="p-4 overflow-y-auto h-[calc(100%-70px)]">
                {historialLoading ? (
                  <p className="text-center text-gray-500">Cargando...</p>
                ) : historialData.length === 0 ? (
                  <p className="text-center text-gray-500">
                    No hay compras registradas.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {historialData.map((compra: any) => (
                      <div
                        key={compra.id}
                        className="p-4 rounded-lg border shadow-sm bg-gray-50"
                      >
                        {/* Proveedor y Fecha */}
                        <p className="font-semibold text-gray-800">
                          Proveedor: {compra.proveedor?.nombre}
                        </p>
                        <p className="text-sm text-gray-500">
                          Fecha:{" "}
                          {new Date(compra.fecha).toLocaleDateString("es-AR")}
                        </p>

                        {/* Productos */}
                        {compra.detalles.length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium mb-1">Productos:</p>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                              {compra.detalles.map((det: any) => (
                                <li
                                  key={det.id}
                                  className="flex justify-between"
                                >
                                  <span>
                                    {det.producto.nombre} 脳 {det.cantidad}
                                  </span>
                                  <span className="text-gray-500">
                                    $
                                    {det.subtotal.toLocaleString("es-AR")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Total */}
                        <p className="text-lg font-bold text-primary mt-3">
                          Total: $
                          {compra.total.toLocaleString("es-AR")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* PAGINACI脫N */}
                {historialTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-6">
                    <button
                      disabled={historialPage <= 1}
                      onClick={() => {
                        const prev = historialPage - 1;
                        setHistorialPage(prev);
                        fetchHistorialCompras(prev);
                      }}
                      className={`px-3 py-1 rounded border ${historialPage === 1
                        ? "opacity-40"
                        : "hover:bg-gray-100"
                        }`}
                    >
                      Anterior
                    </button>

                    <span className="text-sm text-gray-600">
                      P谩gina {historialPage} de {historialTotalPages}
                    </span>

                    <button
                      disabled={historialPage >= historialTotalPages}
                      onClick={() => {
                        const next = historialPage + 1;
                        setHistorialPage(next);
                        fetchHistorialCompras(next);
                      }}
                      className={`px-3 py-1 rounded border ${historialPage === historialTotalPages
                        ? "opacity-40"
                        : "hover:bg-gray-100"
                        }`}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Animaci贸n */}
        <style>{`
          @keyframes fadeZoomIn {
            0% { opacity: 0; transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default DashboardServicios;