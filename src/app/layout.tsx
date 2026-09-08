import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "SnapCart | 10 min grocery delivery app",
  description: "10 min grocery delivery app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
    >
      <body className="w-full min-h-screen  bg-linear-to-b from-green-100 to-white">{children}</body>
    </html>
  );
}
