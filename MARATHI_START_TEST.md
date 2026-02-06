# Marathi Farmer Test Flow

Use these JSON bodies in Postman (Body -> raw -> JSON).
**Endpoint**: `POST http://localhost:3000/sms/webhook`

---

### 1. Set Language to Marathi
**Send this first to tell the system you speak Marathi.**

```json
{
  "data": {
    "sender": "+919800098000",
    "message": "LANG MR"
  }
}
```

**Response**: "भाषा मराठीत अपडेट केली" (Language updated to Marathi)

---

### 2. Send "START" in Marathi
**Now send the command in Marathi.**
Word used: **"सुरुवात"** (Suruvat - means Start/Beginning)

```json
{
  "data": {
    "sender": "+919800098000",
    "message": "सुरुवात"
  }
}
```

**What happens internally**:
1. System receives "सुरुवात"
2. Gemini translates it to English: "START"
3. System processes "START" command
4. System translates the response back to Marathi

**Response (if new user)**:
"लॉगी-पूलमध्ये आपले स्वागत आहे!
तुम्ही ड्रायव्हर आहात की शेतकरी?
(नोंदणीसाठी ॲडमिनशी संपर्क साधा)

🚜 उपकरणे मालक?
नोंदणी करा <Type> <Addr> <Price> <Phone> <Name>"

---

### 3. Register Address (Optional)
**To fully register as a farmer:**

```json
{
  "data": {
    "sender": "+919800098000",
    "message": "ADDRESS Shivaji Nagar, Pune"
  }
}
```

**Response**: "पत्ता अपडेट केला..." (Address updated...)

---

### 4. Ask for Help (in Marathi)
**Test another command:** "मदत" (Help)

```json
{
  "data": {
    "sender": "+919800098000",
    "message": "मदत"
  }
}
```
