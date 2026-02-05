# SMS Commands Reference

This document lists all SMS commands for the Logi-Pool system, including the new **Payload Size & Priority Pooling** workflow.

**Base URL:** `http://localhost:3000/sms/webhook`
**Request format:** POST with JSON body.

---

## 🚚 Truck & Priority Logic (New)

The system now supports **Intelligent Dispatch** based on produce degradation (freshness) and quantity:

| Scenario | Degradation | Capacity Needed | Truck Type | Priority |
|---|---|---|---|---|
| **Bulk / Fresh** | Low (< 50%) | 2500 kg | **LARGE** | Standard |
| **High Priority** | High (>= 50%) | 1000 kg | **REGULAR** | High |
| **Critical** | Critical (>= 90%) | Any | **REGULAR** | **FORCE DISPATCH** |

---

## Generic / Unknown User

### START
Shows menu based on user type.

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+911111111111","Body":"START"}'
```

---

## Farmer Commands

Farmers must set their **ADDRESS** before using **LOG**.

### ADDRESS <address>
Save or update the farmer's pickup address.

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919999999999","Body":"ADDRESS 123 Farm Road, Rampur"}'
```

### LOG <crop> <quantity> <date>
Log produce with a "ready by" date. **The date determines priority.**

**Scenario 1: Bulk Fresh Produce (triggers LARGE truck)**
```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919999999999","Body":"LOG WHEAT 1500 2026-02-10"}'
```
*(Log twice to reach 2500kg threshold)*

**Scenario 2: High Priority / Degrading (triggers REGULAR truck)**
```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919999999999","Body":"LOG TOMATO 600 2026-02-05"}'
```
*(If date is today/tomorrow, priority increases)*

**Scenario 3: Critical / Expired (Force Dispatch)**
```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919999999999","Body":"LOG SPINACH 100 2026-02-03"}'
```
*(Past date = 100% degradation = Immediate Dispatch)*

### HELP
Shows the Farmer menu.

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919999999999","Body":"HELP"}'
```

---

## Driver Commands

Drivers are pre-registered with a `vehicleType` (**REGULAR** or **LARGE**). They only receive notifications for pools matching their truck type.

### START
Shows the Driver menu.

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+918888888888","Body":"START"}'
```

### AVAILABLE
Mark as available.

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+918888888888","Body":"AVAILABLE"}'
```

### ROUTES
List READY pools (filtered by driver's truck type).

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+918888888888","Body":"ROUTES"}'
```

### YES <poolId>
Accept a route.

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+918888888888","Body":"YES 65df..."}'
```

### DONE
Complete job (triggers blockchain record).

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+918888888888","Body":"DONE"}'
```

---

## Equipment Rental Commands

### REGISTER <type> <address> <price> <phone> <name>
Register equipment (TRACTOR, PLOUGH, etc).

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919876543210","Body":"REGISTER TRACTOR 14th St Bangalore 600 9876543210 RAMESH"}'
```

### RENT <type> <hours> <phone> <address> [date]
Rent equipment.

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919123456789","Body":"RENT TRACTOR 5 9123456789 Panvel 2026-02-10"}'
```

### AVAILABLE <village>
Check availability.

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919123456789","Body":"AVAILABLE BANGALORE"}'
```

### MYSERVICES <phone>
View registered services (Owner).

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919876543210","Body":"MYSERVICES"}'
```

### MYBOOKINGS <phone>
View bookings (Farmer).

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919123456789","Body":"MYBOOKINGS"}'
```

### STATS
System stats.

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919999999999","Body":"STATS"}'
```
