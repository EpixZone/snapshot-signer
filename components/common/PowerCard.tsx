import { Text } from "@interchain-ui/react";
import styled from "styled-components";

const StyledStepTitle = styled(Text)`
  font-size: 24px;
  font-weight: 400;
  line-height: 1em;
  text-align: left;
  line-height: 1.5em;
  white-space: nowrap;
  display: inline-block;
  font-family: Nikoleta;
  color: #69e9f5;
  -webkit-background-clip: text;
  background-clip: text;
  text-wrap: auto;
  @media (max-width: 768px) {
    font-size: 20px;
    position: relative;
    top: 8px;
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const StyledStepDesc = styled(Text)`
  font-size: 16px;
  color: #fff;
  white-space: break-spaces;
  margin-top: 20px;

  @media (max-width: 768px) {
    position: relative;
    bottom: 5px;
  }

  @media (max-width: 680px) {
    font-size: 14px;
    text-wrap: auto;
  }
`;

export const PowerCard = ({ title, value }) => {
  return (
    <>
      <div className="power-block">
        <img src="/images/Container.svg" alt="card background" />
        <div className="power-card-container">
        <div className="text-wrapper">
          <StyledStepTitle>{title}</StyledStepTitle>
          <StyledStepDesc>{value}</StyledStepDesc>
        </div>
        </div>
        {/* <div className="power-card-container">
          <div className="text-wrapper">
            <StyledStepTitle>{title}</StyledStepTitle>
            <StyledStepDesc>{value}</StyledStepDesc>
          </div>
        </div> */}
        {/* <div className="power-block-icon">
          <img
            decoding="async"
            className="power-block-img cc-img"
            src="/images/epix-holder.svg"
            alt="epix indicator"
            sizes="(max-width: 81px) 100vw, 81px"
            width="81"
            height="102"
          />
        </div> */}
      </div>
    </>
  );
};
