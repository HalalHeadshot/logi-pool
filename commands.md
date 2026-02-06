# SMS Commands Reference

This document lists all SMS commands for the Logi-Pool system, including Multilingual Support and Pooling Logic.

**Base URL:** `http://localhost:3000/sms/webhook`
**Request format:** POST with JSON body.

---

## 🌐 Multilingual Support

Users can interact with the system in English, Hindi, or Marathi.

### LANG <code>
Set your preferred language.

| Code | Language | Example |
|---|---|---|
| **EN** | English | `LANG EN` |
| **HI** | Hindi | `LANG HI` |
| **MR** | Marathi | `LANG MR` |

```bash
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"From":"+919999999999","Body":"LANG MR"}'
```

---

## 🚚 Truck & Priority Logic

The system supports **Intelligent Dispatch**:
1.  **Multi-Pool Splitting**: Large orders split into multiple trucks.
2.  **Dynamic Priority Upgrading**: Critical items upgrade the entire pool.

---

## Farmer Commands

### ADDRESS <address>
Register/Update address.
```bash
LOG TOMATO 600 2026-02-05
```

### LOG <crop> <quantity> <date>
Log produce. Date determines priority.
```bash
LOG TOMATO 600 2026-02-05
```

### HELP
Show menu.
```bash
HELP
```

---

## Driver Commands

Drivers are pre-registered with `vehicleType` (**REGULAR** or **LARGE**).

### START
Show Driver menu.
```bash
START
```

### ROUTES
List READY pools.
```bash
ROUTES
```

### YES <poolId>
Accept a route.
```bash
YES 65df...
```

### DONE
Complete job.
```bash
DONE
```

---

## Equipment Rental Commands

### REGISTER <type> <addr> <price> <phone> <name>
Register equipment.

### RENT <type> <hrs> <phone> <addr> [date]
Rent equipment.

### AVAILABLE <village>
Check availability.

### STATS
System stats.
