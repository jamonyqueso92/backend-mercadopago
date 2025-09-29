import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const client = new MercadoPagoConfig({ 
        accessToken: process.env.MP_ACCESS_TOKEN 
      });
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: data.id });

      console.log('Pago recibido:', {
        id: paymentInfo.id,
        status: paymentInfo.status,
        external_reference: paymentInfo.external_reference,
        transaction_amount: paymentInfo.transaction_amount
      });

      if (paymentInfo.status === 'approved') {
        const facturaId = paymentInfo.external_reference;
        await notificarPagoAGoogleSheets(facturaId, paymentInfo);
      }
    }

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
      console.log('URL de Apps Script no configurada');
      return;
    }

    const payload = {
      facturaId: facturaId,
      estado: 'PAGADO',
      fechaPago: new Date().toISOString(),
      montoRecibido: paymentInfo.transaction_amount,
      paymentId: paymentInfo.id
    };

    const response = await fetch(appsScriptWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`Factura ${facturaId} marcada como PAGADO en Google Sheets`);
    } else {
      console.error('Error notificando a Google Sheets:', await response.text());
    }

  } catch (error) {
    console.error('Error notificando pago a Google Sheets:', error);
  }
}