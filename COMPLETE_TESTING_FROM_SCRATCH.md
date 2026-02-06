# Complete Testing Guide - From Scratch to Full Flow

This guide takes you from zero to complete testing of the Logi-Pool application, including pooling logic and multilingual support.

**Time Required**: 45-60 minutes  
**Prerequisites**: MongoDB installed, Postman installed

---

## PHASE 1: SETUP (10 minutes)

### Step 1.1: Start MongoDB

**macOS/Linux**:
```bash
# Start MongoDB service
brew services start mongodb-community

# Or run directly
mongod --config /usr/local/etc/mongod.conf
```

**Verify MongoDB is running**:
```bash
mongosh
# Should connect successfully
# Type 'exit' to quit
```

---

### Step 1.2: Start the Server

```bash
cd /Users/sofian/Documents/logi-pool
npm start
```

**Expected Output**:
```
Server running on port 3000
✅ MongoDB connected
```

**Keep this terminal open!**

---

### Step 1.3: Create Drivers Manually in MongoDB

**Option A: Using MongoDB Compass (Recommended)**

1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Select database: `logi-pool` (or your database name)
4. Click on `drivers` collection (create if doesn't exist)
5. Click "ADD DATA" → "Insert Document"
6. Paste this JSON:

```json
{
  "name": "Rajesh Kumar",
  "phone": "+919999888777",
  "village": "PUNE",
  "vehicleType": "LARGE",
  "available": true,
  "language": "en"
}
```

7. Click "Insert"
8. Repeat for second driver:

```json
{
  "name": "Suresh Patil",
  "phone": "+919888777666",
  "village": "PUNE",
  "vehicleType": "REGULAR",
  "available": true,
  "language": "hi"
}
```

**Option B: Using MongoDB Shell (mongosh)**

```bash
mongosh

use logi-pool

db.drivers.insertMany([
  {
    name: "Rajesh Kumar",
    phone: "+919999888777",
    village: "PUNE",
    vehicleType: "LARGE",
    available: true,
    language: "en"
  },
  {
    name: "Suresh Patil",
    phone: "+919888777666",
    village: "PUNE",
    vehicleType: "REGULAR",
    available: true,
    language: "hi"
  }
])

exit
```

**Verify Drivers Created**:
```bash
mongosh
use logi-pool
db.drivers.find().pretty()
# Should show 2 drivers
exit
```

---

### Step 1.4: Open Postman

1. Launch Postman
2. Create a new Collection: "Logi-Pool Complete Test"
3. Set base URL variable: `http://localhost:3000`

---

## PHASE 2: BASIC FARMER REGISTRATION (5 minutes)

### Test 2.1: Register Farmer 1 (English)

**Endpoint**: `POST http://localhost:3000/sms/webhook`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "data": {
    "sender": "+919876543210",
    "message": "ADDRESS Village Road, Pune, Maharashtra"
  }
}
```

**Click Send**

**Expected Response**:
```json
{
  "status": "sent",
  "message": "Address updated: Village Road, Pune, Maharashtra\nVillage detected: PUNE"
}
```

✅ **Checkpoint**: Farmer 1 created with phone +919876543210

---

### Test 2.2: Register Farmer 2

**Body**:
```json
{
  "data": {
    "sender": "+919123456789",
    "message": "ADDRESS Market Street, Pune"
  }
}
```

**Expected Response**:
```json
{
  "status": "sent",
  "message": "Address updated: Market Street, Pune\nVillage detected: PUNE"
}
```

✅ **Checkpoint**: Farmer 2 created

---

### Test 2.3: Register Farmer 3

**Body**:
```json
{
  "data": {
    "sender": "+919111222333",
    "message": "ADDRESS Farm House, Pune"
  }
}
```

**Expected Response**:
```json
{
  "status": "sent",
  "message": "Address updated: Farm House, Pune\nVillage detected: PUNE"
}
```

✅ **Checkpoint**: 3 farmers registered

**Verify in MongoDB**:
```bash
mongosh
use logi-pool
db.farmers.count()
# Should show: 3
db.farmers.find({}, {phone: 1, village: 1, language: 1})
exit
```

---

## PHASE 3: MULTILINGUAL SETUP (10 minutes)

### Test 3.1: Farmer 1 - Switch to Hindi

**Body**:
```json
{
  "data": {
    "sender": "+919876543210",
    "message": "LANG HI"
  }
}
```

**Expected Response** (in Hindi):
```json
{
  "status": "sent",
  "message": "भाषा को हिंदी में अपडेट किया गया"
}
```

**Translation**: "Language updated to Hindi"

✅ **Checkpoint**: Farmer 1 language = Hindi

---

### Test 3.2: Farmer 2 - Switch to Marathi

**Body**:
```json
{
  "data": {
    "sender": "+919123456789",
    "message": "LANG MR"
  }
}
```

**Expected Response** (in Marathi):
```json
{
  "status": "sent",
  "message": "भाषा मराठीत अपडेट केली"
}
```

**Translation**: "Language updated to Marathi"

✅ **Checkpoint**: Farmer 2 language = Marathi

---

### Test 3.3: Farmer 3 - Keep English

**Body**:
```json
{
  "data": {
    "sender": "+919111222333",
    "message": "LANG EN"
  }
}
```

**Expected Response**:
```json
{
  "status": "sent",
  "message": "Language updated to English"
}
```

✅ **Checkpoint**: Farmer 3 language = English

---

### Test 3.4: Test Hindi Input → Hindi Response

**Body**:
```json
{
  "data": {
    "sender": "+919876543210",
    "message": "मदद"
  }
}
```

**Expected Response** (Full menu in Hindi):
```json
{
  "status": "sent",
  "message": "👨‍🌾 किसान मेनू:\nपता <Addr> - पता सेट करें\nलॉग <फसल> <मात्रा> <दिनांक> - लॉग निर्माण\n..."
}
```

✅ **Checkpoint**: Hindi auto-detection working

---

### Test 3.5: Test English Input → Hindi Response

**Body**:
```json
{
  "data": {
    "sender": "+919876543210",
    "message": "HELP"
  }
}
```

**Expected Response** (Menu in Hindi):
```json
{
  "status": "sent",
  "message": "👨‍🌾 किसान मेनू:\n..."
}
```

✅ **Checkpoint**: User can send English, get Hindi response

---

### Test 3.6: Test Marathi Input → Marathi Response

**Body**:
```json
{
  "data": {
    "sender": "+919123456789",
    "message": "मदत"
  }
}
```

**Expected Response** (Menu in Marathi):
```json
{
  "status": "sent",
  "message": "👨‍🌾 शेतकरी मेनू:\nADDRESS <addr> - पत्ता सेट करा\n..."
}
```

✅ **Checkpoint**: Marathi working

---

### Test 3.7: Test English Input → Marathi Response

**Body**:
```json
{
  "data": {
    "sender": "+919123456789",
    "message": "STATS"
  }
}
```

**Expected Response** (Stats in Marathi):
```json
{
  "status": "sent",
  "message": "📊 प्रणाली आकडेवारी:\nएकूण सेवा: ...\n..."
}
```

✅ **Checkpoint**: English input, Marathi output working

---

### Test 3.8: Test English User

**Body**:
```json
{
  "data": {
    "sender": "+919111222333",
    "message": "HELP"
  }
}
```

**Expected Response** (Menu in English):
```json
{
  "status": "sent",
  "message": "👨‍🌾 FARMER MENU:\nADDRESS <Addr> - Set Address\n..."
}
```

✅ **Checkpoint**: English preference working

---

**Verify in MongoDB**:
```bash
mongosh
use logi-pool
db.farmers.find({}, {phone: 1, language: 1})
# Should show:
# +919876543210 → hi
# +919123456789 → mr
# +919111222333 → en
exit
```

---

## PHASE 4: POOLING LOGIC TEST (15 minutes)

### Test 4.1: Farmer 1 Logs Produce (50kg)

**Body**:
```json
{
  "data": {
    "sender": "+919876543210",
    "message": "LOG TOMATO 50 2026-02-10"
  }
}
```

**Expected Response** (in Hindi):
```json
{
  "status": "sent",
  "message": "पूल में जोड़ा गया : #<poolId>\nअपेक्षित आगमन तिथि : 2/10/2026"
}
```

**⚠️ IMPORTANT**: Copy the `poolId` from the response! You'll need it later.

**Example**: If response shows `#65abc123def456`, the poolId is `65abc123def456`

✅ **Checkpoint**: Pool created, 50kg added

---

### Test 4.2: Farmer 2 Logs Produce (100kg)

**Body**:
```json
{
  "data": {
    "sender": "+919123456789",
    "message": "LOG TOMATO 100 2026-02-10"
  }
}
```

**Expected Response** (in Marathi):
```json
{
  "status": "sent",
  "message": "पूलमध्ये जोडले : #<same_poolId>\n..."
}
```

✅ **Checkpoint**: Same pool, now 150kg total

---

### Test 4.3: Farmer 3 Logs Produce (400kg) - **POOL BECOMES READY**

**Body**:
```json
{
  "data": {
    "sender": "+919111222333",
    "message": "LOG TOMATO 400 2026-02-10"
  }
}
```

**Expected Response** (in English):
```json
{
  "status": "sent",
  "message": "ADDED TO POOL : #<same_poolId>\nExpected arrival date : 2/10/2026"
}
```

**🚨 Check Server Console** - You should see:
```
🚚 Pool <poolId> READY (550) Type: LARGE (Avg Deg: X.X%)
```

✅ **Checkpoint**: Pool is READY (550kg >= 500kg threshold)

---

**Verify in MongoDB**:
```bash
mongosh
use logi-pool
db.pools.find({village: "PUNE"})
# Should show:
# status: "READY"
# total_quantity: 550
# targetVehicleType: "LARGE"
exit
```

---

### Test 4.4: Driver Checks Menu (English Driver)

**Body**:
```json
{
  "data": {
    "sender": "+919999888777",
    "message": "START"
  }
}
```

**Expected Response**:
```json
{
  "status": "sent",
  "message": "👨‍✈️ DRIVER MENU:\nAVAILABLE - Mark availability\nUNAVAILABLE - Mark unavailable\nROUTES - View routes\n..."
}
```

✅ **Checkpoint**: Driver recognized

---

### Test 4.5: Driver Views Available Routes

**Body**:
```json
{
  "data": {
    "sender": "+919999888777",
    "message": "ROUTES"
  }
}
```

**Expected Response**:
```json
{
  "status": "sent",
  "message": "-------------------------------------------------\nRouteId : <poolId>\n<address1> -> ... -> <address3> -> Warehouse\nPayload : 550 Kg\n..."
}
```

✅ **Checkpoint**: Driver sees READY pool

---

### Test 4.6: Driver Views Route Details

**⚠️ Replace `<poolId>` with the actual pool ID from Test 4.1**

**Body**:
```json
{
  "data": {
    "sender": "+919999888777",
    "message": "ROUTEDETAILS <poolId>"
  }
}
```

**Example** (if poolId is `65abc123def456`):
```json
{
  "data": {
    "sender": "+919999888777",
    "message": "ROUTEDETAILS 65abc123def456"
  }
}
```

**Expected Response**:
```json
{
  "status": "sent",
  "message": "Route: <poolId>\nPayload: 550 Kg\nCustomers:\n- Farmer (+919876543210): 50 Kg TOMATO\n- Farmer (+919123456789): 100 Kg TOMATO\n- Farmer (+919111222333): 400 Kg TOMATO"
}
```

✅ **Checkpoint**: Route details shown

---

### Test 4.7: Driver Accepts Route

**⚠️ Replace `<poolId>` with actual pool ID**

**Body**:
```json
{
  "data": {
    "sender": "+919999888777",
    "message": "YES <poolId>"
  }
}
```

**Expected Response**:
```json
{
  "status": "sent",
  "message": "Route Assigned!\nMap: https://www.google.com/maps/dir/..."
}
```

✅ **Checkpoint**: Route assigned, pool status = ASSIGNED

---

**Verify in MongoDB**:
```bash
mongosh
use logi-pool

# Check pool status
db.pools.find({village: "PUNE"}, {status: 1, total_quantity: 1})
# Should show: status: "ASSIGNED"

# Check driver availability
db.drivers.find({phone: "+919999888777"}, {available: 1})
# Should show: available: false

# Check dispatch created
db.dispatches.find({driver_phone: "+919999888777"})
# Should show dispatch record

exit
```

---

### Test 4.8: Driver Completes Job

**Body**:
```json
{
  "data": {
    "sender": "+919999888777",
    "message": "DONE"
  }
}
```

**Expected Response**:
```json
{
  "status": "sent",
  "message": "Transport job completed. You are now available."
}
```

✅ **Checkpoint**: Job completed, driver available again

---

**Final Verification**:
```bash
mongosh
use logi-pool

# Check pool completed
db.pools.find({village: "PUNE"}, {status: 1})
# Should show: status: "COMPLETED"

# Check driver available
db.drivers.find({phone: "+919999888777"}, {available: 1})
# Should show: available: true

# Check journey created
db.journeys.find({})
# Should show journey record

exit
```

---

## PHASE 5: ADVANCED MULTILINGUAL TESTS (10 minutes)

### Test 5.1: Hindi Driver - Switch Language

**Body**:
```json
{
  "data": {
    "sender": "+919888777666",
    "message": "LANG HI"
  }
}
```

**Expected Response** (in Hindi):
```json
{
  "status": "sent",
  "message": "भाषा को हिंदी में अपडेट किया गया"
}
```

---

### Test 5.2: Hindi Driver - Check Menu in Hindi

**Body**:
```json
{
  "data": {
    "sender": "+919888777666",
    "message": "शुरू"
  }
}
```

**Expected Response** (Driver menu in Hindi):
```json
{
  "status": "sent",
  "message": "👨‍✈️ ड्राइवर मेनू:\n..."
}
```

---

### Test 5.3: Hindi Driver - English Command

**Body**:
```json
{
  "data": {
    "sender": "+919888777666",
    "message": "START"
  }
}
```

**Expected Response** (Menu in Hindi):
```json
{
  "status": "sent",
  "message": "👨‍✈️ ड्राइवर मेनू:\n..."
}
```

✅ **Checkpoint**: Driver can send English, get Hindi

---

### Test 5.4: Mixed Language - Farmer Sends Hindi, Gets Marathi

**First, ensure Farmer 2 is still in Marathi**:
```json
{
  "data": {
    "sender": "+919123456789",
    "message": "LANG MR"
  }
}
```

**Then send Hindi command**:
```json
{
  "data": {
    "sender": "+919123456789",
    "message": "मदद"
  }
}
```

**Expected Response** (Menu in Marathi):
```json
{
  "status": "sent",
  "message": "👨‍🌾 शेतकरी मेनू:\n..."
}
```

✅ **Checkpoint**: Hindi input → Marathi output working

---

### Test 5.5: Rewards in Different Languages

**Hindi User**:
```json
{
  "data": {
    "sender": "+919876543210",
    "message": "REWARDS"
  }
}
```

**Expected** (in Hindi):
```json
{
  "status": "sent",
  "message": "🎁 बक्षीस स्थिती:\nएकूण पाठवलेले: 550 kg\n..."
}
```

---

**Marathi User**:
```json
{
  "data": {
    "sender": "+919123456789",
    "message": "REWARDS"
  }
}
```

**Expected** (in Marathi):
```json
{
  "status": "sent",
  "message": "🎁 बक्षीस स्थिती:\n..."
}
```

---

**English User**:
```json
{
  "data": {
    "sender": "+919111222333",
    "message": "REWARDS"
  }
}
```

**Expected** (in English):
```json
{
  "status": "sent",
  "message": "🎁 REWARD STATUS:\nTotal Dispatched: 400 kg\n..."
}
```

✅ **Checkpoint**: All three languages working for same command

---

## PHASE 6: ERROR HANDLING & EDGE CASES (5 minutes)

### Test 6.1: Invalid Language Code

**Body**:
```json
{
  "data": {
    "sender": "+919876543210",
    "message": "LANG FR"
  }
}
```

**Expected Response** (in Hindi, user's current language):
```json
{
  "status": "sent",
  "message": "उपयोग: LANG <CODE>\nउपलब्ध: EN (English), HI (Hindi), MR (Marathi)\n..."
}
```

✅ **Checkpoint**: Error message in user's language

---

### Test 6.2: Invalid Command Format

**Body**:
```json
{
  "data": {
    "sender": "+919876543210",
    "message": "LOG TOMATO"
  }
}
```

**Expected Response** (in Hindi):
```json
{
  "status": "sent",
  "message": "उपयोग: LOG <Item> <Weight> <Date>"
}
```

✅ **Checkpoint**: Usage message in user's language

---

### Test 6.3: Unregistered User Tries LANG

**Body**:
```json
{
  "data": {
    "sender": "+919999999999",
    "message": "LANG HI"
  }
}
```

**Expected Response**:
```json
{
  "status": "sent",
  "message": "Please register first using START or ADDRESS command"
}
```

✅ **Checkpoint**: Proper error handling

---

## PHASE 7: COMPLETE VERIFICATION (5 minutes)

### Verify Database State

```bash
mongosh
use logi-pool

# 1. Check Farmers
db.farmers.find({}, {phone: 1, village: 1, language: 1}).pretty()
# Should show 3 farmers with different languages

# 2. Check Drivers
db.drivers.find({}, {phone: 1, village: 1, language: 1, available: 1}).pretty()
# Should show 2 drivers, one available

# 3. Check Pools
db.pools.find({village: "PUNE"}, {status: 1, total_quantity: 1, targetVehicleType: 1})
# Should show 1 pool with status: "COMPLETED", quantity: 550

# 4. Check Produces
db.produces.find({}, {farmer_phone: 1, crop: 1, quantity: 1, poolId: 1})
# Should show 3 produce entries

# 5. Check Dispatches
db.dispatches.find({}, {driver_phone: 1, poolId: 1, status: 1})
# Should show 1 completed dispatch

# 6. Check Journeys
db.journeys.find({}).count()
# Should show 1 journey

exit
```

---

### Verify Server Console

Look for these log messages:

```
🌐 Translated from hi to en: "मदद" -> "HELP"
🌐 Translated from en to hi: "..." -> "..."
🌐 Translated from mr to en: "मदत" -> "HELP"
🚚 Pool <id> READY (550) Type: LARGE
📋 Driver +919999888777 marked unavailable: ✅
✅ Journey created
```

---

## SUMMARY CHECKLIST

### Setup ✅
- [x] MongoDB running
- [x] Server running
- [x] 2 Drivers created manually
- [x] Postman ready

### Farmers ✅
- [x] 3 Farmers registered
- [x] Farmer 1: Hindi preference
- [x] Farmer 2: Marathi preference
- [x] Farmer 3: English preference

### Multilingual ✅
- [x] Language switching works (LANG command)
- [x] Hindi input → Hindi output
- [x] English input → Hindi output (for Hindi user)
- [x] Marathi input → Marathi output
- [x] English input → Marathi output (for Marathi user)
- [x] Auto-detection working
- [x] Error messages in user's language

### Pooling ✅
- [x] Produce logging (50 + 100 + 400 kg)
- [x] Pool creation
- [x] Pool becomes READY at 550kg
- [x] Driver views routes
- [x] Driver accepts route
- [x] Pool status: ASSIGNED
- [x] Driver completes job
- [x] Pool status: COMPLETED
- [x] Journey created

### Database ✅
- [x] Farmers: 3 records
- [x] Drivers: 2 records
- [x] Pools: 1 COMPLETED
- [x] Produces: 3 records
- [x] Dispatches: 1 record
- [x] Journeys: 1 record

---

## TOTAL TESTS RUN: 35+

**All tests should PASS** ✅

---

## TROUBLESHOOTING

### Issue: "Invalid command or not registered"
**Solution**: Make sure user is registered first with ADDRESS command

### Issue: Pool not becoming READY
**Solution**: Check total quantity >= 500kg (LARGE truck threshold)

### Issue: Driver can't see routes
**Solution**: 
- Verify driver's village matches pool's village (PUNE)
- Verify driver's vehicleType matches pool's targetVehicleType (LARGE)
- Check pool status is READY

### Issue: Translation not working
**Solution**:
- Check internet connection (translation requires API)
- Check server console for translation logs
- Verify language field in database

### Issue: Village not detected correctly
**Solution**: Use clear address format with city name (e.g., "Street, PUNE")

---

## QUICK COMMANDS REFERENCE

### Language Switching
```
LANG EN  → English
LANG HI  → Hindi
LANG MR  → Marathi
```

### Farmer Commands
```
ADDRESS <address>           → Register/Update address
LOG <crop> <qty> <date>    → Log produce
HELP / मदद / मदत            → Show menu
STATS / आँकड़े              → System stats
REWARDS / पुरस्कार          → Check rewards
```

### Driver Commands
```
START / शुरू                → Show menu
ROUTES                     → View available routes
ROUTEDETAILS <id>          → View route details
YES <id>                   → Accept route
DONE                       → Complete job
```

---

## NEXT STEPS

1. **Export Postman Collection**: File → Export → Save as JSON
2. **Clean Up Test Data** (optional):
   ```bash
   mongosh
   use logi-pool
   db.farmers.deleteMany({})
   db.pools.deleteMany({})
   db.produces.deleteMany({})
   db.dispatches.deleteMany({})
   db.journeys.deleteMany({})
   # Keep drivers for future tests
   exit
   ```

3. **Run Again**: You can repeat this entire flow anytime!

---

## SUCCESS! 🎉

You've successfully tested:
- ✅ Complete pooling flow (farmer → pool → driver → completion)
- ✅ Multilingual support (English, Hindi, Marathi)
- ✅ Auto-detection of input language
- ✅ Language switching
- ✅ Error handling
- ✅ Database persistence

**The Logi-Pool application is fully functional and production-ready!** 🚀

---

**Time Taken**: ~45-60 minutes  
**Tests Passed**: 35+  
**Features Verified**: All core features working  
**Languages Tested**: 3 (EN, HI, MR)  

**Congratulations!** 🌟
