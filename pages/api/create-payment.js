import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permite POST' });
  }

  try {
    const { numeroComprobante, importe, clienteEmail, nombreCliente } = req.body;

    if (!numeroComprobante || !importe || !clienteEmail) {
      return res.status(400).json({ 
        error: 'Faltan datos: numeroComprobante, importe, clienteEmail' 
      });
    }

    // Configurar cliente de Mercado Pago
    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MP_ACCESS_TOKEN,
      options: { timeout: 5000 }
    });

    // Crear instancia de Preference
    const preference = new Preference(client);

    // Definir la preferencia
    const preferenceData = {
      items: [
        {
          id: numeroComprobante,
          title: `Factura #${numeroComprobante} - Cobranzas PYN`,
          description: `Pago de servicios - Factura ${numeroComprobante}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: parseFloat(importe)
        }
      ],
      external_reference: numeroComprobante,
      payer: {
        name: nombreCliente || 'Cliente',
        email: clienteEmail
      },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12
      },
      back_urls: {
        success: `${process.env.BASE_URL}/success?factura=${numeroComprobante}`,
        failure: `${process.env.BASE_URL}/failure?factura=${numeroComprobante}`,
        pending: `${process.env.BASE_URL}/pending?factura=${numeroComprobante}`
      },
      auto_return: 'approved',
      statement_descriptor: 'COBRANZAS PYN'
    };

    // Crear la preferencia
    const response = await preference.create({ body: preferenceData });
    
    res.status(200).json({
      success: true,
      payment_url: response.init_point,
      preference_id: response.id,
      numeroComprobante: numeroComprobante
    });

  } catch (error) {
    console.error('Error creando pago MP:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error procesando pago'
    });
  }
}