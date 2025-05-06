import { Text, useColorModeValue, Button } from "@interchain-ui/react";
import { Logo } from "./Logo";
import styled from "styled-components";
import { DetailsModal } from "../wallet/DetailsModal";
import { useState } from "react";
import { useRouter } from 'next/router';

const StyledText = styled(Button)`
  border-radius: 50px;
  box-shadow: 0px 4px 4px 0px #00000040;
  z-index: 10;
  background-color: transparent;
  border: 3px solid #69e9f5;
  color: #69e9f5;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  padding: 16px 0;
  &:hover {
    transition: all 0.4s;
    cursor: pointer;
  }

  @media (max-width: 768px) {
    padding: 13px 0;
  }
`;

export const Navbar = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const showX42Interface = !!router.query.x42;

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);
  const textColor = useColorModeValue("#fff", "#ffffff");
  return (
    <>
      <div className="navbar">
        <div className="icon_Wrapper">
          <Logo />
          <Text
            as="span"
            fontSize={{ mobile: "$xl", tablet: "$2xl" }}
            lineHeight={{ mobile: "0.8", tablet: "1" }}
            textAlign="center"
            color="#69e9f5"
          >
            {showX42Interface ? "Snapshot Claimer!" : "Vesting"}
          </Text>
        </div>
        <div className="epix_wrapper">
          {showX42Interface && (
            <h3 className="modal-text" onClick={openModal}>
              About Claimer
            </h3>
          )}
          <StyledText as="a" href="https://epix.zone/" target="_blank">
            <div className="global_wrapper">
              <img src="/images/global.svg" alt="global earth icon" />
              <span>Visit Epix.zone</span>
            </div>
          </StyledText>
        </div>
      </div>

      <DetailsModal
        isModalOpen={isModalOpen}
        closeModal={closeModal}
        textColor={textColor}
      />
    </>
  );
};
