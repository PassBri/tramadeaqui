// Configuración de la tienda Trama de Aquí.
// Cambia estos valores sin tocar el resto del código.
window.NIDITO = {
  marca: 'Trama de Aquí',
  lema: 'Lleva tu tierra contigo',

  // WhatsApp que recibe los pedidos: código de país + número, sin espacios ni "+".
  whatsapp: '573000000000',
  correo: 'hola@tramadeaqui.co',
  instagram: 'https://instagram.com/',

  // Envío gratis desde este valor (pesos colombianos) y valor del envío normal.
  envioGratisDesde: 150000,
  envioValor: 12000,

  // Pago con Nequi: número que recibe los pagos, titular y (opcional) tu QR de Nequi Negocios.
  nequi: '3000000000',
  nequiTitular: 'Trama de Aquí',
  nequiQR: '',

  // Descuento para quien compra con un código (porcentaje). 0 = sin códigos.
  descuentoEmbajador: 10,

  // Clave para entrar al panel (panel.html). Barrera básica del navegador; la seguridad real
  // la ponen las reglas de Supabase. Cámbiala por una propia.
  panelPin: '2026',

  // Próxima colección (si la activas desde el panel). Hora de Colombia.
  dropAbre: '2026-12-15T18:00:00-05:00',
  dropNombre: 'Nueva colección',

  // Supabase (panel y existencias en tiempo real). Están en Supabase → Project Settings → API.
  supabaseUrl: '',
  supabaseAnonKey: '',
};
window.NIDITO.supabaseUrl = (window.NIDITO.supabaseUrl || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
