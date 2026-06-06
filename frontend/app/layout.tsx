import type { Metadata } from "next";
import { AuthProvider } from "./AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chapter1 — Learn From Your Textbook",
  description:
    "Adaptive AI tutor for engineering students. Structured explanations, interactive visuals, and progressive quizzes grounded in your textbook.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-neo-bg text-black antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}