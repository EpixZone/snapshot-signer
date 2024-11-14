import Head from "next/head";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>Epix Claimer</title>
        <meta name="description" content="Claim your Epix Airdrop" />
        <link
          rel="icon"
          href="https://epix.zone/wp-content/uploads/2024/09/favicon.png"
        />
      </Head>
      <Header />
      {children}
      <Footer />
    </>
  );
}
