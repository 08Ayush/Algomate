"""Script to replace emoji characters in Python files for Windows console compatibility."""

import re

# File to process
file_path = r'd:\COMP\academic_campass_2025\services\scheduler\nep_scheduler.py'

# Emoji replacements
emoji_map = {
    '\U0001F4E5': '[FETCH]',  # 📥
    '\u26A0\uFE0F': '[WARN]',  # ⚠️
    '\U00002705': '[OK]',     # ✅
    '\U0000274C': '[ERROR]',  # ❌
    '\U0001F527': '[BUILD]',  # 🔧
    '\u2139\uFE0F': '[INFO]', # ℹ️
    '\U0001F512': '[LOCK]',   # 🔒
    '\u2713': '[v]',          # ✓
    '\U0001F4DA': '[BOOK]',   # 📚
    '\U0001F393': '[GRAD]',   # 🎓
    '\U0001F4BE': '[SAVE]',   # 💾
    '\U0001F680': '[START]',  # 🚀
    '\u23F3': '[WAIT]',       # ⏳
    '\U0001F331': '[SEED]',   # 🌱
    '\U0001F4E6': '[PACK]',   # 📦
}

# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace each emoji
for emoji, replacement in emoji_map.items():
    content = content.replace(emoji, replacement)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Processed {file_path}")
print("Emoji replacement complete!")
