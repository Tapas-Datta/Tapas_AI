# TD_AI

A dark, terminal-inspired AI chat app with conversation history stored in your browser, per-chat delete controls, automatic response language matching, and a small Node server that keeps your Groq API key out of client-side code.

## Requirements

- Node.js 18 or later
- A Groq API key

## Run locally

1. Open Terminal and move into this folder:
   ```sh
   cd ~/Downloads/TD_Ai
   ```
2. Set your API key in that Terminal window:
   ```sh
   export GROQ_API_KEY="your-groq-api-key"
   ```
3. Start the app:
   ```sh
   npm start
   ```
4. Visit [http://127.0.0.1:3000](http://127.0.0.1:3000).

To use a different model, set `GROQ_MODEL` before starting the server. You can also put `GROQ_API_KEY=...` in a local `.env` file; `.env` is excluded from version control and is never served to the browser.

The API key is read only by `server.mjs`. Chat history is stored locally in the browser, can be deleted one session at a time or cleared from the sidebar, and responses follow the language of each message. The app calls Groq's OpenAI-compatible chat completions API.

## Deploy to Render

The included `render.yaml` defines a Node web service named `tapas-ai-model` on Render's free plan. Connect this project from a Git repository, create the Blueprint, and provide `GROQ_API_KEY` when Render prompts for the secret. The key is not included in the repository. Render assigns a public `onrender.com` URL after the first deploy; a custom domain can be attached separately.
