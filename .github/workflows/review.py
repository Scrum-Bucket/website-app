import json, os, sys, urllib.request

with open('diff.txt') as f:
    diff = f.read()

if not diff.strip():
    print("No diff to review.")
    sys.exit(0)

payload = json.dumps({
    "contents": [{"parts": [{"text": "Review this code diff:\n\n" + diff}]}]
}).encode()

api_key = os.environ['GEMINI_API_KEY']
req = urllib.request.Request(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + api_key,
    data=payload,
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    data = json.load(resp)

comment = data['candidates'][0]['content']['parts'][0]['text']
with open('comment.txt', 'w') as f:
    f.write(comment)