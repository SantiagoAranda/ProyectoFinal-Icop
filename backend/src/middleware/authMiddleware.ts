import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization");

  // 👀 Log rápido para depuración
  console.log("🔐 Authorization header recibido:", authHeader);

  // Acepta formatos: "Bearer token" o "bearer token"
  const token = authHeader?.split(" ")[1];

  if (!token) {
    console.log("⚠️ No se encontró token en el header Authorization");
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("❌ JWT_SECRET no está definido en .env");
      return res
        .status(500)
        .json({ message: "Error de configuración del servidor" });
    }

    const decoded = jwt.verify(token, secret) as any;

    console.log("✅ Token válido. Payload decodificado:", decoded);

    // Guardamos el usuario decodificado en la request
    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error("❌ Error verificando token:", err);
    return res.status(403).json({ message: "Token inválido" });
  }
};
