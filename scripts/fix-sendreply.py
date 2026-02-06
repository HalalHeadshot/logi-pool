#!/usr/bin/env python3
import re

# Read the file
with open('src/controllers/sms.controller.js', 'r') as f:
    content = f.read()

# Pattern to match sendReply calls that end with ", res)" or ", res\n"
# This will match multi-line sendReply calls
pattern = r'(sendReply\(phone,[\s\S]*?),\s*res\s*\)'

# Replace with userLanguage parameter
replacement = r'\1, res, userLanguage)'

# Apply the replacement
new_content = re.sub(pattern, replacement, content)

# Write back
with open('src/controllers/sms.controller.js', 'w') as f:
    f.write(new_content)

print("Updated all sendReply calls")
