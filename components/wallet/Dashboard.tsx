import React from "react";
import { PowerCard } from "../common/PowerCard";


export const Dashboard = ({ totalClaims, totalClaimed }) => {
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
              new Date("2025-02-01T00:00:00Z").getTime() - Date.now()
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
          title="Remaining EPIX Tokens Available:"
          value={(23689538 - totalClaimed / 100000000).toFixed(8)}
        />
        <PowerCard
          title="Deduction Percentage:"
          value={(() => {
            const claimed = totalClaimed / 100000000;
            const targetBalance = 23689538 / 2;
            return claimed > targetBalance
              ? (((claimed - targetBalance) / claimed) * 100).toFixed(2)
              : 0;
          })()}
        />
        <PowerCard
          title="Community Pool vs Treasury Balance:"
          value={(() => {
            const claimed = totalClaimed / 100000000;
            const treasury = 23689538 - claimed;
            return `Community: ${claimed.toFixed(
              8
            )}, Treasury: ${treasury.toFixed(8)}`;
          })()}
        />
      </div>
    </>
  );
};
