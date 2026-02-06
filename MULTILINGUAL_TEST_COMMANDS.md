# Complete Multilingual Test Commands

This file contains all test commands for multilingual support testing. You can copy-paste these directly into Postman or run them via cURL.

**Base URL**: `http://localhost:3000`

---

## PART 1: SETUP - Create Test Users

### Test User 1: Farmer (English Default)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "ADDRESS Village Road, Pune, Maharashtra"
  }
}
```
**Expected**: `"Village detected: PUNE"`

---

### Test User 2: Farmer (Will switch to Hindi)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "ADDRESS Market Street, Pune"
  }
}
```
**Expected**: `"Village detected: PUNE"`

---

### Test User 3: Farmer (Will switch to Marathi)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919111222333",
    "message": "ADDRESS Farm House, Pune"
  }
}
```
**Expected**: `"Village detected: PUNE"`

---

## PART 2: LANGUAGE SWITCHING TESTS

### Test 2.1: Switch User 1 to Hindi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "LANG HI"
  }
}
```
**Expected**: `"भाषा को हिंदी में अपडेट किया गया"` (Language updated to Hindi)

---

### Test 2.2: Switch User 2 to Marathi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "LANG MR"
  }
}
```
**Expected**: `"भाषा मराठीमध्ये अपडेट केली"` (Language updated to Marathi)

---

### Test 2.3: Keep User 3 in English (verify default)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919111222333",
    "message": "LANG EN"
  }
}
```
**Expected**: `"Language updated to English"`

---

### Test 2.4: Invalid Language Code
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "LANG FR"
  }
}
```
**Expected**: `"Usage: LANG <CODE>\nAvailable: EN (English), HI (Hindi), MR (Marathi)"`
(Response will be in Hindi since user's preference is Hindi)

---

## PART 3: HINDI INPUT TESTS (User Preference: Hindi)

### Test 3.1: Hindi Input → Hindi Response
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "मदद"
  }
}
```
**Expected**: Full menu in Hindi starting with `"👨‍🌾 किसान मेनू:"`

**Server Console**: 
```
🌐 Translated from hi to en: "मदद" -> "HELP"
🌐 Translated from en to hi: "👨‍🌾 FARMER MENU:..." -> "👨‍🌾 किसान मेनू:..."
```

---

### Test 3.2: English Input → Hindi Response
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "HELP"
  }
}
```
**Expected**: Full menu in Hindi starting with `"👨‍🌾 किसान मेनू:"`

**Server Console**: 
```
🌐 Translated from en to en: "HELP" -> "HELP"
🌐 Translated from en to hi: "👨‍🌾 FARMER MENU:..." -> "👨‍🌾 किसान मेनू:..."
```

---

### Test 3.3: Marathi Input → Hindi Response
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "मदत"
  }
}
```
**Expected**: Full menu in Hindi starting with `"👨‍🌾 किसान मेनू:"`

**Server Console**: 
```
🌐 Translated from mr to en: "मदत" -> "HELP"
🌐 Translated from en to hi: "👨‍🌾 FARMER MENU:..." -> "👨‍🌾 किसान मेनू:..."
```

---

### Test 3.4: STATS Command in Hindi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "आँकड़े"
  }
}
```
**Expected**: Stats in Hindi `"📊 सिस्टम आँकड़े:"`

---

### Test 3.5: STATS Command in English (User still Hindi)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "STATS"
  }
}
```
**Expected**: Stats in Hindi `"📊 सिस्टम आँकड़े:"`

---

### Test 3.6: START Command in Hindi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "शुरू"
  }
}
```
**Expected**: Menu in Hindi `"👨‍🌾 किसान मेनू:"`

---

### Test 3.7: LOG Command in English (User Hindi)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "LOG TOMATO 50 2026-02-10"
  }
}
```
**Expected**: Response in Hindi `"पूल में जोड़ा गया : #<poolId>"`

---

### Test 3.8: REWARDS Command in Hindi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "पुरस्कार"
  }
}
```
**Expected**: Rewards status in Hindi `"🎁 बक्षीस स्थिती:"`

---

## PART 4: MARATHI INPUT TESTS (User Preference: Marathi)

### Test 4.1: Marathi Input → Marathi Response
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "मदत"
  }
}
```
**Expected**: Full menu in Marathi starting with `"👨‍🌾 शेतकरी मेनू:"`

---

### Test 4.2: English Input → Marathi Response
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "HELP"
  }
}
```
**Expected**: Full menu in Marathi starting with `"👨‍🌾 शेतकरी मेनू:"`

---

### Test 4.3: Hindi Input → Marathi Response
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "मदद"
  }
}
```
**Expected**: Full menu in Marathi starting with `"👨‍🌾 शेतकरी मेनू:"`

---

### Test 4.4: STATS in Marathi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "आकडेवारी"
  }
}
```
**Expected**: Stats in Marathi

---

### Test 4.5: STATS in English (User Marathi)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "STATS"
  }
}
```
**Expected**: Stats in Marathi

---

### Test 4.6: LOG Command in English (User Marathi)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "LOG TOMATO 100 2026-02-10"
  }
}
```
**Expected**: Response in Marathi about pool addition

---

## PART 5: ENGLISH INPUT TESTS (User Preference: English)

### Test 5.1: English Input → English Response
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919111222333",
    "message": "HELP"
  }
}
```
**Expected**: Full menu in English `"👨‍🌾 FARMER MENU:"`

---

### Test 5.2: Hindi Input → English Response
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919111222333",
    "message": "मदद"
  }
}
```
**Expected**: Full menu in English `"👨‍🌾 FARMER MENU:"`

**Server Console**: 
```
🌐 Translated from hi to en: "मदद" -> "HELP"
```

---

### Test 5.3: Marathi Input → English Response
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919111222333",
    "message": "मदत"
  }
}
```
**Expected**: Full menu in English `"👨‍🌾 FARMER MENU:"`

**Server Console**: 
```
🌐 Translated from mr to en: "मदत" -> "HELP"
```

---

### Test 5.4: STATS in English
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919111222333",
    "message": "STATS"
  }
}
```
**Expected**: Stats in English `"📊 SYSTEM STATS:"`

---

### Test 5.5: LOG Command in English
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919111222333",
    "message": "LOG TOMATO 200 2026-02-10"
  }
}
```
**Expected**: Response in English `"ADDED TO POOL : #<poolId>"`

---

## PART 6: MIXED LANGUAGE SEQUENCE (Same User)

### Test 6.1: User sends Hindi, then English, then Marathi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "मदद"
  }
}
```
**Expected**: Response in Hindi

---

```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "HELP"
  }
}
```
**Expected**: Response in Hindi (preference unchanged)

---

```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "मदत"
  }
}
```
**Expected**: Response in Hindi (preference unchanged)

---

### Test 6.2: Switch language mid-conversation
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "HELP"
  }
}
```
**Expected**: Response in Hindi

---

```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "LANG EN"
  }
}
```
**Expected**: `"Language updated to English"` (in Hindi first, then confirms)

---

```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "HELP"
  }
}
```
**Expected**: Response in English now

---

## PART 7: DRIVER MULTILINGUAL TESTS

### Test 7.1: Create Driver in MongoDB
Run in MongoDB shell or Compass:
```javascript
db.drivers.insertOne({
  name: "Suresh Patil",
  phone: "+919888777666",
  village: "PUNE",
  vehicleType: "LARGE",
  available: true,
  language: "hi"
})
```

---

### Test 7.2: Driver START in Hindi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919888777666",
    "message": "शुरू"
  }
}
```
**Expected**: Driver menu in Hindi `"👨‍✈️ ड्राइवर मेनू:"`

---

### Test 7.3: Driver START in English (Preference Hindi)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919888777666",
    "message": "START"
  }
}
```
**Expected**: Driver menu in Hindi `"👨‍✈️ ड्राइवर मेनू:"`

---

### Test 7.4: Driver ROUTES in English (Preference Hindi)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919888777666",
    "message": "ROUTES"
  }
}
```
**Expected**: Routes list in Hindi (or "No routes" in Hindi)

---

### Test 7.5: Driver Switch to English
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919888777666",
    "message": "LANG EN"
  }
}
```
**Expected**: `"Language updated to English"` (in Hindi first)

---

### Test 7.6: Driver ROUTES in English (After switch)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919888777666",
    "message": "ROUTES"
  }
}
```
**Expected**: Routes list in English

---

## PART 8: COMPLEX COMMANDS IN DIFFERENT LANGUAGES

### Test 8.1: ADDRESS Command in Hindi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919555444333",
    "message": "ADDRESS Shivaji Nagar, Pune"
  }
}
```
**Expected**: Address confirmation in user's language

---

### Test 8.2: LOG Command with Hindi User
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "LOG POTATO 75 2026-02-12"
  }
}
```
**Expected**: Pool confirmation in Hindi

---

### Test 8.3: AVAILABLE Command in Marathi User
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "AVAILABLE PUNE"
  }
}
```
**Expected**: Equipment list in Marathi

---

### Test 8.4: REWARDS Command in Hindi
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "REWARDS"
  }
}
```
**Expected**: Rewards status in Hindi

---

## PART 9: ERROR MESSAGES IN DIFFERENT LANGUAGES

### Test 9.1: Invalid Command (Hindi User)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "INVALID"
  }
}
```
**Expected**: Error message in Hindi

---

### Test 9.2: Invalid LOG Format (Hindi User)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "LOG TOMATO"
  }
}
```
**Expected**: `"Usage: LOG <Item> <Weight> <Date>"` in Hindi

---

### Test 9.3: Missing Address (Marathi User)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919123456789",
    "message": "LOG ONION 50 2026-02-10"
  }
}
```
**Expected**: `"Please set address first using ADDRESS command"` in Marathi

---

### Test 9.4: Invalid Language Code (English User)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919111222333",
    "message": "LANG XX"
  }
}
```
**Expected**: Usage message in English

---

## PART 10: VERIFICATION TESTS

### Test 10.1: Check Language Persistence
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "LANG HI"
  }
}
```
Wait 5 seconds, then:
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "HELP"
  }
}
```
**Expected**: Response still in Hindi (language persisted)

---

### Test 10.2: Multiple Users Same Time
Send these simultaneously:
```json
POST /sms/webhook
{"data":{"sender":"+919876543210","message":"HELP"}}

POST /sms/webhook
{"data":{"sender":"+919123456789","message":"HELP"}}

POST /sms/webhook
{"data":{"sender":"+919111222333","message":"HELP"}}
```
**Expected**: 
- User 1: Response in Hindi
- User 2: Response in Marathi
- User 3: Response in English

---

## PART 11: EDGE CASES

### Test 11.1: Empty Message
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": ""
  }
}
```
**Expected**: `"Invalid SMS"` error

---

### Test 11.2: Very Long Message
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "HELP HELP HELP HELP HELP HELP HELP HELP HELP HELP"
  }
}
```
**Expected**: Processes first command or error in user's language

---

### Test 11.3: Special Characters
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "HELP!!!"
  }
}
```
**Expected**: Should still work, response in Hindi

---

### Test 11.4: Mixed Script (Hindi + English)
```json
POST /sms/webhook
{
  "data": {
    "sender": "+919876543210",
    "message": "मदद HELP"
  }
}
```
**Expected**: Auto-detects and processes, response in Hindi

---

## PART 12: COMPLETE FLOW TEST

### Scenario: Farmer Journey in Hindi

**Step 1**: Register
```json
POST /sms/webhook
{"data":{"sender":"+919777666555","message":"ADDRESS Kothrud, Pune"}}
```

**Step 2**: Switch to Hindi
```json
POST /sms/webhook
{"data":{"sender":"+919777666555","message":"LANG HI"}}
```

**Step 3**: Check menu (in Hindi)
```json
POST /sms/webhook
{"data":{"sender":"+919777666555","message":"मदद"}}
```

**Step 4**: Log produce (in English, response in Hindi)
```json
POST /sms/webhook
{"data":{"sender":"+919777666555","message":"LOG TOMATO 150 2026-02-15"}}
```

**Step 5**: Check rewards (in Hindi)
```json
POST /sms/webhook
{"data":{"sender":"+919777666555","message":"पुरस्कार"}}
```

**Step 6**: Check stats (in English, response in Hindi)
```json
POST /sms/webhook
{"data":{"sender":"+919777666555","message":"STATS"}}
```

**All responses should be in Hindi!**

---

## CURL COMMANDS (For Terminal Testing)

### Quick Hindi Test
```bash
# Set to Hindi
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"data":{"sender":"+919876543210","message":"LANG HI"}}'

# Send Hindi command
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"data":{"sender":"+919876543210","message":"मदद"}}'

# Send English command (should respond in Hindi)
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"data":{"sender":"+919876543210","message":"HELP"}}'
```

---

### Quick Marathi Test
```bash
# Set to Marathi
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"data":{"sender":"+919123456789","message":"LANG MR"}}'

# Send Marathi command
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"data":{"sender":"+919123456789","message":"मदत"}}'

# Send English command (should respond in Marathi)
curl -X POST http://localhost:3000/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"data":{"sender":"+919123456789","message":"HELP"}}'
```

---

## VERIFICATION CHECKLIST

After running all tests, verify:

### Database Checks
```javascript
// Check language preferences
db.farmers.find({}, { phone: 1, language: 1 })

// Should show:
// +919876543210 → hi
// +919123456789 → mr
// +919111222333 → en
```

### Server Console Logs
Look for:
```
🌐 Translated from hi to en: "मदद" -> "HELP"
🌐 Translated from en to hi: "..." -> "..."
🌐 Translated from mr to en: "मदत" -> "HELP"
```

### Response Verification
- Hindi users: All responses contain Devanagari script (Hindi)
- Marathi users: All responses contain Devanagari script (Marathi)
- English users: All responses in Latin script

---

## EXPECTED RESULTS SUMMARY

| Test Part | Total Tests | Expected Pass |
|-----------|-------------|---------------|
| Setup     | 3           | 3             |
| Language Switch | 4     | 4             |
| Hindi Input | 8         | 8             |
| Marathi Input | 6       | 6             |
| English Input | 5       | 5             |
| Mixed Sequence | 6      | 6             |
| Driver Tests | 6        | 6             |
| Complex Commands | 4    | 4             |
| Error Messages | 4      | 4             |
| Verification | 2        | 2             |
| Edge Cases | 4          | 4             |
| Complete Flow | 6       | 6             |
| **TOTAL** | **58**     | **58** ✅     |

---

## TROUBLESHOOTING

### If translation fails:
1. Check server console for error messages
2. Verify internet connection (translation requires API)
3. Check `@vitalets/google-translate-api` is installed
4. Restart server

### If language doesn't persist:
1. Check MongoDB connection
2. Verify language field in database:
   ```javascript
   db.farmers.find({ phone: "+919876543210" })
   ```

### If auto-detection fails:
1. Check server console for detected language
2. Try with clearer text
3. Verify translation service is working

---

## SUCCESS CRITERIA

✅ All 58 tests pass  
✅ Users can send messages in any language  
✅ Responses match user's stored preference  
✅ Language switches persist across sessions  
✅ Error messages appear in user's language  
✅ Mixed language input works seamlessly  

---

**Testing Time**: ~30-45 minutes for complete suite  
**Recommended**: Run in order from Part 1 to Part 12
