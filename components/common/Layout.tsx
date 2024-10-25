import Head from "next/head";
import { Container } from "@interchain-ui/react";
import { Header } from "./Header";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Container maxWidth="64rem" attributes={{ py: "$20" }}>
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
    </Container>
  );
}
