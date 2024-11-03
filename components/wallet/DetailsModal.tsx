import React from "react";
import CustomModal from "./CustomModal";
import { Box, Text } from "@interchain-ui/react";

export const DetailsModal = ({ isModalOpen, closeModal, textColor }) => {
  return (
    <>
      <CustomModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Description"
      >
        <Box py={8} px={4}>
          <Text color={textColor}>Snapshot and Coin Circulation:</Text>
          <Text color={textColor}>
            On block 3 million, a snapshot will be taken of the total x42 coin
            supply, which will be 23,689,538. This will be the total pool from
            which both the community airdrop and the community pool allocation
            will be derived.
          </Text>
          <Text color={textColor}>Ensuring a 50/50 Balance:</Text>
          <Text color={textColor}>
            To maintain this balance, every community member who claims their
            airdrop may not receive a full 1:1 of their claimed X42:EPIX coins,
            as a small amount will be allocated back to the community pool. This
            will not be a voluntary process, but it will be automated, seamless,
            and fair. Every claimer will have the same percentage removed to
            maintain the balance.
          </Text>
          <Text color={textColor}>
            For example, if the community claims 14 million EPIX, the target is
            for the community to hold 11,844,769 coins and the community pool to
            also hold 11,844,769 coins. To achieve this, the claim portal will
            display a deduction of around 15.4% of the claimed coins from each
            community member, which will be redirected to the community pool.
          </Text>
          <Text color={textColor}>
            However, if fewer coins are claimed (e.g., 5 million), the community
            pool would hold a much larger percentage than 50%, which would
            actually benefit the community! In such cases, the deduction rate
            would be lower, or no deduction may be required at all.
          </Text>
        </Box>
      </CustomModal>
    </>
  );
};
