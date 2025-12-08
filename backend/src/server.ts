import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { prisma } from "./prisma";

// Rutas
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import turnosRoutes from "./routes/turnoRoutes";
import empleadosRoutes from "./routes/empleados.routes";
import productosRoutes from "./routes/productos.routes";
import serviciosRoutes from "./routes/servicio.Routes";
import tesoreriaRoutes from "./routes/tesoreria.routes";
import estadisticasRoutes from "./routes/estadisticas.routes";
import comprasRoutes from "./routes/compras.routes";
import proveedoresRoutes from "./routes/proveedores.routes";
import egresosRoutes from "./routes/egresos.routes";
import ventasFisicasRoutes from "./routes/ventasFisicas.routes";
import clientesRoutes from "./routes/clientes.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Montar rutas
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/turnos", turnosRoutes);
app.use("/api/empleados", empleadosRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/servicios", serviciosRoutes);
app.use("/api/tesoreria", tesoreriaRoutes);
app.use("/api/estadisticas", estadisticasRoutes);
app.use("/api/compras", comprasRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/egresos", egresosRoutes);
app.use("/api/ventas-fisicas", ventasFisicasRoutes);
app.use("/api/clientes", clientesRoutes);



app.get("/", (_req, res) => res.send("Servidor activo y en ejecución"));

app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log(`Servidor corriendo en puerto ${PORT}`);
  } catch (err) {
    console.error("Error al conectar con la base de datos:", err);
  }
});