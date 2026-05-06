-- Script de inicialización para ObraFirmada
-- Crear base de datos y aplicar migraciones iniciales

CREATE DATABASE IF NOT EXISTS obrafirmada_dev;
CREATE DATABASE IF NOT EXISTS obrafirmada_shadow;

USE obrafirmada_dev;

-- Habilitar validación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;
