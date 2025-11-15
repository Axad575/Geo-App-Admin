import "./globals.css";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";

export const metadata = {
  title: "Geo-Note-Admin",
  description: "GeoNote is a modern, full-stack web application designed for efficient team collaboration, meeting management, and personal note-taking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
      </head>
      <body>
        <SubscriptionProvider>
          {children}
        </SubscriptionProvider>
      </body>
    </html>
  );
}
