# Estándares del Proyecto: Eventbrite Partner Portal

Este documento define las reglas de oro que todos los agentes y desarrolladores deben seguir en este repositorio.

## 📋 Reglas Generales

- **Idioma**: El código (variables, funciones, clases) siempre en **inglés**. Los comentarios y la documentación explicatoria siempre en **español**.
- **Commits**: Seguir el estándar de **Conventional Commits** (ej: `feat:`, `fix:`, `docs:`, `refactor:`).
- **Proactividad**: El asistente no asume. Si algo es ambiguo, pregunta. Si ve una mejora, la sugiere.
- **Seguridad**: NUNCA se suben datos sensibles. Los archivos `.env` deben estar siempre en `.gitignore`.
- **Surgical Precision & Code Preservation**: El agente debe ser quirúrgico. NO se permite refactorizar código existente o borrar bloques de código sin previo aviso. Si se propone una mejora, el agente debe presentar un **plan detallado** primero ("ajustamos esto", "eliminamos esto", etc.) y esperar aprobación antes de ejecutar. Las ediciones directas deben limitarse a la tarea actual preservando la estructura previa.
- **Calidad de Código**:
  - Clean Code y Principios SOLID.
  - Cero código espagueti.
  - Arquitectura limpia y modular.
- **RGPD & Compliance**: DNI masking en UI, full data solo en exportaciones seguras.
- **Senior Proactivity**: El agente no solo cumple tareas, sino que audita la arquitectura y propone mejoras de infraestructura (Vercel/Railway), seguridad (Helmet/CORS) y rendimiento (GZIP/Caching) de forma proactiva.
- **API Error Handling**: Implementar un middleware global para que todas las respuestas de error sean consistentes y cumplan con la privacidad (RGPD friendly).
- **Sincronización de Datos**: El sistema actualiza los registros 4 veces al día (08:00, 12:30, 17:30, 20:00) para garantizar la frescura de los datos.

## 🛠️ Tecnologías del Proyecto

## 🎨 Frontend (`/web`)

- **TypeScript estricto**: Prohibido el uso de `any`. Definir interfaces y tipos para todo.
- **Estética Premium**: Diseños modernos, fluidos y de alto impacto visual.
- **Responsive**: Mobile-first siempre (Desktop, Tablet, Mobile).
- **Accesibilidad (WCAG)**: Cumplimiento AA y AAA siempre que sea posible.
- **CSS**: Uso de `index.css` para tokens de diseño y utilidades globales. Evitar repetición de estilos.
- **Semántica**: Uso estricto de etiquetas HTML5 semánticas.

## ⚙️ Backend (`/api`)

- **Arquitectura**: Separación clara de capas (Controllers, Services, Models/Entities).
- **Cumplimiento Legal**:
  - **RGPD/LOPD**: Privacidad por diseño.
  - **AI Act**: Cumplimiento de normativas de IA si se implementan modelos.
- **Validación**: Validación estricta de entradas.

## 📄 Documentación Obligatoria

Cada carpeta (`/api`, `/web`) y la raíz deben mantener:

1. `README.md`: Guía de uso y configuración actualizada.
2. `architecture.md`: Diagramas UML y explicación de la arquitectura.
