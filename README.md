# Trama de Aquí · bolsos de lona con diseños de Santander

Tienda web responsive para **Trama de Aquí** — *"Lleva tu tierra contigo"*. Vende bolsos de lona
de algodón estampados con diseños de los pueblos, paisajes, sabores, fe, cultura, fauna, aventura,
hinchada y artesanía de **Santander (Colombia)**.

Es un sitio **estático** (HTML, CSS y JavaScript, sin dependencias ni compilación): la página
principal **es la tienda** (búsqueda rápida + filtros + catálogo), con carrito, pago por
**Nequi + WhatsApp**, panel de control opcional (Supabase) y PWA instalable.

> Reutiliza la arquitectura de una tienda anterior, re-diseñada para la marca: paleta verde bosque
> + crema + terracota, logo "trama" tejido y los diseños montados sobre un **bolso de lona real**.

## Cómo editar lo básico

- **`assets/js/config.js`** — nombre, lema, WhatsApp, correo, Nequi, valor y umbral de envío,
  descuento con código y clave del panel.
- **`data/productos.json`** — las categorías y los bolsos (nombre, precio, stock, categoría, imagen).
- Las imágenes de producto están en `assets/img/productos/<id>.jpg` (el diseño montado sobre el bolso).

## Cambiar o agregar diseños / bolsos

Cada producto apunta a una imagen en `assets/img/productos/`. Para agregar un diseño nuevo:
1. Monta el diseño sobre el mockup del bolso (o usa tu propia foto) y guárdalo como `assets/img/productos/<id>.jpg`.
2. Agrega una entrada en `data/productos.json` con ese `id`, su `nombre`, `categoria`, `precio` e `imagen`.

El mockup de bolso se generó con el script de armado (toma la foto real del bolso y le reemplaza el
estampado respetando la trama y los pliegues de la tela).

## Publicar en GitHub Pages (repositorio nuevo)

1. Crea un repositorio nuevo, por ejemplo **`trama-de-aqui`**.
2. Sube todo el contenido a la rama `main`.
3. **Settings → Pages → Deploy from a branch → `main` / root**.
4. Queda en `https://TU-USUARIO.github.io/trama-de-aqui/`.

El archivo `.nojekyll` ya está incluido.

## Panel y Supabase (opcional)

Funciona sin Supabase (catálogo desde archivo, pedidos por WhatsApp). Para existencias en tiempo
real y ver pedidos en el panel, sigue `supabase/LEEME.md` y ejecuta `supabase/esquema.sql`. Los
datos de los clientes quedan protegidos por diseño.

## Probar en tu computador

```bash
python3 -m http.server 8000
```
Y abre `http://localhost:8000`.

## Estructura

```
index.html (tienda)  tienda.html  producto.html  carrito.html  pago.html  regalos.html  panel.html  404.html
manifest.webmanifest  .nojekyll
assets/css/  styles.css · panel.css
assets/js/   config.js · app.js · nido.js · panel.js
assets/img/  marca/ (logo, favicon, íconos) · productos/ (bolsos)
data/        productos.json · ajustes.json
supabase/    esquema.sql · LEEME.md
```
