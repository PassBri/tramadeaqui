# Conectar Nidito a Supabase

La tienda funciona **sin Supabase**: lee el catálogo desde `data/productos.json` y recibe
los pedidos por WhatsApp. Conectar Supabase sirve para tener **existencias en tiempo real**
y un **panel con los pedidos y mensajes**.

## Pasos

1. Crea una cuenta gratis en [supabase.com](https://supabase.com) y un proyecto nuevo.
2. Entra a **SQL Editor**, pega todo el contenido de `esquema.sql` y dale **Run**.
3. Ve a **Project Settings → API** y copia:
   - **Project URL**
   - **anon public key**
4. Pégalas en `assets/js/config.js`:
   ```js
   supabaseUrl: 'https://TU-PROYECTO.supabase.co',
   supabaseAnonKey: 'TU-ANON-KEY',
   ```
5. Carga tu catálogo en la tabla **catalogo** (puedes importar un CSV o usar el editor de tablas).

## Importante sobre la seguridad

- Los **pedidos** y **mensajes** quedan protegidos: cualquiera puede *crearlos* (eso lo necesita
  la tienda), pero **nadie los puede leer** con la clave pública. Así los datos de tus clientes
  (nombre, teléfono, dirección) no quedan expuestos.
- Por eso, para **ver los pedidos en el panel**, debes crear un **usuario administrador** con
  Supabase Auth y habilitar las políticas de lectura que están comentadas al final de `esquema.sql`.
- Mientras no lo hagas, el panel funciona en **modo demo** (te muestra el último pedido guardado
  en tu propio navegador y el catálogo), que es suficiente para probar.

## La clave del panel

El panel (`panel.html`) tiene una clave sencilla del lado del navegador que cambias en
`assets/js/config.js` (`panelPin`). Es solo una barrera básica; la seguridad real de los datos
la dan las políticas de Supabase explicadas arriba.
