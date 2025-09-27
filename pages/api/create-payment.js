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

    // Crear preferencia usando fetch directamente a la API de MP
    const preferenceData = {
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

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`MP API Error: ${result.message || 'Unknown error'}`);
    }
    
    res.status(200).json({
      success: true,
      payment_url: result.init_point,
      preference_id: result.id
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}