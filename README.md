# React + TypeScript + Vite + shadcn/ui

This is a template for a new Vite project with React, TypeScript, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## ARCA backend

Run the Express backend in a second terminal:

```bash
npm run server:dev
```

Emit a test invoice:

```bash
curl -X POST http://localhost:3001/api/invoices/emit \
  -H "Content-Type: application/json" \
  -d "{\"amount\":1000,\"description\":\"Servicios profesionales\",\"invoiceType\":\"C\"}"
```

The backend defaults to homologacion and reads the certificate/key from the parent
folder. For Factura E, configure `ARCA_EXPORT_DST_CMP` and the export point of sale
in `.env.local` before calling the endpoint.
