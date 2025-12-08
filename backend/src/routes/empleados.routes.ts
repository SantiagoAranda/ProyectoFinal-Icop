import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const empleados = await prisma.user.findMany({
      where: {
        role: {
          in: ["EMPLEADO", "ADMIN", "TESORERO"],
        },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        especialidad: true,
        activo: true,
        role: true,
        turnosEmpleado: {
          select: {
            servicio: {
              select: {
                duracion: true,
              },
            },
          },
        },
      },
      orderBy: {
        nombre: "asc",
      },
    });

    const horasLaboralesTotales = 10 * 5;

    const usuariosInternos = empleados.map((emp) => {
      if (emp.role !== "EMPLEADO") {
        return {
          id: emp.id,
          nombre: emp.nombre,
          email: emp.email,
          especialidad: emp.especialidad,
          activo: emp.activo,
          role: emp.role,
          eficiencia: null,
        };
      }

      const horasOcupadas = emp.turnosEmpleado.reduce(
        (sum, turno) => sum + (turno.servicio?.duracion ?? 0),
        0
      );

      const ocupacion = Math.min(
        Math.round((horasOcupadas / horasLaboralesTotales) * 100),
        100
      );

      return {
        id: emp.id,
        nombre: emp.nombre,
        email: emp.email,
        especialidad: emp.especialidad,
        activo: emp.activo,
        role: emp.role,
        eficiencia: ocupacion,
      };
    });

    res.json(usuariosInternos);
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    res.status(500).json({ message: "Error al obtener empleados" });
  }
});

export default router;
