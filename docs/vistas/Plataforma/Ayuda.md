# Vista: Ayuda

## Propósito

Concentrar el soporte al usuario en un solo lugar: respuestas rápidas (FAQ), contacto directo, reporte de problemas y acceso a contenido legal.

## Estructura de UI

- Encabezado superior con título **“Ayuda”** y subtítulo: “Encuentra respuestas rápidas o contáctanos si necesitas ayuda.”
- FAQ en un panel ancho de lectura (una sola columna).
- Debajo, un bloque en **2 columnas** (desktop) y **1 columna** (mobile):
  - Izquierda: **Reportar un problema** (mayor ancho).
  - Derecha: **Contacto + Legal** (menor ancho).

## Centro de ayuda (FAQ)

- FAQ en acordeón (sin tarjetas por pregunta):
  - Clic en la pregunta despliega la respuesta con animación suave.
  - El texto se mantiene breve para lectura rápida.

### Preguntas por rol

**Padre/Tutor**
- Significado de la alerta.
- Cómo diligenciar el cuestionario.
- Dónde ver el historial.
- Datos almacenados y privacidad básica.

**Psicólogo**
- Interpretación detallada del resultado.
- Historial de múltiples evaluaciones.
- Solicitud de soporte adicional.
- Uso de sugerencias del sistema.

## Contacto directo

- **WhatsApp**: botón abre chat externo usando `wa.me`.
  - Formato: `https://wa.me/<NUMERO>?text=<MENSAJE>`
  - Mensaje base: “Hola, necesito ayuda con CognIA. Mi tipo de cuenta es: [Padre/Tutor o Psicólogo].”
- **Gmail**: abre un borrador web en `mail.google.com` con `to`, `su` y `body` codificados.
- **Outlook**: abre un borrador web en `outlook.live.com` con `to`, `subject` y `body` codificados.
- **Copiar correo**: copia `soporte@cognia.com` al portapapeles y muestra confirmación breve.

Contenido del borrador:
- Para: `soporte@cognia.com`
- Asunto: `Soporte CognIA`
- Cuerpo: “Hola, necesito ayuda con CognIA. Tipo de cuenta: {Padre/Tutor | Psicólogo}. Módulo: {Ayuda/Cuestionario/Historial/Cuenta}. Descripción:”

Constantes configurables en la vista:
- `WHATSAPP_NUMBER`
- `SUPPORT_EMAIL`

## Reportar un problema

- Botón que despliega un formulario con animación tipo collapse.
- Campos:
  - Tipo de problema (select)
  - Descripción (textarea)
  - Adjuntar captura (input file)
- Acciones: **Cancelar** (cierra y resetea) y **Enviar**.
- Al enviar, se muestra un mensaje de éxito visible.

## Legal (modals existentes)

- Acciones:
  - **Política de privacidad**
  - **Términos de uso**
- Abren los modals reutilizados desde:
  - `components/Modal/Modal`
  - `TermsContent` y `PrivacyContent`

## Navegación

- Sidebar → **Ayuda**.
- Rutas:
  - Padre/Tutor: `/padre/ayuda`
  - Psicólogo: `/psicologo/ayuda`

## Archivos relacionados

- Vista compartida (ambos roles): `src/pages/Plataforma/AyudaBase.tsx`
- Estilos: `src/pages/Plataforma/Ayuda.css`
- Enrutado por rol:
  - `src/pages/Plataforma/SoportePadre/SoportePadre.tsx`
  - `src/pages/Plataforma/SoportePsicologo/SoportePsicologo.tsx`
