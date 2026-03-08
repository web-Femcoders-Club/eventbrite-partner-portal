# Preparacion

Irina, la idea tiene todo el sentido: un “panel compartible por evento” para que InfoJobs vea inscripciones en tiempo real sin que tú tengas que estar mandando capturas cada 10 minutos.

Lo haría **simple, seguro y “RGPD-first”** desde el minuto 1, porque aquí hay un punto delicado: **DNI \= dato identificativo muy sensible a nivel de riesgo** (no es “categoría especial” tipo salud, pero sí **alto impacto** si se filtra). Eso obliga a ser muy estrictas con minimización, accesos y trazabilidad. (Principios de minimización y limitación de finalidad del RGPD). ([European Data Protection Supervisor](https://www.edps.europa.eu/data-protection/data-protection/glossary/d_en?utm_source=chatgpt.com))

## **Qué construiría (MVP que te sirve ya)**

### **1\) Dashboard por evento (dos roles)**

* **Rol “Admin” (FemCoders Club)**: ve todo.  
* **Rol “Partner” (InfoJobs)**: ve solo *ese evento* (y solo lo que le autorizas: nombre, apellido, dni).

### **2\) Datos en tiempo real desde Eventbrite**

Para “tiempo real” lo correcto es usar **webhooks**, no polling continuo:

* Eventbrite soporta webhooks para objetos como **Order / Attendee / Event**, útiles para enterarte al instante cuando entra o se actualiza una inscripción. ([Eventbrite](https://www.eventbrite.com/platform/docs/webhooks?utm_source=chatgpt.com))  
  Tu backend recibe el webhook → actualiza BD → la UI refresca (o vía websockets/SSE si quieres “live” de verdad, pero no es imprescindible para el MVP).

### **3\) Acceso temporal “por evento”**

Aquí te digo lo directo:

* **Mejor que usuario/contraseña**: **link firmado de un solo uso** o **token de acceso con expiración** (hasta que acabe el evento).  
  * Ventajas: no hay credenciales reutilizables, puedes revocar en 1 clic, y queda trazado.

## **El gran tema: DNI y RGPD (cómo lo haría sin pegarte un tiro en el pie)**

Antes de decidir “mostrar DNI”, yo aplicaría esto:

### **A) Minimización real (lo mínimo necesario)**

###  **InfoJobs necesita ver el DNI de TODAS**

* Y si de verdad necesitan el DNI completo: habilitas **descarga puntual** (CSV/PDF/excel) con:  
  * expiración del enlace  
  * watermark (“uso interno InfoJobs”)  
  * registro de quién lo descargó y cuándo (audit log)

Esto aplica directamente el principio de **data minimisation**. ([European Data Protection Supervisor](https://www.edps.europa.eu/data-protection/data-protection/glossary/d_en?utm_source=chatgpt.com))

Como vas con InfoJobs y datos reales, mi recomendación por defecto es:

* **en pantalla: enmascarado**

* **DNI completo: solo export con log**

### **B) Retención corta**

* “Partner” solo accede **hasta que se acaba el evento** luego se revoca.  
* Los DNIs (si los guardas) se purgan o se quedan solo en tu lado con cifrado y política clara.

### **C) Seguridad obligatoria (mínimos no negociables)**

* Hash de passwords (Argon2/bcrypt), JWT \+ refresh, rate limiting.  
* **Cifrado en reposo** (en BD) para DNI, o al menos a nivel de campo (app-level encryption).  
* Logs de acceso y de exportaciones (accountability).

## **Stack recomendado (sin complicarte y profesional)**

Para un mini-proyecto sólido:

**Backend**

* Node.js \+ Express \+ TypeScript  
* PostgreSQL  
* Prisma (rápido de iterar, migrations fáciles)  
* Webhooks receiver \+ job queue ligera (BullMQ o un cron interno) si necesitas reintentos

**Frontend**

* React (el que ya controlas) \+ una UI simple: listado, contador, filtros, export.

**Hosting**

* Railway te encaja bien y puedes desplegar en **región EU West (Ámsterdam)** para residencia de datos en la UE. ([Railway Docs](https://docs.railway.com/deployments/regions?utm_source=chatgpt.com))  
* Y si vais en serio con RGPD/proveedores: Railway tiene **DPA** (útil para Art. 28 cuando el proveedor actúa como encargado). ([Railway](https://railway.com/legal/dpa?utm_source=chatgpt.com)

## **Diseño técnico en 6 piezas (clarito)**

1. **Eventbrite connector**  
   * Guardas token OAuth/privado server-side (env vars). ([Eventbrite](https://www.eventbrite.com/platform/api?utm_source=chatgpt.com))  
2. **Webhook endpoint**  
   * Validas firma/secret del webhook (y reintentas si falla). ([Eventbrite](https://www.eventbrite.com/platform/docs/webhooks?utm_source=chatgpt.com))  
3. **DB**  
   * tables: events, attendees, orders, access\_grants, audit\_logs  
4. **Auth**  
   * roles \+ scoping por event\_id  
5. **UI**  
   * vista “Admin” \+ vista “Partner”  
6. **Auditoría**  
   * cada login, cada vista de DNI completo, cada export \= log

## **Roadmap de entrega (para que lo saques rápido)**

**Día 1–2 (MVP funcional)**

* Ingesta de eventos \+ attendees desde Eventbrite (pull inicial)  
* Dashboard con contador \+ listado básico  
* Partner access por evento con expiración

**Día 3–4 (tiempo real \+ seguridad)**

* Webhooks Eventbrite (order/attendee updates)  
* Audit logs \+ rate limiting  
* DNI enmascarado (y export opcional)

**Día 5 (acabado “pro”)**

* Filtros, búsqueda, paginación  
* Revocación de accesos en 1 clic  
* Pantalla de “política de uso” para Partner (clickwrap simple)

# Muy importante

Nombre: eventbrite-partner-portal  
Tecnologías: React v19, Node v22, Typescript, Tailwind CSS v4  
Librerías: express/cors/dotenv

**1\) Acceso “partner” por evento (token \+ caducidad \+ revocación)**

En vez de usuarios/contraseñas por empresa, haz **un “access grant” por evento**:

* Generas un token (random, largo, no adivinable)

* Lo guardas en BD con:

  * `event_id`

  * `partner_name` (InfoJobs / “Empresa X”)

  * `expires_at` (ej. fin de evento o fin de campaña)

  * `revoked_at` (null / fecha)

* Les pasas un link tipo:  
   `https://tuportal.com/p/<token>`

✅ Si mañana no es InfoJobs y es otra empresa: mismo mecanismo.  
 ✅ Si quieres “cortar” acceso: marcas `revoked_at` y listo.

**2)Actualización (sync desde Eventbrite, pero con freno)**

Botón “Sincronizar ahora” solo para admin

* Partner siempre ve BD.

* Admin pulsa “Sync” cuando quiere.

* Cero automatismos.

**3\) Cache**

PostgreSQL \+ last\_synced\_at \+ throttle

Y paginación.  
**Importante:** pon un “candado” para evitar que 10 personas abran a la vez y dispare 10 syncs:

* lock en BD (advisory lock) o

* un flag `sync_in_progress` con expiración

Aunque el DNI vaya enmascarado, sigues sirviendo datos personales. Así que:

* Para todas las respuestas con listados: **no cache en navegador**:

  * `Cache-Control: no-store` (y si quieres compatibilidad extra: `Pragma: no-cache`)  
     OWASP lo recomienda explícitamente para evitar que datos sensibles se queden en el historial/cache del navegador. 

# Styles:

Styles:

:root {  
  /\* Colores principales \*/  
  \--color-primary: \#ea4f33;  
  \--color-secondary: \#4737bb;  
  \--color-accent: \#6c63ff;  
  \--color-text-dark: \#2a2170;  
  \--color-white: \#fdfdfd;  
   
  /\* Sombras \*/  
  \--shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.15);  
  \--shadow-medium: 0 8px 20px rgba(0, 0, 0, 0.15);  
  \--shadow-light: 0 5px 15px rgba(0, 0, 0, 0.1);  
  \--shadow-card: 0 4px 12px rgba(0, 0, 0, 0.1);  
   
  /\* Border radius \*/  
  \--radius-sm: 0.5rem;  
  \--radius-md: 0.8rem;  
  \--radius-lg: 1rem;  
  \--radius-xl: 1.5rem;  
   
  /\* Spacing \*/  
  \--spacing-xs: 0.5rem;  
  \--spacing-sm: 1rem;  
  \--spacing-md: 1.5rem;  
  \--spacing-lg: 2rem;  
  \--spacing-xl: 3rem;  
   
  /\* Transiciones \*/  
  \--transition-fast: 0.3s ease;  
  \--transition-smooth: 0.6s cubic-bezier(0.33, 0.0, 0.22, 1);  
   
  /\* Fuentes \*/  
  \--font-primary: "Roboto", sans-serif;  
  \--font-heading: "Asap Condensed", sans-serif;  
}  
