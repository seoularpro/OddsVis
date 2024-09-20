import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { ThemeProvider } from "./ThemeProvider";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
