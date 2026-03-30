# IntelliGEM – AI Code Helper Extension

IntelliGEM is a Chrome extension that enhances browsing with AI-powered code assistance. It helps developers understand, explain, review, and debug code snippets on any website instantly.

## ✨ Features
* **AI Code Explanations:** Select any code snippet and get a detailed breakdown of what it does, how it works, and improvements.
* **Popup-based clean UI** for quick AI actions
* **Background scripts** for efficient processing
* **Content script** for real-time interaction with web pages
* **Fast and lightweight** (built with Webpack)

## 🛠️ Tech Stack
* JavaScript (ES6+)
* Webpack
* Babel
* Chrome Extension APIs
* Gemini AI API

## 📂 Project Structure
* `src/popup/` – UI for extension popup
* `src/background/` – Background scripts
* `src/content/` – Content scripts
* `public/manifest.json` – Extension configuration

## 🚀 Getting Started
**Install dependencies:**
```bash
npm install
```

**Run in development mode:**
```bash
npm run dev
```

**Load extension in Chrome:**
1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **"Load Unpacked"**
4. Select the project folder (or `dist` directory)

## 📦 Build
```bash
npm run build
```

## 🌐 Future Improvements
* Integrate OpenAI API option alongside Gemini
* Add user authentication to sync preferences
* Improve UI/UX with code highlighting in explanations
* Add more coding tools (e.g., refactoring suggestions, security vulnerability checks)

## 📌 Author
**Chetan Mishra**
