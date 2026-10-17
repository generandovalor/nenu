# Historial previo a la exportación

Registro histórico; para el despliegue actual seguir README.md y MIGRACION.md. Las instrucciones de versiones anteriores ya no aplican.

Nenu: sitio estático basado en los adjuntos recibidos el 16 de octubre de 2026.

CSS compilado localmente; catálogo público inicial embebido; actualización desde Apps Script.
El backend 5.0 se entrega por separado y requiere instalar una nueva versión en la implementación existente.
No se incluyen claves ni la tabla panel_usuarios en los datos de arranque.

Productos físicos: API 5.2, propiedad productosFisicos. physical.js integra tarjetas, detalle, filtros y límites de carrito con el stock publicado. Productos físicos no suman apps para premios. Stock orientativo: enviar WhatsApp no descuenta ni reserva inventario. Pruebas funcionales con DOM simulado; API pública consultada sin credenciales. Sin prueba visual en navegador en este entorno.

## Physical variants (API 5.3)
The catalog groups rows by ID_Grupo and requires an explicit option selection for groups with multiple rows. Cart lines remain keyed by ID_Producto, with SKU and selected attributes in WhatsApp. Public supplier IDs are excluded. DROPSHIPPING availability uses Disponibilidad_Proveedor, not a fictitious Stock. Blank variant fields remain optional. The frontend remains compatible with API 5.2 until the owner installs Code-Nenu-5.3.gs and rebuilds the public cache on the existing Apps Script deployment.

Validation: existing four-route UI contract and simulated grouped variants, per-variant price/stock/cart/message, supplier availability, consultation, offline logout cleanup, and Apps Script projection. No visual browser QA available in this environment.

## WhatsApp routing and service detail (5.4)
Only explicit SI enables a direct destination, separately for each active phone contact and module. NO/blank always falls back to an untargeted wa.me share; no hard-coded order phone. Public and wholesale cart buttons use the corresponding module column. Generic share remains available.

Service detail now uses a flex footer and a min-height:0 scroll region with body lock. It renders available Crosselling references, numbered FAQ, safe media and linked Promociones. Promo price is informative pending confirmation; it does not overwrite base/coupon logic. The 5.4 Apps Script deliverable projects promotion fields without Costo_Real. Services without ID_Promo have no attached promotion.

QA: four routes, existing physical and variant suite, explicit SI/NO/blank destinations per contact/module, dynamic numbers, quote sharing, related-item adds, numbered FAQ, promo module gating/missing price, public cost exclusion, modal structure and body lock. Visual browser QA unavailable. Source workbook left unchanged; ID/name mismatches in Producto_Detalle need owner review.

## Appearance
Light is the first-visit default, independently of the OS theme. The header switch saves the explicit preference under nenu_theme_v1 and applies it before CSS renders on every entrypoint. Blocked localStorage falls back to a functional in-memory preference. The light palette covers home, digital and physical catalog, remittances, wholesale, cart, service/physical details and cross-selling. Existing dark styles remain available on user selection.

Validation: four route defaults, toggle/reload persistence, OS independence, storage denial, cross-tab updates, switch state and core text/background contrast; existing catalog and routing tests. Visual browser QA not available. No Apps Script change required.

## SEO foundation (2026-10-16)
All entrypoints provide unique title/description/canonical, Open Graph/Twitter metadata, and Organization/WebSite/WebPage JSON-LD (CollectionPage for the catalog). Initial visible sections and tab state match the requested URL before JS. Public catalog cards are prerendered from the same existing public bootstrap and hydrated by the unchanged catalog logic; no wholesale prices are embedded. Schema omits demo offers, fabricated reviews and unverified business addresses. The existing SPA navigation updates metadata consistently without changing cart/auth/remittances.

Only home, catalog and remittances are in the sitemap. The wholesale login uses noindex,follow and remains crawlable so that exclusion can be read. Lastmod reflects this actual release, not automatic daily refresh. Robots references the canonical sitemap.

Validation: static metadata and route parity, public prerender and hydration, schema parsing/privacy, sitemap XML, all route transitions and existing cart preservation, plus physical/catalog, routing/detail and theme suites. Visual browser QA and Google Search Console inspection are not available here. Policy links still need published policy pages; physical product SEO requires real catalog data and individual product URLs.

## Mobile performance and accessibility
YouTube and Google Maps use local click-to-load facades, with titled iframes only after interaction. Refreshing API data preserves an already-loaded player/map when its source is unchanged. Social icon links have explicit accessible names. Light-mode map CTA contrast and dark-mode muted text have explicit corrections. Page entrance animations are disabled to avoid delaying content paint.

One combined/minified stylesheet replaces four blocking stylesheet requests. A subset of the existing Font Awesome assets retains every icon referenced by HTML/JS; only local WOFF2 files with font-display:swap are requested. The initial theme script is inline, so it no longer adds a blocking script request. Non-catalog entrypoints no longer duplicate the hidden static catalog; /catalogo/ retains its public prerender and all routes still hydrate the same data.

Build after editing styles: node scripts/build-styles.mjs. Regenerate icon subsets if adding icons: python scripts/subset-icons.py (requires fontTools; Brotli uses Node built-ins). Stylesheet sources are kept to avoid losing future dynamic states.

Validation: four-route existing catalog/cart/WhatsApp/detail/SEO/theme suites and targeted facade/subset/stylesheet tests. Zero initial application iframe embeds in simulated DOM; explicit play/map loading and labels verified. The old mobile PageSpeed report is the baseline only; a new public PageSpeed/Lighthouse run is required to measure the resulting LCP and score. Hosting-controlled headers and provider scripts are not changed by these static-source optimizations.

## Light-theme contrast repair
The original custom CSS compactor removed descendant whitespace before :is(), changing 23 selectors and mixing dark surfaces with light-theme foregrounds. The compactor now preserves that whitespace. The rebuilt stylesheet was compared against every source selector, with exact normalized parity. A warmer stone/olive background and cream card surfaces reduce glare; product names, prices, metadata, controls, form fields and footer use explicit readable colors.

Validation: computed contrast >=4.5:1 for physical card text/actions, forms, footer and hero across all four routes; dark card names preserved; CSS selector parity and existing theme, SEO and click-to-load performance tests pass. Visual browser QA is still unavailable here.
