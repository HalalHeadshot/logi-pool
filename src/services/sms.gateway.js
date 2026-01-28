/**
 * SMS Gateway Service using httpSMS
 * Sends SMS messages via your Android phone
 * 
 * Setup required:
 * 1. Create account at https://httpsms.com
 * 2. Get API key from https://httpsms.com/settings
 * 3. Install Android app: https://github.com/NdoleStudio/httpsms/releases/latest/download/HttpSms.apk
 * 4. Add HTTPSMS_API_KEY and HTTPSMS_FROM_PHONE to .env
 */

const API_URL = 'https://api.httpsms.com/v1/messages/send';

/**
 * Send a single SMS message
 * @param {string} to - Recipient phone number (with country code, e.g., +919876543210)
 * @param {string} content - Message content
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function sendSMS(to, content) {
  const apiKey = process.env.HTTPSMS_API_KEY;
  const fromPhone = process.env.HTTPSMS_FROM_PHONE;

  if (!apiKey || !fromPhone) {
    console.error('❌ SMS Gateway not configured. Set HTTPSMS_API_KEY and HTTPSMS_FROM_PHONE in .env');
    return { success: false, error: 'SMS Gateway not configured' };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        from: fromPhone,
        to
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      console.log(`✅ SMS sent to ${to}`);
      return { success: true, data: data.data };
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
  const results = await Promise.all(
    recipients.map(to => sendSMS(to, content))
  );

  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`📊 Bulk SMS: ${sent} sent, ${failed} failed`);

  return { sent, failed, results };
}
