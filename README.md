# FlashChat AI 🤖💬

**FlashChat AI** is a free chatbot built with [Next.js](https://nextjs.org) and powered by Google's Gemini AI models. Chat locally, save conversations, and enjoy a fast, lightweight AI assistant right in your browser.  

> ⚠️ **Note:** Chats are stored locally but are not entirely private. Google may use prompts from interactions for data purposes.

---

## Features ✨

- Real-time AI chat powered by Gemini models:
  - `gemini-3-flash-preview`
  - `gemini-2.5-flash`
  - `gemini-2.5-flash-lite`
  - `Gemma-3-27b`
- Local chat storage for convenience
- Built with **Next.js** for modern web performance
- Lightweight and easy to use

---

## Tech Stack 🛠️

- **Frontend & Backend:** Next.js  
- **AI:** Google Gemini models  
- **Styling:** Tailwind CSS (optional)  
- **Storage:** Local browser storage  

---

# Getting Started 🚀
## Clone the repository

```bash
git clone https://github.com/Cacton12/flashchat-ai.git
cd flashchat-ai
```

---

## Install dependencies:
**Copy code**
```
npm install
# or
yarn install
# or
pnpm install
```

---

## Create a .env file in the root directory and add your Google Gemini API key:
**Copy code**
```
GEMINI_API_KEY=YOUR_API_KEY_HERE
```
You can get your API key by signing in to Google AI Studio and creating a new key.
[here](https://aistudio.google.com/)

---

## Run the development server
**Copy code**
```
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
Open [http://localhost:3000](http://localhost:3000)  in your browser to start chatting.
---

# Learn More 📚
 * Next.js Documentation – learn about Next.js features and API
 * Learn Next.js – interactive Next.js tutorial
 * Google AI Studio – create your Gemini API key

---

# Deployment on Vercel 🌐
The easiest way to deploy FlashChat AI is using Vercel:
 1. Connect your GitHub repository to Vercel
 2. Add your GEMINI_API_KEY as an environment variable
 3. Deploy and start chatting!

Check out the Next.js deployment documentation for more details.

---

# License 📝
This project is licensed under the MIT License.
