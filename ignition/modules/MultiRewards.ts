import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MultiRewards", (m) => {
  // Deploy MultiRewardsFactory
  const factory = m.contract("MultiRewardsFactory");

  return {
    factory,
  };
});
