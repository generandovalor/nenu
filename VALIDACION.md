# Validación de la exportación

Fecha: 16 de octubre de 2026. Origen: Sites versión 11, commit b97b7755124183e9ebc52755daf3e800b4dd6099.

## Comprobado

- Los archivos públicos originales conservan sus hashes. En los cuatro HTML solo cambia GAS_URL al endpoint local /api/catalogo. La nueva página 404 se añade por separado.
- Compilación de estilos correcta: 77.042 bytes, sin cambiar el resultado respecto a Sites. Paridad de selectores incluida la separación antes de :is().
- Ocho pruebas automáticas portables: consultas y ruta de la función, login simulado, métodos y datos inválidos, configuración de URL, fallos del backend, timeout, conservación de archivos y cuatro rutas con recursos SEO.
- Siete suites de regresión adicionales con DOM simulado, ejecutadas sobre esta exportación: catálogo físico, variantes, contactos/detalle/promociones, temas, SEO, carga diferida de medios y contraste.
- Aislamiento público/mayorista, cierre de sesión, límites de carrito, selección de variantes, mensajes WhatsApp, reglas SI/NO/vacío y detalle desplazable comprobados con datos de prueba.
- Colores de texto de tarjetas, controles, formularios y footer comprobados con contraste mínimo de 4,5:1 en las cuatro rutas, y nombres legibles en oscuro.
- Consulta real mediante el handler de la función al Apps Script existente: health HTTP 200, API 5.4.0; bootstrap HTTP 200, 53 servicios y 7 productos físicos activos.

Las ocho pruebas portables están en tests/ y se ejecutan con npm test. Las siete suites adicionales usan el entorno de QA de la preparación; no son dependencias de despliegue ni exponen tablas privadas.

## Pendiente de comprobar al desplegar

No se ha desplegado esta copia en Netlify, cambiado DNS, medido un nuevo PageSpeed ni realizado revisión visual en un navegador real. Las pruebas de DOM y contraste no sustituyen la revisión de móvil/escritorio. El login real debe verificarse con una cuenta autorizada: las pruebas de credenciales usaron un usuario simulado.

El estado del navegador no se migra entre orígenes: las preferencias/carrito guardados en la URL temporal no pasan automáticamente al dominio final. En el mismo dominio principal se conservan las claves de almacenamiento existentes.

## Pendientes que ya tenía el MVP

- Los enlaces de privacidad, términos y transparencia todavía necesitan páginas con textos aprobados; no se han inventado políticas.
- Los productos físicos conservan datos de demostración y precios/stock simulados donde así estaban cargados. Revisarlos antes de vender.
- Todavía no hay URL individual indexable por producto ni reserva/descuento automático de inventario.
- El valor del transporte y las entregas internacionales siguen confirmándose por WhatsApp.
- Imágenes, videos, mapas, WhatsApp y Apps Script mantienen sus dependencias externas.
- El catálogo inicial conserva la instantánea pública de la versión actual y se refresca al consultar el backend.

Nada de esta exportación modifica el Sheet, los usuarios, la implementación Apps Script ni la web que está publicada.
