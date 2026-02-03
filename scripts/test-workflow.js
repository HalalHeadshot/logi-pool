
const BASE_URL = 'http://localhost:3001/sms';

async function sendSMS(phone, message) {
    console.log(`\n📤 Sending from ${phone}: "${message}"`);
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: {
                message,
                sender: phone
            }
        })
    });
    const text = await res.text();
    console.log(`📥 Response: ${text}`);
    return text;
}

async function run() {
    const farmerPhone = '+917777777777';
    const driverPhone = '+918888888888';

    // 1. Unknown User START
    await sendSMS(farmerPhone, 'START');

    // 2. Farmer Register
    await sendSMS(farmerPhone, 'ADDRESS 123 Farm Lane, Rampur');

    // 3. Farmer Menu
    await sendSMS(farmerPhone, 'START');

    // 4. Farmer Log
    const logRes = await sendSMS(farmerPhone, 'LOG Wheat 100 2023-10-20');

    // Extract Pool ID/Info (Manual check or basic regex)
    // Response: "ADDED TO POOL : <ID> ..."

    // 5. Driver Menu
    await sendSMS(driverPhone, 'START');

    // 6. Driver Routes
    const routesRes = await sendSMS(driverPhone, 'ROUTES');

    // Extract Route ID
    const match = routesRes.match(/RouteId : ([a-f0-9]+)/);
    if (match) {
        const routeId = match[1];
        console.log(`💡 Found Route ID: ${routeId}`);

        // 7. Route Details
        await sendSMS(driverPhone, `ROUTEDETAILS ${routeId}`);

        // 8. Driver Accept
        await sendSMS(driverPhone, `YES ${routeId}`);
    } else {
        console.log('⚠️ No Route ID found in response. Maybe testing failed or no pool ready.');
    }

}

run().catch(console.error);
