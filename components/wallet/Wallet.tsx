import {
  Box,
  ClipboardCopyText,
  Stack,
  useColorModeValue,
  Button,
  Text,
} from "@interchain-ui/react";
import { WalletStatus } from "cosmos-kit";
import { useChain } from "@cosmos-kit/react";
import { getChainLogo } from "@/utils";
import { CHAIN_NAME } from "@/config";
import { User } from "./User";
import { Chain } from "./Chain";
import { Warning } from "./Warning";
import {
  ButtonConnect,
  ButtonConnected,
  ButtonConnecting,
  ButtonDisconnected,
  ButtonError,
  ButtonNotExist,
  ButtonRejected,
} from "./Connect";
import { useState, useCallback } from "react";
import axios from "axios";

export function Wallet() {
  const {
    chain,
    status,
    wallet,
    username,
    address,
    message,
    connect,
    openView,
  } = useChain(CHAIN_NAME);

  const [walletAddress, setWalletAddress] = useState("");
  const [eligibilityMessage, setEligibilityMessage] = useState("");
  const [isEligible, setIsEligible] = useState(false);
  const [claimedMessage, setClaimedMessage] = useState("");
  const [isClaimed, setIsClaimed] = useState(false);
  const [epixAddress, setEpixAddress] = useState("");
  const [snapshotBalance, setSnapshotBalance] = useState(0);
  const [step, setStep] = useState(1);
  const [resultJson, setResultJson] = useState({});
  const [signature, setSignature] = useState("");

  const ConnectButton =
    status === WalletStatus.Connected ? (
      <ButtonConnected onClick={openView} />
    ) : status === WalletStatus.Connecting ? (
      <ButtonConnecting />
    ) : status === WalletStatus.Disconnected ? (
      <ButtonDisconnected onClick={connect} />
    ) : status === WalletStatus.Error ? (
      <ButtonError onClick={openView} />
    ) : status === WalletStatus.Rejected ? (
      <ButtonRejected onClick={connect} />
    ) : status === WalletStatus.NotExist ? (
      <ButtonNotExist onClick={openView} />
    ) : (
      <ButtonConnect onClick={connect} />
    );

  const checkEligibility = useCallback(async () => {
    try {
      const response = await axios.get(
        `https://snapapi.epix.zone/verify-address?address=${walletAddress}`
      );
      const { isvalid, iswitness } = response.data;

      if (isvalid && !iswitness) {
        // Check the balance of the validated address
        const balanceResponse = await axios.post(
          "https://x42.blockcore-indexer.silknodes.io/api/query/addresses/balance",
          [walletAddress],
          {
            headers: {
              "accept": "*/*",
              "Content-Type": "application/json-patch+json",
            },
          }
        );

        if (balanceResponse.data.length > 0 && balanceResponse.data[0].balance > 0) {
          setSnapshotBalance(balanceResponse.data[0].balance);
          setEligibilityMessage("This address is eligible.");
          setIsEligible(true);
          setStep(2);
        } else {
          setEligibilityMessage("This address does not have any x42 in it, and a balance is required to proceed.");
          setIsEligible(false);
        }
      } else if (iswitness) {
        setEligibilityMessage("This address cannot be a segwit address.");
        setIsEligible(false);
      } else {
        setEligibilityMessage("This address is not valid.");
        setIsEligible(false);
      }
    } catch (error) {
      setEligibilityMessage("Error checking address eligibility. Please try again.");
      setIsEligible(false);
    }
  }, [walletAddress]);

  const handleConnect = () => {
    if (address) {
      setEpixAddress(address);
      setResultJson({ x42_address: walletAddress, epix_address: address, snapshot_balance: snapshotBalance });
      setStep(3);
    }
  };

  const validateAndClaim = async () => {
    if (!walletAddress || !epixAddress || !snapshotBalance) {
      setClaimedMessage("Required information is missing. Please complete all steps.");
      setIsClaimed(false);
      return;
    }

    const payload = {
      x42_address: walletAddress,
      epix_address: epixAddress,
      snapshot_balance: snapshotBalance,
    };

    try {
      const response = await axios.post(
        'https://snapapi.epix.zone/verify-snapshot',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'signature': signature,
          },
        }
      );
      if (response.status === 200) {
        setClaimedMessage('Snapshot verified and claimed successfully');
        setIsClaimed(true);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error during verification. Please check your signature and try again.';
      setClaimedMessage(errorMessage);
      setIsClaimed(false);
    }
  };

  const backgroundColor = useColorModeValue("#ffffff", "#1a202c");
  const boxShadow = useColorModeValue(
    "0 0 2px #dfdfdf, 0 0 6px -2px #d3d3d3",
    "0 0 2px #363636, 0 0 8px -2px #4f4f4f"
  );
  const textColor = useColorModeValue("#000000", "#ffffff");

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
        <button onClick={() => setStep(1)} disabled={step === 1}>Step 1: Eligibility</button>
        <button onClick={() => setStep(2)} disabled={!isEligible || step === 2}>Step 2: Connect Wallet</button>
        <button onClick={() => setStep(3)} disabled={!epixAddress || !isEligible || step === 3}>Step 3: Verify & Claim</button>
      </div>

      {step === 1 && (
        <Box py={8} px={4}>
          <Box my={4} width="full">
            <input
              type="text"
              placeholder="Enter x42 wallet address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
            <Button onClick={checkEligibility} style={{ marginTop: '16px' }}>
              Check Eligibility
            </Button>
            <Text color={textColor} style={{ marginTop: '8px' }}>{eligibilityMessage}</Text>
          </Box>
        </Box>
      )}

      {step === 2 && (
        <Box py={8} px={4}>
          <Stack style={{ marginBottom: '32px' }} justifyContent="center" alignItems="center">
            <Chain
              name={chain.pretty_name}
              logo={getChainLogo(chain.chain_name)!}
            />
          </Stack>
          <Stack
            direction="column"
            mx="auto"
            px={4}
            py={8}
            maxWidth="21rem"
            borderRadius="lg"
            justifyContent="center"
            alignItems="center"
            backgroundColor={backgroundColor}
            boxShadow={boxShadow}
          >
            {username ? <User name={username} /> : null}
            {address ? (
              <ClipboardCopyText text={address} truncate="middle" />
            ) : null}
            <Box
              my={4}
              flex="1"
              width="full"
              display="flex"
              height={16}
              overflow="hidden"
              justifyContent="center"
            >
              {ConnectButton}
            </Box>

            {message && [WalletStatus.Error, WalletStatus.Rejected].includes(status) ? (
              <Warning text={`${wallet?.prettyName}: ${message}`} />
            ) : null}

            {address && (
              <Button onClick={handleConnect} style={{ marginTop: '16px' }}>
                Proceed to Step 3
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {step === 3 && (
        <Box py={8} px={4}>
          <Text color={textColor} style={{ marginBottom: '16px' }}>Step 3: JSON Result</Text>
          <pre style={{ backgroundColor: backgroundColor, padding: "16px", borderRadius: "8px" }}>
            {JSON.stringify(resultJson)}
          </pre>
          <ClipboardCopyText text={JSON.stringify(resultJson)} truncate="middle" />
          <Box my={4} width="full">
            <input
              type="text"
              placeholder="Enter your signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </Box>
          <Box>
            <Button onClick={validateAndClaim} style={{ marginTop: '16px' }}>
              Validate and Claim your EPIX
            </Button>
            <pre style={{ backgroundColor: backgroundColor, padding: "16px", borderRadius: "8px" }}>
              <Text color={isClaimed ? 'green' : 'red'} style={{ marginTop: '8px' }}>{claimedMessage}</Text>
            </pre>
          </Box>
          <Text color={textColor} style={{ marginTop: '16px' }}>Follow the instructions below to sign the message:</Text>
          <Box>
            <img src="/images/Sign-With-Wallet.png" alt="Step to Sign the Message" style={{ width: '100%', marginBottom: '16px' }} />
            <img src="/images/Copy-Signature.png" alt="Step to Copy Signature" style={{ width: '100%' }} />
          </Box>
        </Box>
      )}
    </div>
  );
}
