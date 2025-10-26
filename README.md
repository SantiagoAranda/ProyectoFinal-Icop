# React + TypeScript + Vite

Sistema de Gestión de Salón de Belleza — Proyecto Final Icop
Descripción general

Aplicación web completa para la gestión integral de un salón de belleza, con administración de turnos, tesorería, productos, servicios y empleados.

El sistema fue desarrollado como proyecto final de la carrera, pero también implementado de forma real para un cliente familiar, con el objetivo de cubrir las necesidades operativas de un negocio de estética.

Su diseño busca reflejar un entorno de trabajo auténtico, priorizando la organización, escalabilidad y facilidad de uso.

Características principales

Autenticación con roles (admin, tesorero, empleado y cliente).

Gestión de turnos con disponibilidad y validaciones.

Panel de administración con vistas previas de servicios, tesorería, empleados y turnos.

Tesorería con estadísticas de ingresos y egresos.

Gestión de productos y servicios (stock, precios, márgenes, descuentos).

Módulo de empleados con cálculo de ocupación y especialidades.

Diseño moderno y responsive utilizando TailwindCSS.

Tecnologías utilizadas
Frontend

React + Vite

TailwindCSS

Axios

Recharts

Backend

Node.js + Express

Prisma ORM

PostgreSQL

JSON Web Token (JWT) para autenticación

Base de datos

Motor: PostgreSQL
ORM: Prisma

Roles disponibles
Rol	Permisos
Admin	Acceso total: empleados, tesorería, servicios y turnos

Tesorero	Acceso a las estadísticas de tesorería

Empleado	Visualiza solo sus turnos asignados

Cliente	Solicita turnos y agrega productos al reservar

Arquitectura

El sistema sigue una arquitectura cliente-servidor desacoplada:
El frontend (React + Vite) consume la API REST del backend.
El backend (Node.js + Express) maneja la lógica de negocio, autenticación y conexión con la base de datos mediante Prisma.
La base de datos (PostgreSQL) gestiona usuarios, turnos, productos, servicios y transacciones financieras.

Créditos
Proyecto desarrollado como trabajo final académico con aplicación real en un salón de belleza familiar.
Puede ser utilizado como referencia o inspiración para proyectos personales y educativos.

