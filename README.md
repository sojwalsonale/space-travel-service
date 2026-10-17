# Space travel service

A prototype for an imaginary GOV.UK service, built with the [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/) and the [GOV.UK Design System](https://design-system.service.gov.uk/).

Created for the Mercator Digital Interaction Designer pre-interview exercise.

## What the prototype does

1. **Start page** for the 'Space travel service'
2. **Destination choice** – the user chooses between the Moon and Mars (branching)
3. **Name and address** – collected from the user
4. **Check your answers** – a summary page showing the chosen destination and the details entered (data passing)

## Running locally

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deployment

Hosted on [Render](https://render.com/) as a Node web service:

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Environment variables:** `NODE_ENV=production`, `PASSWORD=<prototype password>`
