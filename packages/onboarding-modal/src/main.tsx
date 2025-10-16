import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../lib";
import "../lib/index.css";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Button
      modal={{
        bot: "DMe_AlertsBot",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        title: "Welcome to DMe!",
        description:
          "Get real-time DeFi alerts and notifications directly to your Telegram. Scan the QR code or click the button below to get started.",
        cta: "Open Telegram",
      }}
    >
      DMe
    </Button>
  </StrictMode>,
);
