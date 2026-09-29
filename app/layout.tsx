import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChronoMeter · Painel Inteligente de Agendamento de Leituras",
  description: "Automação de faturas Sabesp/Comgás com aplicação rigorosa de regras de finais de semana e feriados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased font-sans selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
