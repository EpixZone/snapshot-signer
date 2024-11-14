import React, { useState } from "react";
import styled from "styled-components";

const StyledTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #69e9f5;
  border-radius: 12px;
  overflow: scroll;
`;

const StyledTableHeader = styled.th`
  color: #69e9f5;
  padding: 1rem;
  text-align: left;
  font-size: 16px;
  font-weight: 400;

  &:first-child {
    border-top-left-radius: 12px;
  }

  &:last-child {
    border-top-right-radius: 12px;
  }
`;

const StyledTableCell = styled.td`
  padding: 1rem;
  color: #69e9f5;
  border-bottom: 1px solid #8a4bdb;

  tr:last-child & {
    border-bottom: none;
  }
`;

const StyledNoDataCell = styled.td`
  padding: 1rem;
  color: #ff5c5c;
  text-align: center;
  font-size: 16px;
  font-weight: 400;
`;

const truncateHalf = (text) => {
  if (!text || typeof text !== "string") return "";
  const halfLength = Math.ceil(text.length / 2);
  return text.slice(0, halfLength) + "...";
};

export const UserClaim = ({ claim, address }) => {
  const isEmptyClaim = !claim || Object.keys(claim).length === 0;
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

  return (
    <div className="claim_wrapper_2">
      <div className="table_wrapper">
        <StyledTable>
          <thead>
            <tr>
              <StyledTableHeader>x42 Address</StyledTableHeader>
              <StyledTableHeader>Epix Address</StyledTableHeader>
              <StyledTableHeader>Snapshot Balance</StyledTableHeader>
              <StyledTableHeader>Signature</StyledTableHeader>
              <StyledTableHeader>Actions</StyledTableHeader>
            </tr>
          </thead>
          <tbody>
            {isEmptyClaim ? (
              <tr>
                <StyledNoDataCell>No data found</StyledNoDataCell>
              </tr>
            ) : (
              <tr>
                <StyledTableCell>{truncateHalf(claim?.x42_address)}</StyledTableCell>
                <StyledTableCell>{truncateHalf(claim?.epix_address)}</StyledTableCell>
                <StyledTableCell>{(claim?.snapshot_balance / 100000000).toFixed(8)}</StyledTableCell>
                <StyledTableCell>{truncateHalf(address)}</StyledTableCell>
                <StyledTableCell>
                  <div className="copy-container_2">
                    <span>Copy Claim</span>
                    <div className="copy_wrapper" onClick={() => handleCopy(claim)}>
                      {!isCopied ? (
                        <img src="/images/copy.svg" alt="copy-icon" />
                      ) : (
                        <img src="/images/green.svg" alt="tick-green" />
                      )}
                    </div>
                  </div>
                </StyledTableCell>
              </tr>
            )}
          </tbody>
        </StyledTable>
      </div>
    </div>
  );
};
