# SMS Commands Reference

This document lists all SMS commands for the Logi-Pool system, with explanations and cURL examples for testing via the API.

**Base URL:** `http://localhost:3000/sms` (or your deployed URL)

**Request format:** POST with JSON body. The SMS gateway typically sends:
- `data.message` or `message` – the SMS text
- `data.sender` or `sender` – the phone number (e.g. `+919999999999`)

---

## Blockchain Integration

Yes, **the SMS workflow works with the blockchain**. When a driver sends **DONE** to complete a transport job:

1. The dispatch is marked completed
2. `createJourneyForCompletedDispatch()` builds a canonical payload (pool, dispatch, farmer contributions)
3. The payload is hashed (SHA-256), uploaded to R2, and the hash is recorded on **Polygon (Amoy testnet)** via a zero-value transaction
4. This provides immutable verification that the journey was completed

If blockchain env vars are missing (`CHAIN_RPC_URL`, `WALLET_PRIVATE_KEY`, `JOURNEY_WALLET_ADDRESS`), the system skips on-chain recording but the journey still completes.

---

## Generic / Unknown User

### START

Shows menu based on user type. If the phone is not registered as Driver or Farmer, shows a generic welcome.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"START","sender":"+911111111111"}}'
```

**Expected:** "Welcome to Logi-Pool! Are you a Driver or Farmer? (Contact Admin to register)"

---

## Farmer Commands

Farmers must set their **ADDRESS** before using **LOG**.

### START (Farmer)

Shows the Farmer menu. The phone must exist in the Farmer collection (created via ADDRESS).

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"START","sender":"+919999999999"}}'
```

**Expected:** Farmer menu with ADDRESS, LOG, HELP options.

---

### ADDRESS \<address\>

Save or update the farmer's pickup address. Creates the farmer record if it doesn't exist. Village is extracted from the address (via location service).

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"ADDRESS 123 Farm Road, Rampur","sender":"+919999999999"}}'
```

**Expected:** "Address updated: 123 Farm Road, Rampur" (and village if extracted)

---

### LOG \<crop\> \<quantity\> \<date\>

Log produce with a "ready by" date. **Requires ADDRESS to be set first.**

- **crop:** e.g. WHEAT, RICE, TOMATO, POTATO
- **quantity:** weight in kg
- **date:** ready-by date (e.g. 2023-10-25)

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"LOG WHEAT 100 2023-10-25","sender":"+919999999999"}}'
```

**Expected:** "ADDED TO POOL : #\<poolId\>" plus expected arrival date

**If no address set:**

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"LOG POTATO 50 2024-01-15","sender":"+911111111111"}}'
```

**Expected:** "Please set address first using ADDRESS command"

---

### HELP

Shows the Farmer menu again. Useful for registered farmers who forget the commands.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"HELP","sender":"+919999999999"}}'
```

**Expected:** Farmer menu (ADDRESS, LOG, HELP)

---

## Driver Commands

Drivers must be pre-registered in the Driver collection (e.g. via seed script or admin).

### START (Driver)

Shows the Driver menu.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"START","sender":"+918888888888"}}'
```

**Expected:** Driver menu with AVAILABLE, UNAVAILABLE, ROUTES, ROUTEDETAILS, YES, DONE

---

### AVAILABLE

Mark the driver as available for route assignment.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"AVAILABLE","sender":"+918888888888"}}'
```

**Expected:** "You are now marked AVAILABLE."

---

### UNAVAILABLE

Mark the driver as unavailable.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"UNAVAILABLE","sender":"+918888888888"}}'
```

**Expected:** "You are now marked UNAVAILABLE."

---

### ROUTES

List all READY pools (routes) in the driver's village with hardcoded ETAs.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"ROUTES","sender":"+918888888888"}}'
```

**Expected:** List of routes with RouteId, pickup addresses, payload, ETA

**If none:** "No routes available in your area."

---

### ROUTEDETAILS \<poolId\>

Show detailed info for a specific pool: crop, total weight, farmer contacts.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"ROUTEDETAILS 69823f2d340b482fdf7c8a7e","sender":"+918888888888"}}'
```

**Expected:** Route details, payload, list of customers (farmer name/phone, quantity, crop)

---

### YES \<poolId\>

Accept and assign a specific route. Driver receives a Google Maps link for pickups.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"YES 69823f2d340b482fdf7c8a7e","sender":"+918888888888"}}'
```

**Expected:** "Route Assigned!" plus map URL

**Side effects:** Farmers are notified "DRIVER ACQUIRED" with driver details and ETA.

---

### DONE

Mark the transport job as completed. **Triggers blockchain recording** of the journey hash.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"DONE","sender":"+918888888888"}}'
```

**Expected:** "Transport job completed. You are now available."

**Side effects:** Journey payload is hashed, uploaded to R2, and hash recorded on Polygon blockchain (if configured).

---

## 🚜 Equipment Rental Commands (Shared Plough Integration)

These commands enable equipment owners to register agricultural services and farmers to rent them.

---

### REGISTER \<type\> \<address\> \<price\> \<phone\> \<owner\>

Register agricultural equipment for rent. Types: TRACTOR, PLOUGH, LABOUR, WAREHOUSE

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"REGISTER TRACTOR 14th Street Whitefield Bangalore 600 9876543210 RAMESH","sender":"+919876543210"}}'
```

**Expected:** Service registered with ID, village extracted from address, price confirmed.

---

### RENT \<type\> \<hours\> \<phone\> \<address\> [date]

Rent equipment for specified hours. Date is optional (defaults to now).

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"RENT TRACTOR 5 9123456789 Near Market Panvel 2026-02-10","sender":"+919123456789"}}'
```

**Expected:** Booking confirmed with owner details, pricing, and Google Maps link.

**If all equipment booked:** Shows "Earliest Available" time.

---

### AVAILABLE \<village\>

Check available equipment in a specific village.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"AVAILABLE BANGALORE","sender":"+919123456789"}}'
```

**Expected:** List of available services with owner name, price, and phone.

---

### MYSERVICES \<phone\>

View equipment registered by an owner.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"MYSERVICES 9876543210","sender":"+919876543210"}}'
```

**Expected:** List of services with type, village, price, and availability status.

---

### MYBOOKINGS \<phone\>

View farmer's equipment booking history.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"MYBOOKINGS 9123456789","sender":"+919123456789"}}'
```

**Expected:** Last 5 bookings with type, status, price, and date.

---

### STATS

View system statistics for equipment services.

```bash
curl -X POST http://localhost:3000/sms \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"STATS","sender":"+919999999999"}}'
```

**Expected:** Total services, available count, total bookings, active bookings.

---

## Typical Flow

### Farmer flow (Produce Logistics)

1. `ADDRESS 123 Farm Road, Rampur`
2. `LOG WHEAT 100 2023-10-25`
3. When pool is full: receives "POOL IS FULL, WAITING ON DRIVER.."
4. When driver accepts: receives "DRIVER ACQUIRED" with details

### Driver flow

1. `AVAILABLE`
2. `ROUTES` (when notified of ready pool)
3. `ROUTEDETAILS \<id\>` (optional)
4. `YES \<id\>` to accept
5. `DONE` when delivery complete (→ blockchain record)

### Equipment Owner flow

1. `REGISTER TRACTOR 14th Street Bangalore 600 9876543210 RAMESH`
2. `MYSERVICES 9876543210` to view registered equipment
3. When booked: receives Google Maps link to farmer location
4. Equipment auto-released when booking period expires

### Farmer flow (Equipment Rental)

1. `AVAILABLE BANGALORE` - Check what's available
2. `RENT TRACTOR 5 9123456789 Near Market Panvel 2026-02-10`
3. Receives booking confirmation with owner contact
4. `MYBOOKINGS 9123456789` to view history
