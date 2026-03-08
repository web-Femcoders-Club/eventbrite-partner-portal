# 🔐 Seguridad y Gestión de Accesos: Portal de Partners FemCoders Club

Esta documentación describe el funcionamiento del sistema de seguridad, el modelo de datos agnóstico y la hoja de ruta para la automatización total del portal.

---

## 🛡️ 1. Privacidad de Datos y DNI (RGPD-Ready)

Hemos implementado un sistema de **doble capa de seguridad** para proteger la información sensible de los asistentes:

*   **Capa Visual (Frontend)**: En el listado de la tabla que se muestra en el navegador, el DNI siempre aparece **enmascarado** (ejemplo: `123***89`). De esta forma, si la pantalla se muestra a terceros durante el evento, nadie puede capturar la información completa.
*   **Capa de Operaciones (Descargas)**: Al realizar una descarga en formato **PDF, Excel o CSV**, el sistema envía el dato íntegro y sin cifrar. Esto asegura que el personal de control de accesos disponga de la información exacta para verificar identidades.

---

## 🌍 2. Arquitectura Multi-Empresa y Multi-Evento

El portal está diseñado como un motor agnóstico. No está "vinculado" a una sola empresa ni evento, sino que funciona mediante un sistema dinámico de permisos:

*   **Identificación por API Key**: Cada socio (Partner) tiene una clave única de acceso. Al introducirla en la pantalla de entrada, el sistema identifica quién es (InfoJobs, Google, etc.).
*   **Gestión por Fechas**: Cada permiso tiene una `startDate` (fecha de inicio) y una `endDate` (fecha de fin).
    *   **Revocación Automática**: El acceso se corta al minuto siguiente de la fecha de fin (ej: el 27 de marzo). El usuario recibirá un mensaje avisando de que su periodo ha finalizado y no verá ningún dato.
*   **Pase VIP de FemCoders Club**: Las administradoras del club tienen acceso persistente y sin fecha de caducidad, permitiendo la gestión histórica y futura de todos los eventos.

---

## 📲 3. ¿Cómo se conectan los usuarios?

Para que tus compañeras o partners externos se conecten, el flujo será el siguiente:

1.  **URL Pública**: El portal vivirá en una dirección web tipo `https://portal-partners.femcodersclub.com`. En cuanto lo subamos a Vercel, esta será la dirección definitiva.
2.  **Pantalla de Acceso**: Al entrar, encontrarán una interfaz profesional que les pedirá su "Código de Socio". No necesitan usuario ni contraseña complejos, solo su código corporativo.
3.  **Sesión Persistente**: Usamos `localStorage` para que una vez que introduzcan el código, no tengan que volver a hacerlo cada vez que cierren el navegador (a menos que cierren sesión manualmente por seguridad).

---

## 🔮 4. Hoja de Ruta de Automatización (Siguientes Pasos)

Para el futuro, el objetivo es que el portal sea 100% automático y "llave en mano":

1.  **Sincronización por Título de Evento**: Actualizar automáticamente el título y logotipos del portal según el evento activo de Eventbrite, eliminando cualquier rastro de configuración en el código.
2.  **Módulo de Creación de Accesos**: Como administradora (Irina), tendrás un panel donde simplemente escribirás el nombre del nuevo partner, seleccionarás el evento de una lista y pondrás las fechas. El sistema generará el PDF de bienvenida con el código de acceso automáticamente.
3.  **Branding Dinámico**: Si entra una empresa X, los colores y logos del portal pueden cambiar automáticamente a los de esa empresa para una experiencia personalizada.
4.  **Panel Admin Eventos**: Un selector de eventos para que FemCoders pueda saltar entre el evento actual, el del mes pasado o el de la semana que viene con un solo clic.

---

*Documento actualizado el 08 de Marzo de 2026 por Antigravity*
