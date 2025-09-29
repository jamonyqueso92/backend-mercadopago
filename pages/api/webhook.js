import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  try {
    // Log para depuración: ver exactamente qué llega
    console.log('Webhook recibido:', JSON.stringify(req.body));

    const { type, data } = req.body;

    // Solo procesar si es un pago
    if (type === 'payment' && data && data.id) {
      const client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
      });

      const payment = new Payment(client);

      // Reintentos por si el pago aún no está disponible en la API (hasta 3 intentos)
      let paymentInfo;
      let intentos = 0;
      let errorConsulta = null;
      while (intentos < 3) {
        try {
          paymentInfo = await payment.get({ id: data.id });
          break; // Si lo encuentra, sale del bucle
        } catch (error) {
          errorConsulta = error;
          intentos++;
          await new Promise((r) => setTimeout(r, 1000)); // Espera 1 segundo antes de reintentar
        }
      }

      if (!paymentInfo) {
        console.error('No se encontró el pago después de 3 intentos:', errorConsulta);
        return res.status(200).json({
          received: true,
          error: 'Payment not found',
          details: errorConsulta?.message || errorConsulta,
        });
      }

      console.log('Pago recibido:', {
        id: paymentInfo.id,
        status: paymentInfo.status,
        external_reference: paymentInfo.external_reference,
        transaction_amount: paymentInfo.transaction_amount,
      });

      if (paymentInfo.status === 'approved') {
        const facturaId = paymentInfo.external_reference;

        // Notificar a Google Sheets
        await notificarPagoAGoogleSheets(facturaId, paymentInfo);
      }
    } else {
      console.log('Evento recibido no es de tipo payment o falta el id');
    }

    // Siempre responder 200 para que Mercado Pago no reintente
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(200).json({ received: true, error: error.message });
  }
}

/**
 * Notificar pago a Google Sheets via Apps Script
 */
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
      paymentId: paymentInfo.id,
    };

    const response = await fetch(appsScriptWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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