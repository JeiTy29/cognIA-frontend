# Vista: Ayuda

## Propósito

Concentrar el soporte al usuario en un solo lugar: respuestas rápidas (FAQ), contacto directo, reporte de problemas y acceso a contenido legal.

## Estructura de UI

- Encabezado superior con título **“Ayuda”** y subtítulo: “Encuentra respuestas rápidas o contáctanos si necesitas ayuda.”
- Layout en **2 columnas** (desktop) y **1 columna** (mobile).
- Dos paneles principales (cards):
  - Panel izquierdo: búsqueda + FAQ (acordeón).
  - Panel derecho: contacto + reporte de problema + legal.

## Centro de ayuda (FAQ + búsqueda)

- Campo **“Buscar en ayuda…”** filtra por pregunta y respuesta.
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
- **Correo**: botón abre cliente de correo mediante `mailto`.
  - Formato: `mailto:correo@dominio.com?subject=Soporte%20CognIA&body=...`

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
