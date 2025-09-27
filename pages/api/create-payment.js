export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permite POST' });
  }

  try {
    const { numeroComprobante, importe, clienteEmail, nombreCliente } = req.body;

    if (!numeroComprobante || !importe || !clienteEmail) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos' 
      });
    }

    // Placeholder temporal - simulamos respuesta de MP
    res.status(200).json({
      success: true,
      payment_url: `https://www.mercadopago.com.ar/checkout/TEST-${numeroComprobante}?amount=${importe}`,
      preference_id: `PLACEHOLDER-${numeroComprobante}`,
      message: 'Placeholder temporal - reemplazar con MP real después'
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}