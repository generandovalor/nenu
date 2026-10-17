# Publicar sin interrumpir la web actual

## 1. GitHub

Subir todo el contenido de esta carpeta a la raíz de un repositorio, preferiblemente privado. Incluir los archivos que empiezan por punto. No subir .env, node_modules, claves ni tablas de usuarios.

Con terminal, dentro de esta carpeta:

```sh
git init -b main
git add .
git commit -m "Prepara Nenu para Netlify"
```

Crear el repositorio en GitHub y seguir sus instrucciones para conectar el remoto y hacer push.

## 2. Netlify

Importar el repositorio desde GitHub. Base directory: raíz. La configuración se toma de netlify.toml.

Crear **NENU_GAS_URL** con la URL completa de .env.example, terminada en /exec. Habilitarla para **Functions** y el contexto del despliegue. .env.example es documentación y no configura esa variable automáticamente.

Netlify registra la función catalogo y su ruta /api/catalogo. No se necesitan credenciales de Google en Netlify ni crear otro Apps Script. Solo dist se publica; backend/Code.gs queda fuera del sitio público.

## 3. Probar la URL temporal

- Entrar directamente y recargar en /, /catalogo/, /remesas/ y /mayoristas/.
- Abrir /api/catalogo?type=health: debe indicar ok:true y API 5.4.0. Con ?type=bootstrap debe devolver el catálogo público.
- En móvil y escritorio revisar tarjetas, navegación, buscador, filtros, carrito, modo claro/oscuro y persistencia.
- Comprobar el desplazamiento de detalles, imágenes, video al pulsar, FAQ, promociones y relacionados cuando el Sheet tenga datos vinculados.
- Revisar variantes, límites de stock, carrito mixto, remesas y mensajes WhatsApp. Solo SI debe habilitar cada destino directo.
- Probar acceso con un usuario real autorizado y cerrar sesión. Confirmar que los precios privados dejan de estar visibles. No colocar claves en URLs ni registros.
- Revisar logo, iconos, mapa al pulsar, sitemap, robots y una ruta inexistente que responda 404.
- Repetir PageSpeed y probar desde la conexión venezolana afectada. El nuevo hosting requiere comprobarse en esa red; la migración por sí sola no confirma la causa del bloqueo anterior.

Si falla la API, comprobar la variable y los registros de Functions. BACKEND_NOT_CONFIGURED indica configuración; BACKEND_TIMEOUT, demora; BACKEND_UNAVAILABLE, fallo al consultar el servicio.

## 4. Dominio

Mantener la web actual hasta validar la temporal. Después agregar contenidodigitalnenu.com como dominio personalizado principal en Netlify y usar los registros exactos que Netlify indique para ese proyecto.

Si la zona DNS ya está en Netlify, conservar los TXT de verificación y los registros de correo, panel y otros servicios. Evitar que dos proyectos reclamen el mismo dominio; desvincularlo del hosting anterior al ejecutar el cambio.

Esperar HTTPS y propagación, y repetir las pruebas con el dominio final. Los canonical y sitemap ya apuntan a https://contenidodigitalnenu.com y no deben cambiarse a la URL temporal.

Para recuperar catalogo.contenidodigitalnenu.com como redirección, primero asociarlo a un proyecto Netlify que lo atienda por HTTPS y configurar su DNS. Después se puede agregar esta regla al principio de netlify.toml:

```toml
[[redirects]]
  from = "https://catalogo.contenidodigitalnenu.com/*"
  to = "https://contenidodigitalnenu.com/catalogo/"
  status = 301
  force = true
```

La regla es opcional y no está activa en esta entrega. Requiere que el subdominio esté conectado; no basta conservar su registro apuntando a otro proyecto.

## 5. Actualizaciones

Los push a la rama de producción generarán nuevos despliegues. Conservar las pruebas y comprobar el resultado. Si aparece un problema, restaurar un despliegue anterior en Netlify y corregir el repositorio.

Referencias oficiales:
- https://docs.netlify.com/build/functions/get-started/
- https://docs.netlify.com/build/configure-builds/file-based-configuration/
