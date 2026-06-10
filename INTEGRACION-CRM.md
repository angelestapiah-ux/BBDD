# Integración de formularios web → Renovapp CRM

Toda web de Renova con formulario de contacto/inscripción debe enviar los leads
al CRM. El endpoint crea el cliente automáticamente (etapa "nuevo", canal de
origen de la web) y lo deja agendado en la vista "Hoy". Si el teléfono o correo
ya existe, **no duplica**: registra un seguimiento con el nuevo interés.

## Endpoint

```
POST https://renovapp-crm.vercel.app/api/leads
Content-Type: application/json
```

| Campo       | Requerido | Descripción                                          |
|-------------|-----------|------------------------------------------------------|
| `nombre`    | ✅        | Nombre del lead                                      |
| `telefono`  | ✅*       | Teléfono (cualquier formato)                         |
| `correo`    | ✅*       | Correo                                               |
| `origen`    | ✅        | Identificador de la web, ej: `"tu-pnl-renovada"`     |
| `actividad` | opcional  | Programa/taller de interés, ej: `"Ciclo Renova Mujer"` |
| `mensaje`   | opcional  | Mensaje libre del formulario                         |
| `website`   | honeypot  | Campo OCULTO en el form. Si un bot lo llena, se descarta |

\* Se exige al menos uno de los dos (teléfono o correo).

## Snippet listo para pegar (JS vanilla o React)

```js
// Enviar lead al CRM (no bloquea el flujo de la web si falla)
async function enviarLeadAlCRM({ nombre, telefono, correo, mensaje, actividad }) {
  try {
    await fetch('https://renovapp-crm.vercel.app/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        telefono,
        correo,
        mensaje,
        actividad,
        origen: 'NOMBRE-DE-ESTA-WEB',          // ej: 'tu-pnl-renovada'
        website: document.querySelector('#website')?.value || '', // honeypot
      }),
    })
  } catch {
    // Silencioso: el lead no debe romper la experiencia del visitante
  }
}
```

Honeypot en el HTML del formulario (invisible para humanos):

```html
<input type="text" id="website" name="website" tabindex="-1" autocomplete="off"
       style="position:absolute;left:-9999px;opacity:0" aria-hidden="true" />
```

## Reglas de integración

1. **Llamar a `enviarLeadAlCRM` en el submit del formulario**, ANTES de la acción
   actual (abrir WhatsApp, mostrar mensaje de gracias, etc.). No esperar la
   respuesta para continuar (fire-and-forget con `catch` silencioso).
2. **Si la web solo tiene botones de WhatsApp** (sin formulario), agregar un
   mini-formulario previo (nombre + teléfono) o llamar al endpoint con los datos
   que se tengan antes de redirigir a WhatsApp.
3. `origen` = nombre del proyecto/dominio (sin https). Así el CRM muestra el
   canal correcto en "Procedencia".
4. Si la web corre en un dominio nuevo, **agregarlo a `ORIGENES_PERMITIDOS`** en
   `renova-crm/app/api/leads/route.ts` (CORS).

## Webs conectadas

| Web | origen | Estado |
|-----|--------|--------|
| tu-pnl-renovada.vercel.app | `tu-pnl-renovada` | ✅ |
| renova-empresas.vercel.app | `renova-empresas` | ✅ |
| ciclo-renova-mujer-2026.vercel.app | `ciclo-renova-mujer-2026` | ✅ |
| libera-el-dolor.vercel.app | `libera-el-dolor` | ✅ |
| workshop-inmobiliario-2026.vercel.app | `workshop-inmobiliario-2026` | ✅ |
| academia-renova.netlify.app | `academia-renova` | ⏳ (desarrollo externo) |
