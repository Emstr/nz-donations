import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nz-donations.vercel.app"),
  title: {
    default: "Big money in New Zealand elections",
    template: "%s · NZ donations over $20,000",
  },
  description:
    "Every political donation over $20,000 declared to the New Zealand Electoral Commission, with a researched profile of each donor.",
  openGraph: {
    title: "Big money in New Zealand elections",
    description:
      "Every political donation over $20,000 declared to the Electoral Commission, with a researched profile of each donor.",
    type: "website",
  },
};

function Nav() {
  return (
    <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px]">
      <Link href="/" className="font-semibold">
        Big money
      </Link>
      <Link href="/donors" className="text-ink-2 hover:text-ink">
        Donors
      </Link>
      <Link href="/parties" className="text-ink-2 hover:text-ink">
        Parties
      </Link>
      <Link href="/method" className="text-ink-2 hover:text-ink">
        Method
      </Link>
    </nav>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-NZ"
      className={`${archivo.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-hair">
          <div className="mx-auto w-full max-w-5xl px-5 py-4">
            <Nav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5">{children}</main>
        <footer className="mt-20 border-t border-hair">
          <div className="mx-auto w-full max-w-5xl px-5 py-8 text-[12.5px] text-ink-3">
            Source: Electoral Commission register of donations exceeding
            $20,000. Donor street addresses published by the Commission are not
            reproduced here. Read the{" "}
            <Link href="/method" className="underline underline-offset-2">
              method and editorial policy
            </Link>
            .
          </div>
        </footer>
      </body>
    </html>
  );
}
