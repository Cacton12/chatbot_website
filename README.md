# FlashChat AI

**FlashChat AI** is a free chatbot built with [Next.js](https://nextjs.org) and powered by Google's Gemini AI models. Chat locally, save conversations, and experience an AI assistant right in your browser.  

> ⚠️ Note: Chats are stored locally but are not entirely private. Google may use prompts from interactions for data purposes.

## Getting Started

First, clone the repository and install dependencies:

git clone https://github.com/Cacton12/flashchat-ai.git
cd flashchat-ai
npm install
# or
yarn install
# or
pnpm install

Next, create a .env file in the root of the project and add your Google Gemini API key:

GEMINI_API_KEY=YOUR_API_KEY_HERE

Then, run the development server:

npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev

Open http://localhost:3000
 in your browser to see FlashChat AI in action. You can start editing the page by modifying app/page.js—the page will auto-update as you edit.

Features
- Real-time AI chat powered by Gemini models:
- gemini-3-flash-preview
- gemini-2.5-flash
- gemini-2.5-flash-lite
- Gemma-3-27b
- Local chat storage
- Built with Next.js for modern web performance
- Lightweight and easy to use

Learn More
To learn more about Next.js and the tech behind FlashChat AI, check out:

Next.js Documentation
 - learn about Next.js features and API

Learn Next.js
 - an interactive Next.js tutorial

Google AI Studio
 - create your Gemini API key


Deploy on Vercel
The easiest way to deploy FlashChat AI is on the Vercel Platform
 from the creators of Next.js:

Connect your GitHub repository to Vercel

Add your GEMINI_API_KEY as an environment variable

Deploy and start chatting!

Check out the Next.js deployment documentation
 for more details.

License
This project is licensed under the MIT License.
