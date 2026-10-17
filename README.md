# Nenu · GitHub → Netlify

Exportación de la versión 11 de Sites, 16 de octubre de 2026. Conserva la apariencia, responsive y funciones actuales. Esta copia no se ha desplegado ni ha cambiado el dominio.

## Despliegue

1. Descomprimir el ZIP y subir el contenido de `nenu-netlify` a la raíz de un repositorio GitHub, preferiblemente privado. Incluir `.env.example`, `.gitignore` y `.nvmrc`.
2. En Netlify importar ese repositorio desde GitHub.
3. Agregar **NENU_GAS_URL** con el valor exacto de `.env.example`, disponible para **Functions**, tanto en Production como en los contextos de prueba que se usen.
4. Netlify lee `netlify.toml`: comando `npm test && npm run build`, publicación `dist`, funciones `netlify/functions`, Node 22. Base directory vacía si estos archivos están en la raíz.
5. Validar la URL temporal siguiendo `MIGRACION.md`. Después conectar `contenidodigitalnenu.com`.

No subir únicamente `dist` por arrastrar y soltar: también se necesita desplegar la función.

## Contenido

| Archivo o carpeta | Uso |
| --- | --- |
| dist/ | Inicio, catálogo, remesas, mayoristas, CSS, JS, iconos, logo, sitemap, robots y 404 |
| netlify/functions/catalogo.mjs | API del mismo origen: catálogo público y login contra el backend actual |
| backend/Code.gs | Referencia de Apps Script 5.4.0, fuera de la carpeta pública |
| scripts/ | Compilación de estilos y herramienta opcional de iconos |
| tests/ | Pruebas de función y conservación del sitio |
| SOURCE-MANIFEST.json | Hashes y procedencia de los archivos originales |
| MIGRACION.md | Instrucciones de publicación y dominio |
| VALIDACION.md | Comprobaciones y pendientes del MVP |

Conserva modo claro cálido y oscuro opcional, carrito, variantes, detalle, FAQ, promociones, venta cruzada, remesas, usuarios del Sheet, reglas de WhatsApp y SEO. Sin Google Analytics.

El único cambio en los cuatro HTML originales es `GAS_URL: "/api/catalogo"`. Los estilos, scripts y datos públicos iniciales son idénticos. La función consulta la misma URL de Apps Script desde el servidor; no duplica el Sheet ni cambia el acceso de usuarios.

## Desarrollo

Con Node 22:

```sh
npm ci
npm test
npm run build
```

No se necesitan dependencias de aplicación. Para probar rutas y funciones juntas, copiar `.env.example` a `.env` y ejecutar `npx netlify-cli dev` (descarga la CLI). Abrir la dirección indicada por la CLI. Abrir HTML como archivo no ejecuta la API.

Editar las fuentes CSS de `dist` y ejecutar el build; no editar únicamente `styles.css`, que se regenera. La herramienta opcional de iconos requiere Python y fontTools, pero no es necesaria para desplegar.

El test de conservación compara con la versión exportada de Sites. Tras cambios intencionales posteriores revisar y actualizar esa referencia; no regenerarla automáticamente para ocultar diferencias.

## Backend y datos

Apps Script 5.4.0 sigue en la implementación existente: no hay que pegar ni reinstalar `backend/Code.gs` para migrar la web. Las claves y usuarios se comprueban en el mismo Sheet. No se exportan filas privadas de usuarios ni precios mayoristas.

La función admite consultas públicas conocidas y POST de login. No registra contraseñas ni reenvía cookies y marca todas las respuestas como `no-store`. Espera al backend hasta 12 segundos, dentro de los 15 segundos que ya usa el cliente. El catálogo público inicial sigue embebido para mostrarse de inmediato.

Las imágenes y los datos externos conservan sus servicios actuales; no es una tienda completamente sin conexión. Abrir WhatsApp no reserva ni descuenta inventario.

El historial anterior queda en `docs/HISTORIAL-SITES.md` como referencia, con instrucciones de versiones anteriores que ya no aplican.
