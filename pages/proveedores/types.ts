export interface Proveedor {
  id: number;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  notas?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    productos: number;
  };
}

export interface ProveedorDetalle extends Proveedor {
  productos: ProductoProveedor[];
}

export interface ProductoProveedor {
  id: number;
  nombre: string;
  precio: number;
  costoCompra: number | null;
  proveedorId: number | null;
}

export interface ProductoListado extends ProductoProveedor {
  descripcion?: string;
  stock?: number;
  stockPendiente?: number;
  marca?: string | null;
  proveedor?: {
    id: number;
    nombre: string;
  } | null;
}

export interface ProveedorFormValues {
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
}
