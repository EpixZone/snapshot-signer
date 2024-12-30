import React, { useState } from "react";
import { Box, Button } from "@interchain-ui/react";
import styled from "styled-components";

const StyledButton = styled(Button)`
  border-color: #5954cd;
  border-radius: 50px;
  border-width: 3px;
  box-shadow: 0px 4px 4px 0px #00000040;
  border-style: solid;
  color: #5954cd;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  padding: 20px 40px;
  margin: 10px 0px;

  &:hover {
    transition: all 0.4s;
    cursor: pointer;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #8a4bdb;
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
  color: ${({ theme }) => theme.textColor || "black"};
  border-bottom: 1px solid #8a4bdb;

  tr:last-child & {
    border-bottom: none;
  }
`;

const truncateHalf = (text) => {
  if (!text || typeof text !== "string") return "";
  const halfLength = Math.ceil(text.length / 2);
  return text.slice(0, halfLength) + "...";
};

export const Claim = ({ claims, currentPage, setCurrentPage, handleCopy }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedCellIndex, setCopiedCellIndex] = useState(null);

  const handleRowCopy = async (claim, index) => {
    await handleCopy(claim);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 3000);
  };

  const handleCellCopy = async (text, cellIndex) => {
    await navigator.clipboard.writeText(text);
    setCopiedCellIndex(cellIndex);
    setTimeout(() => setCopiedCellIndex(null), 3000);
  };

  return (
    <>
      <div className="claim_wrapper">
        <div className="heading">
          <h2>Recent Claims</h2>
          <div className="gradient-line"></div>
        </div>
        <div className="table_wrapper">
          <StyledTable>
            <thead>
              <tr>
                <StyledTableHeader>x42 Address</StyledTableHeader>
                <StyledTableHeader>Epix Address</StyledTableHeader>
                <StyledTableHeader>Snapshot Balance</StyledTableHeader>
                <StyledTableHeader>Signature</StyledTableHeader>
                <StyledTableHeader>Copy JSON Message</StyledTableHeader>
              </tr>
            </thead>
            <tbody>
              {claims.length > 0 ? (
                claims.map((claim, index) => (
                  <tr key={index}>
                    <StyledTableCell>
                      <div className="copy-container">
                        {truncateHalf(claim?.raw_json?.x42_address)}
                        <div
                          className="copy_wrapper"
                          onClick={() =>
                            handleCellCopy(
                              claim?.raw_json?.x42_address,
                              `x42-${index}`
                            )
                          }
                        >
                          <img
                            src={
                              copiedCellIndex === `x42-${index}`
                                ? "/images/green.svg"
                                : "/images/copy.svg"
                            }
                            alt="copy-icon"
                          />
                        </div>
                      </div>
                    </StyledTableCell>
                    <StyledTableCell>
                      {truncateHalf(claim?.raw_json?.epix_address)}
                    </StyledTableCell>
                    <StyledTableCell>
                      {(claim?.raw_json?.snapshot_balance / 100000000).toFixed(8)}
                    </StyledTableCell>
                    <StyledTableCell>
                      <div className="copy-container">
                        {truncateHalf(claim?.signature)}
                        <div
                          className="copy_wrapper"
                          onClick={() =>
                            handleCellCopy(
                              claim?.signature,
                              `signature-${index}`
                            )
                          }
                        >
                          <img
                            src={
                              copiedCellIndex === `signature-${index}`
                                ? "/images/green.svg"
                                : "/images/copy.svg"
                            }
                            alt="copy-icon"
                          />
                        </div>
                      </div>
                    </StyledTableCell>
                    <StyledTableCell>
                      <div className="copy-container">
                        <div
                          className="copy_wrapper"
                          onClick={() => handleRowCopy(claim?.raw_json, index)}
                        >
                          {copiedIndex === index ? (
                            <img src="/images/green.svg" alt="tick-green" />
                          ) : (
                            <img src="/images/copy.svg" alt="copy-icon" />
                          )}
                        </div>
                      </div>
                    </StyledTableCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <StyledTableCell
                    style={{
                      textAlign: "center",
                      fontSize: "18px",
                      fontWeight: "600",
                    }}
                  >
                    No Data Found
                  </StyledTableCell>
                </tr>
              )}
            </tbody>
          </StyledTable>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <StyledButton
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </StyledButton>
          <StyledButton
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={claims.length < 5}
          >
            Next
          </StyledButton>
        </div>
      </div>
    </>
  );
};
