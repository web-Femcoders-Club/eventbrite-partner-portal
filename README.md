# Eventbrite Partner Portal

[![CI/CD Pipeline](https://github.com/web-Femcoders-Club/eventbrite-partner-portal/actions/workflows/ci.yml/badge.svg)](https://github.com/web-Femcoders-Club/eventbrite-partner-portal/actions/workflows/ci.yml)

Este proyecto es un monorepo profesional desarrollado para **FemCoders Club**. Permite la gestión de inscripciones de eventos de Eventbrite de forma segura y transparente para partners como InfoJobs.

## 🚀 Tecnologías

- **Frontend**: React 19, Vite, Tailwind CSS 4, TypeScript.
- **Backend**: Node.js 22, Express, TypeScript.
- **Seguridad**: RGPD-First, enmascaramiento de datos, política de No-Cache para PII.

## 📁 Estructura

- `web/`: Aplicación React (Frontend).
- `api/`: Servidor Express (Backend/API).

## 🚀 Despliegue (Railway)

Este proyecto está configurado para un **despliegue unificado** en Railway:

1. Conecta el repositorio a un nuevo servicio en Railway.
2. Añade un servicio de MySQL.
3. Configura la variable `MYSQL_URL` referenciando a la base de datos.
4. Ejecuta el seed para activar los códigos de acceso: `railway run npm run seed -w api`.

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

## ⚙️ Sincronización (Cron Jobs)

Los registros de Eventbrite se sincronizan automáticamente con la base de datos en los siguientes horarios (Hora España):

| Hora | Expresión Cron |
| :--- | :--- |
| **08:00** | `0 8 * * *` |
| **12:30** | `30 12 * * *` |
| **17:30** | `30 17 * * *` |
| **20:00** | `0 20 * * *` |

## ⚖️ Cumplimiento Legal

- **RGPD**: Minimización de datos y transparencia.
- **AI Act**: Documentación y procesos claros.
