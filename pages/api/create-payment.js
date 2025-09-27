const mercadopago = require('mercadopago');

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

    mercadopago.configure({
      access_token: process.env.MP_ACCESS_TOKEN
    });

    const preference = {
      items: [{
        title: `Factura #${numeroComprobante}`,
        description: `Pago de servicios - Factura ${numeroComprobante}`,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: parseFloat(importe)
      }],
      external_reference: numeroComprobante,
      payer: {
        email: clienteEmail,
        name: nombreCliente || 'Cliente'
      },
      back_urls: {
        success: `${process.env.BASE_URL}/success`,
        failure: `${process.env.BASE_URL}/failure`,
        pending: `${process.env.BASE_URL}/pending`
      },
      auto_return: 'approved'
    };

    const response = await mercadopago.preferences.create(preference);
    
    res.status(200).json({
      success: true,
      payment_url: response.body.init_point,
      preference_id: response.body.id
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}