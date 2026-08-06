import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { BASE_PATH } from "./config/env";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found");

// Strip trailing slash so react-router's basename matches Vite's base path.
const basename = BASE_PATH.replace(/\/$/, "");

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
