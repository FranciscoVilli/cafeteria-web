import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ProveedorCarrito } from "@/components/carrito/proveedor-carrito";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Cafetería Universitaria", template: "%s · Cafetería Universitaria" },
  description: "Pide antes y retira sin hacer fila: menú, pedidos anticipados y código de retiro.",
  applicationName: "Cafetería Universitaria",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#120d0a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${jakarta.variable} ${cormorant.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <TooltipProvider>
            <ProveedorCarrito>{children}</ProveedorCarrito>
          </TooltipProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
