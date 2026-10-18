# PuneBus Saathi

A bus assistant for Pune's PMPML network that you can talk to in **English, Hindi or Marathi**. Tell it where you are and where you want to go, and it explains the route in simple words: which bus, where to get on, where to get off, where to switch.

Built for the **DevFest Pune challenge**.

**Live demo:** https://punebus-saathi-987112806921.asia-southeast1.run.app/

---

## The problem

Pune has a huge bus network, but it is hard to use. Timings are unreliable, stop names are inconsistent, and nobody explains transfers clearly. Most apps are English only.

So students, newcomers, daily wage workers and elderly people end up asking strangers or just taking an auto. That means more money spent, more traffic, and fewer people using public transport.

## Who it helps

- College students
- People new to Pune
- Workers who depend on buses every day
- Senior citizens
- Anyone more comfortable in Marathi or Hindi than English

## What it does

**Core**
- Type or speak your trip, for example: *"mala Swargate la jaycha ahe, Kothrud madhun"*
- Finds the best route, including bus changes, using graph search over stops and routes
- Explains the route step by step in the language you asked in
- Shows next bus time and an estimated delay
- Crowd reports: tap "I'm on this bus" to help others, with a confidence level so fake reports count for less
- Low-data mode for weak networks
- Language switcher (English, Hindi, Marathi) and voice input

**Extra features**
- **Bus board scanner:** take a photo of a bus board and Gemini vision reads the route number and destination, then tells you if that bus goes where you want. If the photo is blurry it asks for a clearer one instead of guessing.
- **Landmark search:** type places people actually know, like "near Fergusson College" or "opposite Phoenix Mall". It finds the nearest bus stop and the walking time, and handles spelling mistakes.
- **Safety mode:** trusted contacts, share-my-trip on WhatsApp, an SOS button with a countdown so it can't be triggered by accident, and a "get off at the next stop" alert. Contacts are saved on your phone only.

## Important: the data is simulated

The routes, stops, timings and delays in this demo come from a **mock dataset** (about 30 stops and a handful of routes) that I made to represent real Pune routes. It is **not live PMPML data**.

The data lives in separate JSON files, so it can be swapped for real GTFS data without changing the app logic:

```
src/data/pune_stops.json
src/data/pune_routes.json
src/data/landmarks.json
```

## How it's built

- **Frontend:** React + TypeScript, built with Vite
- **Backend:** Node + Express (`server.ts`)
- **AI:** Google Gemini through the `@google/genai` SDK, called **only from the server** so the API key never reaches the browser
- **Hosting:** Google Cloud Run

The server has these endpoints:

| Endpoint | What it does |
| --- | --- |
| `POST /api/gemini/parse-query` | Understands a typed or spoken query and finds the start and end stops |
| `POST /api/gemini/explain-route` | Explains a route in simple words in the chosen language |
| `POST /api/gemini/scan-bus-board` | Reads a bus board photo with Gemini vision |
| `POST /api/gemini/guess-landmark` | Matches a landmark or a misspelled place to the nearest stop |

If Gemini is unavailable or the quota runs out, parsing, explanations and landmark search fall back to a local rule-based engine so the app keeps working.

## Run it locally

You need Node.js 18 or newer.

```bash
git clone https://github.com/itsZainab-AI/PUNE_BUS_SAATHI.git
cd PUNE_BUS_SAATHI
npm install
cp .env.example .env
```

Open `.env` and add your own Gemini API key (get one free from [Google AI Studio](https://aistudio.google.com/)):

```
GEMINI_API_KEY=your_key_here
```

Then start the app:

```bash
npm run dev
```

It runs on http://localhost:3000. Without an API key the app still starts, but it uses the local fallback instead of Gemini.

Never commit your `.env` file. It is already in `.gitignore`.

## Limitations

- Bus data is simulated, as explained above
- Live bus positions depend on crowd reports, so accuracy depends on how many people report
- The bus scanner works best with clear, well-lit photos of the front board
- Gemini has daily quota limits on the free tier

## What's next

- Plug in real PMPML GTFS data
- Better delay prediction from real reports
- Offline mode and saved favourite routes
- Fare estimate and WhatsApp route sharing

## Built by

Zainab Shaikh ([@itsZainab-AI](https://github.com/itsZainab-AI))
