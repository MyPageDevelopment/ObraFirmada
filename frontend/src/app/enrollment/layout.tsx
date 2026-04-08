import type { Metadata } from 'next';
import './layout.css';

export const metadata: Metadata = {
  title: 'Enrolamiento - ObraFirmada',
  description: 'Plataforma de firma de documentos laborales con enrolamiento biométrico',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
