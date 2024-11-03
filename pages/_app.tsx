import "../styles/globals.css";
import "../styles/modal.css";
import "@interchain-ui/react/styles";

import type { AppProps } from "next/app";
import { SignerOptions, wallets } from "cosmos-kit";
import { ChainProvider } from "@cosmos-kit/react";
import { assets, chains } from "chain-registry";
import {
  Box,
  ThemeProvider,
  useColorModeValue,
  useTheme,
} from "@interchain-ui/react";
import styled from "styled-components";

const StyledBox = styled(Box)`
  background-image: linear-gradient(75.53deg, #5954cd 8.61%, #2d2a67 94.17%);
  position: relative;
`;

function CreateCosmosApp({ Component, pageProps }: AppProps) {
  const { themeClass } = useTheme();

  const signerOptions: SignerOptions = {
    // signingStargate: () => {
    //   return getSigningCosmosClientOptions();
    // }
  };

  return (
    <ThemeProvider>
      <ChainProvider
        chains={chains as unknown as (string)[]}
        assetLists={assets}
        wallets={wallets}
        walletConnectOptions={{
          signClient: {
            projectId: "a8510432ebb71e6948cfd6cde54b70f7",
            relayUrl: "wss://relay.walletconnect.org",
            metadata: {
              name: "Cosmos Kit dApp",
              description: "Cosmos Kit dApp built by Create Cosmos App",
              url: "https://docs.cosmology.zone/cosmos-kit/",
              icons: [],
            },
          },
        }}
        // @ts-ignore
        signerOptions={signerOptions}
      >
        <StyledBox
          className={themeClass}
          minHeight="100dvh"
          backgroundColor={useColorModeValue("$white", "$background")}
        >
          {/* TODO fix type error */}
          {/* @ts-ignore */}
          <Component {...pageProps} />
        </StyledBox>
      </ChainProvider>
    </ThemeProvider>
  );
}

export default CreateCosmosApp;
