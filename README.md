# OMS Delivery Agent - Mobile (Expo)

Minimal scaffold to run the mobile demo for OMS Delivery Agent.

Setup

```bash
cd "d:/Student/HK2 2025-2026/KTKTPM_BtapNhom/OMS Delivery Agent"
npm install
npx expo start
```

Notes
- API base points to `http://localhost:8888/api/v1`. When running on a device, replace `localhost` with your machine IP.
- The example `src/api/client.ts` uses `expo-secure-store` to persist token.
- Screens: `Login` and `Orders` are minimal examples to demonstrate login and status update flows.
