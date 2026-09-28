import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import "bootstrap/dist/css/bootstrap.min.css";
import "./assets/cyberpunk-glow.css"
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "./config/wagmi";

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
<BrowserRouter>
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
</BrowserRouter>
)
