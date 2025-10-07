import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../lib";
import "../lib/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Button
      modal={{
        bot: "some-bot",
        address: "some-address",
      }}
    >
      DMe
    </Button>
  </StrictMode>,
);
