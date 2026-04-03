import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CatalogProvider } from "@/contexts/CatalogContext";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CartProvider } from "@/contexts/CartContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <FavoritesProvider>
            <CartProvider>
              <PlatformProvider>
                <App />
              </PlatformProvider>
            </CartProvider>
          </FavoritesProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
