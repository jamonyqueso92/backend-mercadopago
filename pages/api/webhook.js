export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  try {
    // Import dinámico de mercadopago
    const { MercadoPagoConfig, Payment } = await import('mercadopago');
    
    const { type, data } = req.body;

    console.log('Webhook recibido:', { type, data });

    // Solo procesar pagos
    if (type === 'payment') {
      const client = new MercadoPagoConfig({ 
        accessToken: process.env.MP_ACCESS_TOKEN 
      });
      
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: data.id });
      
      console.log('Info del pago:', {
        id: paymentInfo.id,
        status: paymentInfo.status,
        external_reference: paymentInfo.external_reference,
        amount: paymentInfo.transaction_amount
      });

      // Solo procesar pagos aprobados
      if (paymentInfo.status === 'approved') {
        const facturaId = paymentInfo.external_reference;
        
        console.log(`Pago aprobado para factura: ${facturaId}`);
        
        // Notificar a Google Sheets
        await notificarPagoAGoogleSheets(facturaId, paymentInfo);
      }
    }

    // Siempre responder 200
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(200).json({ received: true, error: error.message });
  }
}

async function notificarPagoAGoogleSheets(facturaId, paymentInfo) {
  try {
    const appsScriptWebhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
    
    if (!appsScriptWebhookUrl) {
      console.error('URL de Apps Script no configurada');
      return;
    }

    console.log('Notificando a Google Sheets...');

    const payload = {
      facturaId: facturaId,
      estado: 'PAGADO',
      fechaPago: new Date().toISOString(),
      montoRecibido: paymentInfo.transaction_amount,
      paymentId: paymentInfo.id
    };

    const response = await fetch(appsScriptWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('Respuesta de Google Sheets:', responseText);

    if (response.ok) {
      console.log(`Factura ${facturaId} notificada exitosamente`);
    } else {
      console.error('Error en respuesta:', responseText);
    }

  } catch (error) {
    console.error('Error notificando a Google Sheets:', error);
  }
}