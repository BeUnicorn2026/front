import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@astryxdesign/core/theme";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "./theme/voice-partition.css";
import { voicePartitionTheme } from "./theme/voice-partition";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Theme theme={voicePartitionTheme} mode="light">
      <App />
    </Theme>
  </StrictMode>
);
