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
import { useState, useCallback, useEffect } from "react";
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
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [totalClaims, setTotalClaims] = useState(0);
  const [claims, setClaims] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Fetch total claimed and total claims
    const fetchTotalClaimed = async () => {
      try {
        const response = await axios.get("https://snapapi.epix.zone/total-claimed");
        setTotalClaimed(response.data.total_claimed);
        setTotalClaims(response.data.total_claims);
      } catch (error) {
        console.error("Error fetching total claimed data", error);
      }
    };

    fetchTotalClaimed();
  }, []);

  useEffect(() => {
    // Fetch claims for the current page
    const fetchClaims = async () => {
      try {
        const response = await axios.get(
          `https://snapapi.epix.zone/claims?page=${currentPage}&pageSize=5`
        );
        setClaims(response.data);
      } catch (error) {
        console.error("Error fetching claims data", error);
      }
    };

    fetchClaims();
  }, [currentPage]);

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
        const balanceResponse = await axios.get(
          `https://snapapi.epix.zone/check-balance?address=${walletAddress}`
        );

        if (balanceResponse.data.balance > 0) {
          setSnapshotBalance(balanceResponse.data.balance);
          setEligibilityMessage(`This address is eligible. Balance eligible for claim: ${(balanceResponse.data.balance / 100000000).toFixed(8)}. Estimated deduction: ${(totalClaimed / 100000000 > 23689538 / 2) ? ((balanceResponse.data.balance * 0.154).toFixed(8)) : 0}`);
          setIsEligible(true);
        } else {
          setEligibilityMessage("This address does not have any balance, and a balance is required to proceed.");
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
      const errorMessage = (error as any).response?.data?.error || 'Error during verification. Please check your signature and try again.';
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
            <Button onClick={checkEligibility}>
              Check Eligibility
            </Button>
            <Text color={textColor}>{eligibilityMessage}</Text>
            {isEligible && (
              <Button onClick={() => setStep(2)}>
                Connect Wallet to Proceed to Step 2
              </Button>
            )}
          </Box>
        </Box>
      )}

      {step === 2 && (
        <Box py={8} px={4}>
          <Stack>
            <Chain
              name={chain.pretty_name}
              logo={getChainLogo(chain.chain_name)!}
            />
          </Stack>
          <Stack direction="vertical">
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
              <Button onClick={handleConnect}>
                Proceed to Step 3
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {step === 3 && (
        <Box py={8} px={4}>
          <Text color={textColor}>Step 3: JSON Result</Text>
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
            <Button onClick={validateAndClaim}>
              Validate and Claim your EPIX
            </Button>
            <pre style={{ backgroundColor: backgroundColor, padding: "16px", borderRadius: "8px" }}>
              <Text color={isClaimed ? 'green' : 'red'}>{claimedMessage}</Text>
            </pre>
          </Box>
          <Text color={textColor}>Follow the instructions below to sign the message:</Text>
          <Box>
            <img src="/snapshot-signer/images/Sign-With-Wallet.png" alt="Step to Sign the Message" style={{ width: '100%', marginBottom: '16px' }} />
            <img src="/snapshot-signer/images/Copy-Signature.png" alt="Step to Copy Signature" style={{ width: '100%' }} />
          </Box>
        </Box>
      )}

      {/* Dashboard for Total Claimed and Total Claims */}
      <Box py={8} px={4}>
        <Text color={textColor}>Snapshot and Coin Circulation:</Text>
        <Text color={textColor}>On block 3 million, a snapshot will be taken of the total x42 coin supply, which will be 23,689,538. This will be the total pool from which both the community airdrop and the community pool allocation will be derived.</Text>
        <Text color={textColor} >Ensuring a 50/50 Balance:</Text>
        <Text color={textColor}>To maintain this balance, every community member who claims their airdrop may not receive a full 1:1 of their claimed X42:EPIX coins, as a small amount will be allocated back to the community pool. This will not be a voluntary process, but it will be automated, seamless, and fair. Every claimer will have the same percentage removed to maintain the balance.</Text>
        <Text color={textColor}>For example, if the community claims 14 million EPIX, the target is for the community to hold 11,844,769 coins and the community pool to also hold 11,844,769 coins. To achieve this, the claim portal will display a deduction of around 15.4% of the claimed coins from each community member, which will be redirected to the community pool.</Text>
        <Text color={textColor}>However, if fewer coins are claimed (e.g., 5 million), the community pool would hold a much larger percentage than 50%, which would actually benefit the community! In such cases, the deduction rate would be lower, or no deduction may be required at all.</Text>
      </Box>
      <hr />
      <Box py={8} px={4}>
        <Text color={textColor}>Dashboard</Text>
        <Text color={textColor}>Total Claimed: {(totalClaimed / 100000000).toFixed(8)}</Text>
        <Text color={textColor}>Total Claims: {totalClaims}</Text>
        <Text color={textColor}>Time Remaining to Claim the Airdrop: {(() => { const remainingTime = Math.max(0, new Date('2025-02-01T00:00:00Z').getTime() - Date.now()); const months = Math.floor(remainingTime / (1000 * 60 * 60 * 24 * 30)); const days = Math.floor((remainingTime % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)); const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60)); return `${months} months, ${days} days, ${hours} hours, ${minutes} minutes`; })()}</Text>
        <Text color={textColor}>Remaining EPIX Tokens Available: {(23689538 - (totalClaimed / 100000000)).toFixed(8)}</Text>
        <Text color={textColor}>Deduction Percentage: {(() => { const claimed = totalClaimed / 100000000; const targetBalance = 23689538 / 2; return claimed > targetBalance ? ((claimed - targetBalance) / claimed * 100).toFixed(2) : 0; })()}%</Text>
        <Text color={textColor}>Community Pool vs Treasury Balance: {(() => { const claimed = totalClaimed / 100000000; const treasury = 23689538 - claimed; return `Community: ${(claimed).toFixed(8)}, Treasury: ${(treasury).toFixed(8)}`; })()}</Text>
      </Box>
      <hr />
      {/* Paginated List of Last 5 Claims */}
      <Box py={8} px={4}>
        <Text color={textColor}>Last 5 Claims</Text>
        {claims.map((claim: { raw_json: any, signature: string }, index) => (
          <Box key={index}>
            <Text color={textColor}>Raw JSON:</Text>
            <pre style={{ backgroundColor: backgroundColor, padding: '8px', borderRadius: '4px' }}>
              {JSON.stringify(claim.raw_json)}
            </pre>
            <Text color={textColor}>Signature: {claim.signature}</Text>
          </Box>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          <Button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
            Previous
          </Button>
          <Button onClick={() => setCurrentPage(currentPage + 1)} disabled={claims.length < 5}>
            Next
          </Button>
        </div>
      </Box>
    </div>
  );
}
