# TimePlan

TimePlan es una aplicación web adaptable para organizar tareas, calendario y sesiones de concentración.

## Funciones

- Panel diario con resumen de tareas y progreso.
- Crear, editar, completar, buscar y filtrar tareas.
- Asignar categoría, fecha y hora a cada tarea.
- Calendario mensual con tareas por día.
- Temporizador de enfoque con sesiones de 15, 25, 45 o 60 minutos.
- Estadísticas de tareas y tiempo de concentración.
- Guardado automático de tareas y sesiones en el navegador.
- Diseño adaptable a teléfonos, iPad/tablets y computadores.
- Instalable como aplicación web (PWA) y con caché básica para volver a abrirla sin conexión después de la primera visita.

## Ejecutar localmente

1. Instala Node.js (versión LTS).
2. Clona este repositorio.
3. Ejecuta `npm install`.
4. Ejecuta `npm run dev` y abre la dirección local que muestra Vite.

## Compilar para producción

```bash
npm install
npm run build
npm run preview
```

Vite genera la versión de producción en `dist/`.

## Publicar en Vercel

Importa este repositorio en Vercel y usa:
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Instalar en dispositivos

- **Android / Chrome:** abre la web y usa «Instalar aplicación» o «Añadir a pantalla de inicio».
- **iPhone / iPad:** abre la web en Safari, toca Compartir y elige «Añadir a pantalla de inicio».
- **Computador:** usa la opción de instalar de Chrome o Edge cuando aparezca.

## Importante sobre los datos

Por ahora, las tareas y sesiones se guardan localmente en el navegador de cada dispositivo. Puedes usar TimePlan en teléfono, iPad y computador, pero los datos no se sincronizan entre ellos ni existe inicio de sesión todavía. Para sincronización entre dispositivos se necesita añadir una base de datos y cuentas de usuario.
