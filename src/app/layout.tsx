import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import { TRPCProvider } from "@/lib/trpc/provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "CourseCove",
  description: "Appointment scheduling for teaching businesses",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.variable} ${plusJakarta.variable} antialiased`}
          suppressHydrationWarning
        >
          <TRPCProvider>{children}</TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
