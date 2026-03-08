# Eventbrite Partner Portal

[![CI/CD Pipeline](https://github.com/femcodersclub/eventbrite-partner-portal/actions/workflows/ci.yml/badge.badge.svg)](https://github.com/femcodersclub/eventbrite-partner-portal/actions/workflows/ci.yml)

Este proyecto es un monorepo profesional desarrollado para **FemCoders Club**. Permite la gestión de inscripciones de eventos de Eventbrite de forma segura y transparente para partners como InfoJobs.

## 🚀 Tecnologías

- **Frontend**: React 19, Vite, Tailwind CSS 4, TypeScript.
- **Backend**: Node.js 22, Express, TypeScript.
- **Seguridad**: RGPD-First, enmascaramiento de datos, política de No-Cache para PII.

## 📁 Estructura

- `apps/web`: Aplicación React (Frontend).
- `apps/api`: Servidor Express (Backend/API).

## 🛠️ Desarrollo

Para ejecutar el proyecto en desarrollo:

```bash
# Instalar dependencias
npm install

# Ejecutar ambos (Frontend y Backend)
npm run dev

# Ejecutar por separado
npm run dev:web
npm run dev:api
```

## ⚖️ Cumplimiento Legal

- **RGPD**: Minimización de datos y transparencia.
- **AI Act**: Documentación y procesos claros.
