import React from "react";
import { PowerCard } from "../common/PowerCard";

export const Dashboard = ({ totalClaims, totalClaimed }) => {
  const TOTAL_SUPPLY = 23689538;
  const TARGET_BALANCE = TOTAL_SUPPLY / 2;

  return (
    <>
      <div className="heading2">
        <h2>Dashboard</h2>
        <div className="gradient-line"></div>
      </div>
      <div className="dashboard_wrapper">
        <PowerCard
          title="Total Claimed:"
          value={(totalClaimed / 100000000).toFixed(8)}
        />
        <PowerCard title="Total Claims:" value={totalClaims} />

        <PowerCard
          title="Time Remaining to Claim the Airdrop:"
          value={(() => {
            const remainingTime = Math.max(
              0,
              new Date("2025-06-06T00:00:00Z").getTime() - Date.now()
            );
            const months = Math.floor(
              remainingTime / (1000 * 60 * 60 * 24 * 30)
            );
            const days = Math.floor(
              (remainingTime % (1000 * 60 * 60 * 24 * 30)) /
              (1000 * 60 * 60 * 24)
            );
            const hours = Math.floor(
              (remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            const minutes = Math.floor(
              (remainingTime % (1000 * 60 * 60)) / (1000 * 60)
            );
            return `${months} months, ${days} days, ${hours} hours, ${minutes} minutes`;
          })()}
        />
      </div>

      <div className="dashboard_wrapper_2">
        <PowerCard
          title="Remaining Claimable:"
          value={(TOTAL_SUPPLY - (totalClaimed / 100000000)).toFixed(8)}
        />
        <PowerCard
          title="Deduction Percentage:"
          value={(() => {
            const claimed = totalClaimed / 100000000;
            return claimed > TARGET_BALANCE
              ? (((claimed - TARGET_BALANCE) / claimed) * 100).toFixed(2)
              : "0.00";
          })()}
        />
        <PowerCard
          title="Claimed Balance vs Community Pool:"
          value={(() => {
            const claimed = totalClaimed / 100000000;
            const communityPool = claimed > TARGET_BALANCE ? TARGET_BALANCE : claimed;
            const treasury = TARGET_BALANCE;
            return `Claimed: ${communityPool.toFixed(8)}\n\nCommunity Pool: ${treasury.toFixed(8)}`;
          })()}
        />
      </div>
    </>
  );
};
