import 'dotenv/config';
import { translateToEnglish, translateToUserLang } from '../src/services/translation.service.js';

async function testTranslation() {
    console.log('🧪 Starting Translation Service Test...\n');

    // Test 1: Hindi to English
    const hindiText = 'मुझे टमाटर बेचने हैं'; // "I want to sell tomatoes"
    console.log(`INPUT (Hindi): ${hindiText}`);
    const englishTranslation = await translateToEnglish(hindiText);
    console.log(`OUTPUT (English): ${englishTranslation}\n`);

    // Test 2: Marathi to English
    const marathiText = 'माझा ट्रॅक्टर उपलब्ध आहे'; // "My tractor is available"
    console.log(`INPUT (Marathi): ${marathiText}`);
    const englishTranslation2 = await translateToEnglish(marathiText);
    console.log(`OUTPUT (English): ${englishTranslation2}\n`);

    // Test 3: English to Hindi
    const englishText = 'Registration Complete! Send START to view menu.';
    console.log(`INPUT (English): ${englishText}`);
    const hindiResponse = await translateToUserLang(englishText, 'hi');
    console.log(`OUTPUT (Hindi): ${hindiResponse}\n`);

    // Test 4: English to Marathi
    console.log(`INPUT (English): ${englishText}`);
    const marathiResponse = await translateToUserLang(englishText, 'mr');
    console.log(`OUTPUT (Marathi): ${marathiResponse}\n`);

    console.log('✅ Test Complete');
    process.exit(0);
}

testTranslation();
