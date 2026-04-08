import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ObraFirmada - Firma de Documentos Laborales',
  description: 'Plataforma segura para firma de documentos laborales en construcción con enrolamiento biométrico',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
