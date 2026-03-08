# Guía de Comandos del Proyecto (Eventbrite Partner Portal)

Este documento centraliza los comandos necesarios para operar el proyecto. Se irá actualizando conforme el desarrollo avance.

## 🚀 Inicio Rápido

Ejecuta estos comandos desde la **raíz del proyecto** (`eventbrite-partner-portal`):

### 1. Instalación de Dependencias
```bash
npm install
```

### 2. Ejecución Completa (Frontend + Backend)
Este comando arranca ambos servicios de forma simultánea.
```bash
npm run dev
```

---

## 🛠️ Comandos Individuales

Si necesitas trabajar solo en una parte del monorepo, puedes usar:

### Frontend (React/Vite)
*   **Comando:** `npm run dev:web`
*   **Local UI:** [http://localhost:5173](http://localhost:5173)

### Backend (Express API)
*   **Comando:** `npm run dev:api`
*   **Local API:** [http://localhost:3001](http://localhost:3001)

---

## 🏗️ Construcción (Build)

Para generar los paquetes de producción:
```bash
npm run build
```

---

## 📝 Notas de Configuración
*   **Variables de Entorno:** El Backend utiliza el archivo `api/.env` para conectar con la base de datos MySQL en Railway.
*   **Aesthetics:** Recordar que el diseño debe seguir la identidad de **FemCoders Club** (Magenta, Orange, Yellow, Dark Blue).
