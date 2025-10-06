import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../lib";
import "../lib/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Button
      text="DMe"
      modal={{
        bot: "some-bot",
        address: "some-address",
      }}
    />
  </StrictMode>
);
