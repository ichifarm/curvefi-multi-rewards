import { ethers, getNamedAccounts, network, run } from "hardhat";
import { MultiRewards__factory } from "../types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

export type ProjectSigners = {
  deployer: SignerWithAddress,
};

async function getNamedSigners() {
  const namedAccounts = await getNamedAccounts();
  const signers: {[name: string]: SignerWithAddress} = {};
  for (const [name, address] of Object.entries(namedAccounts)) {
      signers[name] = await ethers.getSigner(address);
  }
  return signers;
};

export async function getProjectSigners(): Promise<ProjectSigners> {
  return (await getNamedSigners()) as ProjectSigners
};

// For more details on programmatic verification in hardhat see:
// https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify#using-programmatically
describe("Verify All Contracts via Etherscan", async function () {

  const isHardhat = network.name === "hardhat";

  const requisiteData: {
    MULTI_REWARDS_ADDRESS: string;
  } = {
    MULTI_REWARDS_ADDRESS: "",
  };

  let deployer: SignerWithAddress;

  before(async () => {

    if (isHardhat) {
      throw new Error(`To verify on a specific etherscan(not hardhat) specify "--network" cmd flag`);
    }

    const signers = await getProjectSigners();
    ({deployer} = signers);

    const {
      MULTI_REWARDS_ADDRESS
    } = requisiteData;

    if (!MULTI_REWARDS_ADDRESS) {
      throw new Error('MULTI_REWARDS_ADDRESS is not defined')
    }

  });

  after(async () => {
    console.log("requisiteData:", requisiteData);
  });

  let shouldSkip = false;
  beforeEach(function () {
    if (shouldSkip) {
      this.skip();
    }
  });

  // afterEach(function () {
  //   if (this.currentTest?.state === 'failed') {
  //     shouldSkip = true;
  //   }
  // });

  it("should verify MultiRewards", async () => {

    const {
      MULTI_REWARDS_ADDRESS
    } = requisiteData;

    const mr = MultiRewards__factory.connect(MULTI_REWARDS_ADDRESS, deployer)

    const owner = await mr.owner();
    const stakingToken = await mr.stakingToken();

    console.log({
      owner,
      stakingToken
    })

    await run("verify:verify", {
      contract: "contracts/MultiRewards.sol:MultiRewards",
      address: MULTI_REWARDS_ADDRESS,
      constructorArguments: [
        owner,
        stakingToken
      ],
    });

  });

});
