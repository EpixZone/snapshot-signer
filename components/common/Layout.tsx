import Head from "next/head";
import { Container } from "@interchain-ui/react";
import { Header } from "./Header";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Container maxWidth="64rem" attributes={{ py: "$14" }}>
      <Head>
        <title>Epix Claimer</title>
        <meta name="description" content="Claim your Epix Airdrop" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      {children}
    </Container>
  );
}
