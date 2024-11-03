import {
  Box,
  Stack,
  useColorModeValue,
  Button,
  Text,
  TextField,
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
import styled from "styled-components";
import { Dashboard } from "./Dashboard";
import { Claim } from "./Claim";
import { DetailsModal } from "./DetailsModal";
import { ImageModel } from "./ImageModel";
import { UserClaim } from "./UserClaim";

const StyledButton = styled(Button)`
  border-radius: 50px;
  border-width: 3px;
  box-shadow: 0px 4px 4px 0px #00000040;
  border-style: solid;
  color: #5954cd;
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  padding: 24px 0;
  width: 220px;
  z-index: 10;
  text-wrap: auto;
  position: absolute;
  top: 0;
  right: 0;
  margin-top: 6px;
  margin-right: 4px;
  background-image: linear-gradient(
    90deg,
    #b6ffb5 3.5%,
    #69e9f5 35%,
    #4ac8d2 66%,
    #31bdc6 101.97%,
    #31bdc6 101.98%,
    #8a4bdb 101.99%,
    #5954cd 102%
  );
  border-color: #8a4bdb;
  &:hover {
    transition: all 0.4s;
    cursor: pointer;
  }
  @media (max-width: 768px) {
    padding: 15px 0;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    position: inherit;
  }
`;

const StyledButton2 = styled(Button)`
  border-radius: 50px;
  border-width: 3px;
  box-shadow: 0px 4px 4px 0px #00000040;
  border-style: solid;
  color: #5954cd;
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  padding: 24px 0;
  width: 220px;
  z-index: 10;
  text-wrap: auto;
  background-image: linear-gradient(
    90deg,
    #b6ffb5 3.5%,
    #69e9f5 35%,
    #4ac8d2 66%,
    #31bdc6 101.97%,
    #31bdc6 101.98%,
    #8a4bdb 101.99%,
    #5954cd 102%
  );
  border-color: #8a4bdb;
  &:hover {
    transition: all 0.4s;
    cursor: pointer;
  }
  @media (max-width: 768px) {
    padding: 15px 0;
    font-size: 14px;
  }
`;

const StyledButton3 = styled(Button)`
  border-radius: 50px;
  border-width: 3px;
  box-shadow: 0px 4px 4px 0px #00000040;
  border-style: solid;
  color: #5954cd;
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  padding: 24px 0;
  width: 220px;
  z-index: 10;
  text-wrap: auto;
  position: absolute;
  top: 23px;
  right: 0;
  margin-top: 0px;
  margin-right: 6px;
  background-image: linear-gradient(
    90deg,
    #b6ffb5 3.5%,
    #69e9f5 35%,
    #4ac8d2 66%,
    #31bdc6 101.97%,
    #31bdc6 101.98%,
    #8a4bdb 101.99%,
    #5954cd 102%
  );
  border-color: #8a4bdb;
  &:hover {
    transition: all 0.4s;
    cursor: pointer;
  }
  @media (max-width: 768px) {
    padding: 15px 0;
    font-size: 14px;
  }
  @media (max-width: 768px) {
    position: inherit;
  }
`;

const StyledStepButton = styled(Button)`
  border-radius: 30px;
  border: 3px solid #8a4bdb;
  height: auto;
  color: #69e9f5;
  align-items: center;
  justify-content: center;
  background: ${({ disabled }) => (disabled ? "none" : "#8a4bdb")};
  position: relative;
  display: flex;
  flex-direction: column;
  width: 450px;
  height: 150px;
  margin: 2rem 0;
  box-shadow: inset 12px 16px 40px #0000001a, 10px 6px 50px -20px #00000030;

  @media (max-width: 768px) {
    height: 100px;
    width: 300px;
    margin: 1rem 0;
  }

  @media (max-width: 480px) {
    padding: 10px 20px;
    margin: 1rem 0;
  }
`;

const StyledStepTitle = styled(Text)`
  font-size: 32px;
  font-weight: 400;
  line-height: 1em;
  text-align: center;
  white-space: nowrap;
  display: inline-block;
  color: #69e9f5;
  -webkit-background-clip: text;
  background-clip: text;
  @media (max-width: 768px) {
    font-size: 26px;
  }

  @media (max-width: 480px) {
    font-size: 18px;
  }
`;

const StyledStepDesc = styled(Text)`
  font-size: 24px;
  text-align: center;
  color: #69e9f5;
  white-space: nowrap;
  margin-top: 20px;
  position: relative;
  z-index: 10;

  @media (max-width: 480px) {
    margin-top: 10px;
  }
`;

const ResponsiveBox = styled(Box)`
  display: flex;
  align-items: center;
  gap: 2rem;
  margin: 2rem 0;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0rem;
  }
`;

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
  const [isModalOpen, setModalOpen] = useState(false);
  const [isImageModalOpen, setImageModalOpen] = useState(false);

  const openImageModal = () => setImageModalOpen(true);
  const closeModal = () => setModalOpen(false);
  const closeImageModal = () => setImageModalOpen(false);

  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (link) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(link));
      setIsCopied(true);

      setTimeout(() => setIsCopied(false), 3000);
    } catch (error) {
      console.error("Failed to copy text", error);
    }
  };

  useEffect(() => {
    // Fetch total claimed and total claims
    const fetchTotalClaimed = async () => {
      try {
        const response = await axios.get(
          "https://snapapi.epix.zone/total-claimed"
        );
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
          setEligibilityMessage(
            `This address is eligible. Balance eligible for claim: ${(
              balanceResponse.data.balance / 100000000
            ).toFixed(8)}. Estimated deduction: ${
              totalClaimed / 100000000 > 23689538 / 2
                ? (balanceResponse.data.balance * 0.154).toFixed(8)
                : 0
            }`
          );
          setIsEligible(true);
        } else {
          setEligibilityMessage(
            "This address does not have any balance, and a balance is required to proceed."
          );
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
      setEligibilityMessage(
        "Error checking address eligibility. Please try again."
      );
      setIsEligible(false);
    }
  }, [walletAddress]);

  const handleConnect = () => {
    if (address) {
      setEpixAddress(address);
      setResultJson({
        x42_address: walletAddress,
        epix_address: address,
        snapshot_balance: snapshotBalance,
      });
      setStep(3);
    }
  };

  const validateAndClaim = async () => {
    if (!walletAddress || !epixAddress || !snapshotBalance) {
      setClaimedMessage(
        "Required information is missing. Please complete all steps."
      );
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
        "https://snapapi.epix.zone/verify-snapshot",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            signature: signature,
          },
        }
      );
      if (response.status === 200) {
        setClaimedMessage("Snapshot verified and claimed successfully");
        setIsClaimed(true);
      }
    } catch (error) {
      const errorMessage =
        (error as any).response?.data?.error ||
        "Error during verification. Please check your signature and try again.";
      setClaimedMessage(errorMessage);
      setIsClaimed(false);
    }
  };

  const textColor = useColorModeValue("#000000", "#ffffff");

  return (
    <>
      <div className="custom-container">
        <ResponsiveBox>
          <StyledStepButton
            onClick={() => setStep(1)}
            disabled={step === 2 || step === 3}
          >
            <StyledStepTitle>STEP 1</StyledStepTitle>
            <StyledStepDesc>Eligibility</StyledStepDesc>
          </StyledStepButton>

          <StyledStepButton
            onClick={() => setStep(2)}
            disabled={!isEligible || step === 1 || step === 3}
          >
            <StyledStepTitle>STEP 2</StyledStepTitle>
            <StyledStepDesc>Connect Wallet</StyledStepDesc>
          </StyledStepButton>

          <StyledStepButton
            onClick={() => setStep(3)}
            disabled={!epixAddress || !isEligible || step === 1 || step === 2}
          >
            <StyledStepTitle>STEP 3</StyledStepTitle>
            <StyledStepDesc>Verify & Claim</StyledStepDesc>
          </StyledStepButton>
        </ResponsiveBox>

        <div className="custom-container">
          {step === 1 && (
            <div className="step_1">
              <h1>Check Eligibility</h1>
              <Box py={8} px={8} className="box_wrapper">
                <Box display="flex" flexDirection="column" marginBottom="1rem">
                  <TextField
                    id="x42"
                    type="text"
                    placeholder="Enter x42 wallet address"
                    value={walletAddress}
                    className="wallet_input"
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                  {isEligible ? (
                    <div className="response-message">
                      <img src="/images/right.svg" alt="correct message" />
                      <span className="success_message">
                        {eligibilityMessage}
                      </span>
                    </div>
                  ) : (
                    <div className="response-message">
                      <img
                        src="/images/wrong.svg"
                        alt="correct message"
                        style={{
                          display: eligibilityMessage ? "block" : "none",
                        }}
                      />
                      <span className="error_message">
                        {eligibilityMessage}
                      </span>
                    </div>
                  )}
                </Box>
                <Box
                  display="flex"
                  justifyContent="start"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={{ mobile: "0rem", tablet: "2rem" }}
                >
                  <StyledButton onClick={checkEligibility}>
                    Check Eligibility
                  </StyledButton>
                  {isEligible && (
                    <StyledButton onClick={() => setStep(2)}>
                      Connect Wallet
                    </StyledButton>
                  )}
                </Box>
              </Box>
            </div>
          )}

          {step === 2 && (
            <Box py={8} px={8}>
              <Stack>
                <Chain
                  name={chain.pretty_name}
                  logo={getChainLogo(chain.chain_name)!}
                />
              </Stack>
              <Stack direction="vertical">
                {username ? <User name={username} /> : null}
                {address ? (
                  <div className="copy-container_1">
                    <span>Copy Claim</span>
                    <div
                      className="copy_wrapper"
                      onClick={() => handleCopy(address)}
                    >
                      {!isCopied ? (
                        <img src="/images/copy.svg" alt="copy-icon" />
                      ) : (
                        <img src="/images/green.svg" alt="tick-green" />
                      )}
                    </div>
                  </div>
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

                {message &&
                [WalletStatus.Error, WalletStatus.Rejected].includes(status) ? (
                  <Warning text={`${wallet?.prettyName}: ${message}`} />
                ) : null}

                {address && (
                  <StyledButton2 onClick={handleConnect}>
                    Proceed to Step 3
                  </StyledButton2>
                )}
              </Stack>
            </Box>
          )}

          {step === 3 && (
            <div>
              <UserClaim claim={resultJson} address={address} />
              <Box px={8} className="box_wrapper">
                <Box width="full" attributes={{ py: "$8" }}>
                  <TextField
                    id="sign"
                    type="text"
                    placeholder="Enter your signature"
                    value={signature}
                    className="wallet_input"
                    onChange={(e) => setSignature(e.target.value)}
                  />
                  {isClaimed ? (
                    <div className="response-message">
                      <img src="/images/right.svg" alt="correct message" />
                      <span className="success_message">{claimedMessage}</span>
                    </div>
                  ) : (
                    <div className="response-message">
                      <img
                        src="/images/wrong.svg"
                        alt="correct message"
                        style={{ display: claimedMessage ? "block" : "none" }}
                      />
                      <span className="error_message">{claimedMessage}</span>
                    </div>
                  )}
                </Box>
                <StyledButton3 onClick={validateAndClaim}>
                  Claim your EPIX
                </StyledButton3>
              </Box>
              <div className="signature" onClick={() => openImageModal()}>
                <span>How to add your signature?</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard for Total Claimed and Total Claims */}
      <div className="dashboard">
        <div className="custom-container">
          <DetailsModal
            isModalOpen={isModalOpen}
            closeModal={closeModal}
            textColor={textColor}
          />
          <ImageModel
            isModalOpen={isImageModalOpen}
            closeModal={closeImageModal}
          />
          {step !== 3 && (
            <>
              <Dashboard
                totalClaims={totalClaims}
                totalClaimed={totalClaimed}
              />
              <Claim
                claims={claims}
                handleCopy={handleCopy}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
