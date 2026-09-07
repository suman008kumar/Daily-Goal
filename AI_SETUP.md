# Daily Goal AI setup

## Cloud vision + chat
Create a `.env.local` file in the project root and add:

```env
VITE_GEMINI_API_KEY=your_gemini_key
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_GROQ_API_KEY=your_groq_key
VITE_GROQ_MODEL=qwen/qwen3.6-27b
```

Gemini is attempted first; Groq is the fallback for both camera-frame vision and AI chat. The webcam is sampled periodically rather than uploading a continuous video stream.

## Voice
Voice input uses the browser Speech Recognition API when available. Voice read-aloud uses SpeechSynthesis, so no separate voice API key is required.

## Security
Do not commit real `VITE_*` keys. Vite exposes these values to the browser bundle. For production, proxy AI requests through a server/serverless function.

## Run
```bash
npm install
npm run dev
```


## Troubleshooting current browser errors

- React `destroy is not a function` / `useEffect must not return anything besides a function`: make sure the latest `StudyAIWidget.jsx` is installed; its effects are synchronous and cleanup-only. Restart Vite after replacing source files.
- Gemini HTTP 404: `gemini-2.5-flash` is a current stable Gemini API model, so a 404 should be treated as a model/endpoint/account-access problem rather than a fake success. Check the exact model value and Google AI API project/key.
- Groq HTTP 401: the key is rejected by Groq; replace/rotate the key rather than suppressing the error.
- Never commit `.env` or `.env.local`.
