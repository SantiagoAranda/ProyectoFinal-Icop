# React + TypeScript + Vite

<div align="center">
<strong>Sistema de Gestión de Salón de Belleza</strong>
<strong>Proyecto Final Icop</strong>
</div>
<strong>Descripción general</strong>

Aplicación web completa para la gestión integral de un salón de belleza, con administración de turnos, tesorería, productos, servicios y empleados.

El sistema fue desarrollado como proyecto final de la carrera, pero también implementado de forma real para un cliente familiar, con el objetivo de cubrir las necesidades operativas de un negocio de estética.

Su diseño busca reflejar un entorno de trabajo auténtico, priorizando la organización, escalabilidad y facilidad de uso.

<strong>Características principales</strong>

Autenticación con roles (admin, tesorero, empleado y cliente).

Gestión de turnos con disponibilidad y validaciones.

Panel de administración con vistas previas de servicios, tesorería, empleados y turnos.

Tesorería con estadísticas de ingresos y egresos.

Gestión de productos y servicios (stock, precios, márgenes, descuentos).

Módulo de empleados con cálculo de ocupación y especialidades.

Diseño moderno y responsive utilizando TailwindCSS.

<strong>Tecnologías utilizadas</strong>
<strong>Frontend</strong>

React + Vite
TailwindCSS
Axios
Recharts

<strong>Backend</strong>

Node.js + Express
Prisma ORM
PostgreSQL
JSON Web Token (JWT) para autenticación

<strong>Base de datos</strong>

Motor: PostgreSQL
ORM: Prisma

<strong>Roles disponibles</strong>
Rol	Permisos
Admin	Acceso total: empleados, tesorería, servicios y turnos
Tesorero	Acceso a las estadísticas de tesorería
Empleado	Visualiza solo sus turnos asignados
Cliente	Solicita turnos y agrega productos al reservar
