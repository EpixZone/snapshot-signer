import React from "react";
import CustomModal from "./CustomModal";
import { Box } from "@interchain-ui/react";

export const ImageModel = ({ isModalOpen, closeModal }) => {
  return (
    <>
      <CustomModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Description"
      >
        <Box py={8} px={4} class="image_modal">
            <img src="/images/Copy-Signature.png" alt="claims" width="460" height="300" decoding="async" fetchPriority="low" />
            <img src="/images/Sign-With-Wallet.png" alt="claims" width="460" height="300" decoding="async" fetchPriority="low" />
        </Box>
      </CustomModal>
    </>
  );
};
