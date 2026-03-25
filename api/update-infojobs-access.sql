-- ============================================================
-- Script: Actualizar endDate de InfoJobs a 27 de Marzo de 2026
-- Ejecutar en Railway (MySQL) antes del 28 de Marzo de 2026
-- ============================================================

-- 1. Primero VERIFICAR cuál es el registro antes de modificar:
SELECT 
  pa.id,
  p.name,
  p.slug,
  pa.startDate,
  pa.endDate,
  pa.canDownloadFullData
FROM partner_access pa
JOIN partners p ON pa.partnerId = p.id
WHERE p.slug = 'infojobs' OR LOWER(p.name) LIKE '%infojobs%';

-- 2. Si el resultado anterior es correcto, ejecutar el UPDATE:
UPDATE partner_access pa
JOIN partners p ON pa.partnerId = p.id
SET pa.endDate = '2026-03-27 23:59:59'
WHERE p.slug = 'infojobs' OR LOWER(p.name) LIKE '%infojobs%';

-- 3. Confirmar el cambio:
SELECT 
  pa.id,
  p.name,
  p.slug,
  pa.startDate,
  pa.endDate
FROM partner_access pa
JOIN partners p ON pa.partnerId = p.id
WHERE p.slug = 'infojobs' OR LOWER(p.name) LIKE '%infojobs%';
