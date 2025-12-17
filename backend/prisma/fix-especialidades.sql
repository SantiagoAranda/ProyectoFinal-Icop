-- Script para corregir especialidades existentes en la base de datos -- Actualizar usuarios con especialidad "Peluquero" a "Peluquería" 
UPDATE "User" SET especialidad = 'Peluquería' WHERE especialidad = 
'Peluquero'; -- Actualizar usuarios con especialidad "Masajista" a "Masajes" 
UPDATE "User" SET especialidad = 'Masajes' WHERE especialidad = 
'Masajista'; -- Actualizar usuarios con especialidad "Depiladora" a "Depilación" 
UPDATE "User" SET especialidad = 'Depilación' WHERE especialidad = 
'Depiladora'; -- Actualizar servicios con especialidad "Peluquero" a "Peluquería" 
UPDATE "Servicio" SET especialidad = 'Peluquería' WHERE especialidad = 
'Peluquero'; -- Actualizar servicios con especialidad "Masajista" a "Masajes" 
UPDATE "Servicio" SET especialidad = 'Masajes' WHERE especialidad = 
'Masajista'; -- Actualizar servicios con especialidad "Depiladora" a "Depilación" 
UPDATE "Servicio" SET especialidad = 'Depilación' WHERE especialidad = 
'Depiladora';