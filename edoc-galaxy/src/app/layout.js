import "./globals.css";

export const metadata = {
  title: "edoc · Galaxy",
  description: "Pick a planet and fly there to start learning to code."
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070c20"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
