/**
 * SMS Gateway Service using TextBee
 * Sends SMS messages via your Android phone
 * 
 * Setup required:
 * 1. Create account at https://textbee.dev
 * 2. Download and install the Android app from: https://github.com/vernu/textbee/releases
 * 3. Get your API key and Device ID from the TextBee dashboard
 * 4. Add TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID to .env
 */

const BASE_URL = 'https://api.textbee.dev/api/v1';

/**
 * Send a single SMS message via TextBee
 * @param {string} to - Recipient phone number (with country code, e.g., +919876543210)
 * @param {string} content - Message content
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function sendSMS(to, content) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey || !deviceId) {
    console.error('❌ TextBee not configured. Set TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID in .env');
    return { success: false, error: 'TextBee not configured' };
  }

  try {
    const response = await fetch(`${BASE_URL}/gateway/devices/${deviceId}/send-sms`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipients: [to],
        message: content
      })
    });

    const data = await response.json();

    if (response.ok && data.success !== false) {
      console.log(`✅ SMS sent to ${to}`);
      return { success: true, data };
    } else {
      console.error(`❌ SMS failed to ${to}:`, data);
      return { success: false, error: data.message || 'Failed to send SMS' };
    }
  } catch (error) {
    console.error(`❌ SMS error to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS to multiple recipients
 * @param {string[]} recipients - Array of phone numbers
 * @param {string} content - Message content
 * @returns {Promise<{sent: number, failed: number, results: object[]}>}
 */
export async function sendBulkSMS(recipients, content) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey || !deviceId) {
    console.error('❌ TextBee not configured');
    return { sent: 0, failed: recipients.length, results: [] };
  }

  try {
    // TextBee supports bulk sending in a single request
    const response = await fetch(`${BASE_URL}/gateway/devices/${deviceId}/send-sms`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipients,
        message: content
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`📊 Bulk SMS sent to ${recipients.length} recipients`);
      return { sent: recipients.length, failed: 0, results: [data] };
    } else {
      return { sent: 0, failed: recipients.length, results: [data] };
    }
  } catch (error) {
    console.error(`❌ Bulk SMS error:`, error.message);
    return { sent: 0, failed: recipients.length, results: [{ error: error.message }] };
  }
}
