# Arquitectura Frontend - Web

## Diagrama de Componentes

```mermaid
graph TD
    A[App] --> B[Providers - Auth, Theme]
    B --> C[Layouts]
    C --> D[Pages]
    D --> E[Components - Atomic Design]
    E --> F[Common UI - index.css]
```

## Estructura de Carpetas

- `/src/components`: UI modular y reutilizable.
- `/src/hooks`: Lógica de estado y side-effects.
- `/src/services`: Consultas a la API.
- `/src/styles`: Tokens de diseño y `index.css`.

## Estándares de Diseño

- Uso de variables CSS para consistencia.
- Mobile-first responsivity.
- No `any` permitido.
