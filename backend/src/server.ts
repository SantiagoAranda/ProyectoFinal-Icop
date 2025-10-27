import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import turnoRoutes from "./routes/turnoRoutes";
import servicioRoutes from "./routes/servicio.Routes";
import empleadoRoutes from "./routes/empleados.routes";
import productoRoutes from "./routes/productos.routes";
import tesoreriaRoutes from './routes/tesoreria.routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// ✅ Configurar CORS para Render y entorno local
const allowedOrigins = [
  "http://localhost:5173", // desarrollo local
  "https://pagina-de-gestion-de-salon.onrender.com", // frontend en Render
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("No permitido por CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// ✅ Ruta base de prueba
app.get("/", (_req, res) => {
  res.send("Servidor funcionando 🚀");
});

// ✅ Montar rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/turnos", turnoRoutes);
app.use("/api/servicios", servicioRoutes);
app.use("/api/empleados", empleadoRoutes);
app.use("/api/productos", productoRoutes);
app.use('/api/tesoreria', tesoreriaRoutes);

// ✅ Puerto dinámico (Render) o local
const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
