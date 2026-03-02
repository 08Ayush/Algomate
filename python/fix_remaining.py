"""
Fix remaining createClient / supabaseClient in specific files.
"""
import os, re

files = [
    r'f:\Timetable scheduler (SIH)\UI update\academic_campass_2025\src\app\api\notifications\route.ts',
    r'f:\Timetable scheduler (SIH)\UI update\academic_campass_2025\src\app\api\student\selections\route.ts',
    r'f:\Timetable scheduler (SIH)\UI update\academic_campass_2025\src\app\api\student\timetable-classes\route.ts',
    r'f:\Timetable scheduler (SIH)\UI update\academic_campass_2025\src\app\api\timetables\route.ts',
    r'f:\Timetable scheduler (SIH)\UI update\academic_campass_2025\src\lib\notificationService.ts',
    r'f:\Timetable scheduler (SIH)\UI update\academic_campass_2025\src\modules\timetable\application\use-cases\CreateManualTimetableUseCase.ts',
    r'f:\Timetable scheduler (SIH)\UI update\academic_campass_2025\src\shared\health\HealthChecker.ts',
]


def strip_create_client_blocks(content: str) -> str:
    """Remove const x = createClient(...) blocks handling nested parens."""
    result = []
    i = 0
    while i < len(content):
        m = re.search(r'(?:\/\/[^\n]*\n)?(?:const|let|var)\s+\w+\s*=\s*createClient(?:<[^>]+>)?\s*\(', content[i:])
        if not m:
            result.append(content[i:])
            break
        abs_start = i + m.start()
        # Don't match createNeonClient
        if abs_start > 0 and content[abs_start - 1].isalpha():
            result.append(content[i: i + m.end()])
            i += m.end()
            continue
        result.append(content[i: abs_start])
        depth = 1
        j = i + m.end()
        while j < len(content) and depth > 0:
            if content[j] == '(':
                depth += 1
            elif content[j] == ')':
                depth -= 1
            j += 1
        # Skip ; and newlines
        while j < len(content) and content[j] in ' \t;':
            j += 1
        if j < len(content) and content[j] == '\n':
            j += 1
        i = j
    return ''.join(result)


def fix_file(path: str) -> bool:
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        original = f.read()

    content = original

    # Remove @supabase imports
    content = re.sub(r"^import\s+.*?from\s+'@supabase/[^']*';\s*\n?", '', content, flags=re.MULTILINE)
    content = re.sub(r'^import\s+.*?from\s+"@supabase/[^"]*";\s*\n?', '', content, flags=re.MULTILINE)

    # Remove env var declarations for supabase
    content = re.sub(r'^const\s+\w+(?:Url|Key|ServiceKey|ServiceRole|AnonKey)\s*=\s*process\.env\.\w+!?;\s*\n?', '', content, flags=re.MULTILINE | re.IGNORECASE)

    # Remove createClient blocks
    content = strip_create_client_blocks(content)

    # Fix variable names
    content = content.replace('supabaseClient', 'supabase')
    content = content.replace('supabaseAdmin', 'supabase')

    if content == original:
        return False

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return True


for path in files:
    try:
        changed = fix_file(path)
        print('Fixed:' if changed else 'No change:', os.path.basename(path))
    except Exception as e:
        print('ERROR:', path, e)
