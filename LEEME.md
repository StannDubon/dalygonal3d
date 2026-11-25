# Dalygonal : 3D Prints: catálogo 3D con panel de administración

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página que ven tus clientes: catálogo, visor 3D y botones de WhatsApp |
| `admin.html` | Tu panel privado para subir STL, nombre, precio y orientación. No aparece enlazado en ningún lado |
| `visor.js` | El visor 3D que usan las dos páginas |
| `catalogo.json` | La lista de modelos. El panel la actualiza solo, no hace falta tocarla |
| `modelos/` | Los STL y sus miniaturas. Los dos que vienen son de ejemplo y los puedes borrar desde el panel |

## Cómo funciona

```
Tú (admin.html) ──token──▶ GitHub (guarda STL + catalogo.json) ──▶ Netlify ──▶ Clientes (index.html)
```

No necesitas servidor ni base de datos, y todo es gratis. Cada vez que subes un modelo, el panel hace un commit en tu repositorio y la página pública se actualiza sola en 1 o 2 minutos.

## Configuración (se hace una sola vez, unos 15 minutos)

### 1. Crear el repositorio en GitHub
1. Entra a github.com y crea un repositorio **público** llamado `dalygonal3d`.
2. Toca **Add file → Upload files** y arrastra **todo el contenido** de esta carpeta, incluida la carpeta `modelos`. Confirma con **Commit changes**.

### 2. Publicar la página con Netlify (gratis)
1. Entra a app.netlify.com, crea una cuenta con tu GitHub y toca **Add new site → Import an existing project → GitHub**.
2. Elige el repositorio `dalygonal3d`.
3. Deja vacío el *build command* y pon `.` en el *publish directory*. Toca **Deploy**.
4. En **Site configuration → Change site name** ponle `dalygonal3d`. Tu página quedará en `https://dalygonal3d.netlify.app`. Más adelante puedes conectar un dominio propio.

> No uses Cloudflare Pages: no acepta archivos de más de 25 MB y tus STL grandes no se verían. Tampoco GitHub Pages: sus reglas no permiten sitios de venta.

### 3. Crear tu llave de administrador (token)
1. En GitHub ve a **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. En **Repository access** elige **Only select repositories** y selecciona `dalygonal3d`.
3. En **Permissions → Repository permissions**, pon **Contents** en **Read and write**.
4. Ponle una fecha de expiración (por ejemplo, 1 año), genéralo y cópialo.

### 4. Entrar al panel
Abre `https://dalygonal3d.netlify.app/admin.html` y escribe tu usuario de GitHub, `dalygonal3d`, `main` y el token. El navegador recuerda la sesión. Usa **Cerrar sesión** si entras desde una computadora que no es tuya.

## Modelo de portada (pantalla principal)
En el panel, la sección **Modelo de portada** te deja subir un STL que gira en grande sobre el fondo animado, con una entrada animada al abrir la página. El que viene es un nudo de ejemplo.

**Para poner el David de Miguel Ángel:**
1. Descarga el STL gratis de *Scan the World* (MyMiniFactory). Busca "Head of Michelangelo's David" (el busto) o "Michelangelo's David" (la estatua completa).
2. Usa el **busto**: pesa mucho menos y se ve mejor de cerca. La estatua completa pesa unos 57 MB, demasiado para un celular. Si quieres la estatua completa, simplifícala primero (Blender → Decimate a ~10 MB).
3. Súbelo en **Modelo de portada**, enderézalo con los controles deslizantes y pon en Crédito: `Scan the World @ MyMiniFactory · CC BY-SA 4.0`. El crédito es obligatorio por la licencia.
4. Usa el color blanco mármol (`#f3eee8`): con el sombreado de polígonos se ve como una escultura "Dalygonal".

## Seguridad
- Los clientes no ven el panel: no está enlazado y le pedimos a Google que no lo indexe.
- Aunque alguien encontrara la dirección, **sin tu token no puede cambiar nada**. El token solo da permiso sobre este repositorio.
- Si crees que alguien vio tu token, bórralo en GitHub y crea otro.
- Para mayor discreción, puedes renombrar `admin.html` a algo como `taller-7x2k.html`.
- Ten en cuenta que, como el repositorio es público, cualquiera con el enlace puede descargar tus STL. Sube solo modelos que estés dispuesto a mostrar. Si quieres protegerlos, usa un repositorio privado: Netlify lo publica igual. En ese caso, las miniaturas no se verán en el panel y, para cambiar la orientación de un modelo ya publicado, tendrás que volver a subir su STL. La página de clientes funcionará normalmente.

## Tamaño de los STL
- No hay límite propio en el panel. Al publicar, cada STL se **comprime automáticamente** (suele quedar a la mitad o menos) y la página de clientes lo descomprime sola.
- El único tope que queda es de GitHub: **100 MB por archivo ya comprimido**. Un STL de 150 a 200 MB normalmente cabe. Si alguno no cabe, el panel te avisa.
- Ten en cuenta que, aunque se pueda subir, un modelo de más de 50 MB tarda bastante en abrir en un celular con datos móviles. Para el catálogo conviene una versión simplificada (decimate en Blender o Meshmixer). La pieza se ve igual en pantalla.
- Las miniaturas se generan solas, con la orientación que elijas en los controles deslizantes.
- Para cambiar el nombre de la marca o los números de WhatsApp, usa la sección **Negocio** del panel.
