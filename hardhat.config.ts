import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify"
import { config as dotenvConfig } from "dotenv";
import "hardhat-deploy";
import { vars } from "hardhat/config";
import type { HardhatUserConfig } from "hardhat/config";
import type { NetworkUserConfig } from "hardhat/types";
import { resolve } from "path";

import { SupportedChainId, isValidChainId } from "./test/shared/chains";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC;

const deployerPK: string | undefined = vars.get("DEPLOYER_PK");
const hasPK = deployerPK;

if (!mnemonic && !hasPK) {
  throw new Error("Please set your PK or MNEMONIC in a .env file");
}

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;
if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}

const CHAIN_ID = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : undefined;
const DEX = process.env.DEX;

if (!isValidChainId(CHAIN_ID)) {
  throw new Error(`CHAIN_ID ${CHAIN_ID} is not supported`);
}

interface ChainConfigMinimal {
  urls: {
    apiURL: string;
    browserURL: string;
  };
}

interface ChainConfig {
  network: string;
  chainId: number;
  urls: {
    apiURL: string;
    browserURL: string;
  };
}

// Runtime check to ensure all required keys are present
// Build/compile time check with a type to enforce this doesn't seem possible
function verifyConfigIntegrity(
  config: Partial<Record<SupportedChainId, ChainConfigMinimal>>,
  apiKeys: Record<SupportedChainId, string>,
) {
  for (const key in config) {
    if (!(key in apiKeys)) {
      throw new Error(`Explorer API key for ${SupportedChainId[key as any]} is missing`);
    }
  }
}

// Only need to specify etherscanConfig for a chain if it's not supported by default:
// npx hardhat verify --list-networks
// for configs of already supported networks(with different chainNames) look inside: @nomiclabs/hardhat-etherscan/src/ChainConfig.ts
export const etherscanConfig: Partial<Record<SupportedChainId, ChainConfigMinimal>> = {
  [SupportedChainId.BASE_MAINNET]: {
    urls: {
      apiURL: "https://api.basescan.org/api",
      browserURL: "https://basescan.org/",
    },
  },
  [SupportedChainId.EVMOS_MAINNET]: {
    urls: {
      apiURL: "https://escan.live/api",
      browserURL: "https://escan.live",
    },
  },
  [SupportedChainId.INK_SEPOLIA]: {
    urls: {
      apiURL: "https://api.routescan.io/v2/network/testnet/evm/763373/etherscan",
      browserURL: "https://sepolia.inkonscan.xyz",
    },
    // urls: {
    //   apiURL: "https://explorer-sepolia.inkonchain.com/api",
    //   browserURL: "https://explorer-sepolia.inkonchain.com",
    // },
  },
  [SupportedChainId.INK_MAINNET]: {
    urls: {
      apiURL: "https://pqr0zfqez8pm54s.blockscout.com/api",
      browserURL: "https://pqr0zfqez8pm54s.blockscout.com",
    },
  },
  [SupportedChainId.BERACHAIN_MAINNET]: {
    urls: {
      apiURL: "https://api.routescan.io/v2/network/mainnet/evm/80094/etherscan",
      browserURL:  "https://beratrail.io",
    },
  },
  [SupportedChainId.MANTLE_MAINNET]: {
    // urls: {
    //   apiURL: "https://api.routescan.io/v2/network/mainnet/evm/5000/etherscan",
    //   browserURL: "https://mantlescan.info"
    // urls: {
    //   apiURL: "https://explorer.mantle.xyz/api",
    //   browserURL: "https://explorer.mantle.xyz/"
    // },
    urls: {
      apiURL: "https://api.mantlescan.xyz/api",
      browserURL: "https://mantlescan.xyz",
    },
  },
  [SupportedChainId.POLYGON_ZKEVM]: {
    urls: {
      apiURL: "https://api-zkevm.polygonscan.com/api",
      browserURL: "https://zkevm.polygonscan.com",
    },
  },
  [SupportedChainId.LINEA_MAINNET]: {
    urls: {
      apiURL: "https://api.lineascan.build/api",
      browserURL: "https://lineascan.build/",
    },
  },
  [SupportedChainId.OPBNB_MAINNET]: {
    urls: {
      apiURL: `https://open-platform.nodereal.io/${process.env.NODEREAL_API_KEY}/op-bnb-mainnet/contract/`,
      browserURL: "https://opbnbscan.com/",
    },
  },
  [SupportedChainId.FANTOM_MAINNET]: {
    urls: {
      apiURL: "https://api.ftmscan.com/api",
      browserURL: "https://ftmscan.com",
    },
  },
};

// Utility type to extract and enforce keys from etherscanConfig
type EnforcedApiKeys<T extends object> = {
  [P in keyof T]: string;
} & Partial<Record<SupportedChainId, string>>;

const dummyApiKey = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz";

export const etherscanApiKeys: EnforcedApiKeys<typeof etherscanConfig> = {
  // required SupportedChainId since specified in etherscanConfig
  [SupportedChainId.BASE_MAINNET]: process.env.BASESCAN_API_KEY || "",
  [SupportedChainId.EVMOS_MAINNET]: process.env.ESCAN_API_KEY || "",
  [SupportedChainId.MANTLE_MAINNET]: process.env.MANTLESCAN_API_KEY || "",
  [SupportedChainId.POLYGON_ZKEVM]: process.env.ZKEVMSCAN_API_KEY || "",
  [SupportedChainId.LINEA_MAINNET]: process.env.LINEASCAN_API_KEY || "",
  [SupportedChainId.OPBNB_MAINNET]: process.env.OPBNBSCAN_API_KEY || "",
  [SupportedChainId.FANTOM_MAINNET]: process.env.FTMSCAN_API_KEY || "",
  [SupportedChainId.INK_SEPOLIA]: dummyApiKey, // no API key required
  [SupportedChainId.INK_MAINNET]: dummyApiKey, // no API key required
  [SupportedChainId.BERACHAIN_MAINNET]: dummyApiKey, // no API key required

  // extra optional SupportedChainId
  [SupportedChainId.ARBITRUM_MAINNET]: process.env.ARBISCAN_API_KEY || "",
  [SupportedChainId.AVALANCHE_MAINNET]: process.env.SNOWTRACE_API_KEY || "",
  [SupportedChainId.BSC_MAINNET]: process.env.BSCSCAN_API_KEY || "",
  [SupportedChainId.ETHEREUM_MAINNET]: process.env.ETHERSCAN_API_KEY || "",
  [SupportedChainId.OPTIMISM_MAINNET]: process.env.OPTIMISM_API_KEY || "",
  [SupportedChainId.POLYGON_MAINNET]: process.env.POLYGONSCAN_API_KEY || "",
  [SupportedChainId.POLYGON_MUMBAI]: process.env.POLYGONSCAN_API_KEY || "",
  [SupportedChainId.SEPOLIA]: process.env.ETHERSCAN_API_KEY || "",
};

// Call this function at the start of your application
verifyConfigIntegrity(etherscanConfig, etherscanApiKeys as Record<SupportedChainId, string>);

const forkChain: SupportedChainId = CHAIN_ID;

const chainNames: Record<SupportedChainId, string> = {
  [SupportedChainId.ETHEREUM_MAINNET]: "mainnet",
  [SupportedChainId.OPTIMISM_MAINNET]: "optimism-mainnet",
  [SupportedChainId.BSC_MAINNET]: "bsc",
  [SupportedChainId.POLYGON_MAINNET]: "polygon-mainnet",
  [SupportedChainId.OPBNB_MAINNET]: "opbnb-mainnet",
  [SupportedChainId.FANTOM_MAINNET]: "fantom-mainnet",
  [SupportedChainId.HEDERA_MAINNET]: "hedera-mainnet",
  [SupportedChainId.HEDERA_TESTNET]: "hedera-testnet",
  [SupportedChainId.POLYGON_ZKEVM]: "polygon-zkevm",
  [SupportedChainId.GANACHE]: "ganache",
  [SupportedChainId.MANTLE_MAINNET]: "mantle-mainnet",
  [SupportedChainId.EVMOS_MAINNET]: "evmos-mainnet",
  [SupportedChainId.HARDHAT]: "hardhat",
  [SupportedChainId.AVALANCHE_MAINNET]: "avalanche-mainnet",
  [SupportedChainId.SEPOLIA]: "sepolia",
  [SupportedChainId.ARBITRUM_MAINNET]: "arbitrum-mainnet",
  [SupportedChainId.POLYGON_MUMBAI]: "polygon-mumbai",
  [SupportedChainId.LINEA_MAINNET]: "linea-mainnet",
  [SupportedChainId.HORIZEN_MAINNET]: "horizen-mainnet",
  [SupportedChainId.BASE_MAINNET]: "base-mainnet",
  [SupportedChainId.ZKSYNC_TESTNET]: "zksync-testnet",
  [SupportedChainId.ZKSYNC_MAINNET]: "zksync-mainnet",
  [SupportedChainId.INK_SEPOLIA]: "ink-sepolia",
  [SupportedChainId.INK_MAINNET]: "ink-mainnet",
  [SupportedChainId.BERACHAIN_MAINNET]: "berachain-mainnet",
};

// NOTE: we mostly don't care fast fork tests from caching
const forkBlockNumbers: Partial<Record<SupportedChainId, number>> = {
  // [SupportedChainId.BSC_MAINNET]: 34_274_774,
  // [SupportedChainId.HEDERA_TESTNET]: 4_900_000,
  // [SupportedChainId.HORIZEN_MAINNET]: 677_000,
  // [SupportedChainId.ZKSYNC_TESTNET]: 14_621_693,
  // [SupportedChainId.ZKSYNC_MAINNET]: 21_240_546,
  // [SupportedChainId.ARBITRUM_MAINNET]: 169_388_000,
  // [SupportedChainId.ETHEREUM_MAINNET]: 19_225_400,
  // [SupportedChainId.AVALANCHE_MAINNET]: 41_672_600,
  // [SupportedChainId.MANTLE_MAINNET]: 55_010_000,
  // [SupportedChainId.BASE_MAINNET]: 10_607_880,
};

// If a block number to pin a fork for a given network isn't specified then "latest" will be used for the fork by default(i.e. if undefined is returned)
function getForkChainBlockNumber(chainId: SupportedChainId): number | undefined {
  return forkBlockNumbers[chainId];
}

const fallbackRpcUrls: Record<SupportedChainId, string[]> = {
  [SupportedChainId.ETHEREUM_MAINNET]: ["https://eth.llamarpc.com"],
  [SupportedChainId.OPTIMISM_MAINNET]: ["https://optimism.llamarpc.com"],
  [SupportedChainId.BSC_MAINNET]: ["https://rpc.ankr.com/bsc"],
  [SupportedChainId.POLYGON_MAINNET]: ["https://polygon.llamarpc.com"],
  [SupportedChainId.OPBNB_MAINNET]: ["https://opbnb.publicnode.com"],
  [SupportedChainId.FANTOM_MAINNET]: [
    "https://rpc.fantom.network",
    "https://rpcapi.fantom.network",
    "https://fantom-pokt.nodies.app",
    "https://rpc.ftm.tools",
    "https://rpc.ankr.com/fantom",
    "https://rpc2.fantom.network",
    "https://rpc3.fantom.network",
    "https://fantom-mainnet.public.blastapi.io",
    "https://endpoints.omniatech.io/v1/fantom/mainnet/public",
  ],
  [SupportedChainId.HEDERA_MAINNET]: ["https://mainnet.hashio.io/api"],
  [SupportedChainId.HEDERA_TESTNET]: ["https://testnet.hashio.io/api"],
  [SupportedChainId.POLYGON_ZKEVM]: ["https://rpc.ankr.com/polygon_zkevm"],
  [SupportedChainId.GANACHE]: ["http://localhost:8545"],
  [SupportedChainId.MANTLE_MAINNET]: [
    "https://1rpc.io/mantle",
    "https://rpc.mantle.xyz",
    "https://mantle.drpc.org",
    "https://mantle-mainnet.public.blastapi.io",
    "https://mantle.publicnode.com",
    "https://rpc.ankr.com/mantle",
  ],
  [SupportedChainId.EVMOS_MAINNET]: [
    "https://evmos-evm.publicnode.com",
    "https://evmos.lava.build",
    "https://jsonrpc-evmos.mzonder.com",
    "https://json-rpc.evmos.tcnetwork.io",
    "https://rpc-evm.evmos.dragonstake.io",
    "https://evmos-jsonrpc.alkadeta.com",
    "https://evmos-jsonrpc.stake-town.com",
    "https://evm-rpc.evmos.silentvalidator.com",
    "https://evmos-mainnet.public.blastapi.io",
    "https://jsonrpc-evmos-ia.cosmosia.notional.ventures",
    "https://evmos-jsonrpc.theamsolutions.info",
    "https://alphab.ai/rpc/eth/evmos",
    "https://evmos-json-rpc.0base.dev",
    "https://json-rpc-evmos.mainnet.validatrium.club",
    "https://evmos-json-rpc.stakely.io",
    "https://json-rpc.evmos.blockhunters.org",
    "https://evmos-pokt.nodies.app",
    "https://evmosevm.rpc.stakin-nodes.com",
    "https://evmos-json.antrixy.org",
  ],
  [SupportedChainId.HARDHAT]: [""],
  [SupportedChainId.AVALANCHE_MAINNET]: [
    "https://avalanche-mainnet-rpc.allthatnode.com",
    "https://rpc.ankr.com/avalanche",
    "https://1rpc.io/avax/c",
    "https://api.avax.network/ext/bc/C/rpc",
    "https://avalanche.public-rpc.com",
    "https://avalanche-c-chain.publicnode.com",
    "https://avalanche.blockpi.network/v1/rpc/public",
    "https://avalanche.drpc.org",
  ],
  [SupportedChainId.SEPOLIA]: ["https://1rpc.io/sepolia"],
  [SupportedChainId.ARBITRUM_MAINNET]: ["https://arbitrum.llamarpc.com"],
  [SupportedChainId.POLYGON_MUMBAI]: ["https://polygon-testnet.public.blastapi.io"],
  [SupportedChainId.LINEA_MAINNET]: ["https://linea.drpc.org"],
  [SupportedChainId.HORIZEN_MAINNET]: ["https://rpc.ankr.com/horizen_eon"],
  [SupportedChainId.BASE_MAINNET]: [
    "https://mainnet.base.org",
    "https://base.blockpi.network/v1/rpc/public",
    "https://1rpc.io/base",
    "https://base-pokt.nodies.app",
    "https://base.meowrpc.com",
    "https://base-mainnet.public.blastapi.io",
    "https://base.gateway.tenderly.co",
    "https://gateway.tenderly.co/public/base",
    "https://rpc.notadegen.com/base",
    "https://base.publicnode.com",
    "https://base.drpc.org",
    "https://endpoints.omniatech.io/v1/base/mainnet/public",
    "https://base.llamarpc.com",
  ],
  [SupportedChainId.ZKSYNC_TESTNET]: ["https://sepolia.era.zksync.dev"],
  [SupportedChainId.ZKSYNC_MAINNET]: ["https://mainnet.era.zksync.io"],
  [SupportedChainId.INK_SEPOLIA]: [
    "https://rpc-gel-sepolia.inkonchain.com",
    "https://rpc-qnd-sepolia.inkonchain.com",
    "https://rpc-ten-sepolia.inkonchain.com",
  ],
  [SupportedChainId.INK_MAINNET]: [
    "https://rpc-gel.inkonchain.com",
  ],
  [SupportedChainId.BERACHAIN_MAINNET]: [
    "https://berachain.blockpi.network/v1/rpc/public",
    "https://berachain-rpc.publicnode.com",
    "https://rpc.berachain-apis.com",
    "https://rpc.berachain.com",
  ],
};

const defaultRpcUrls: Record<SupportedChainId, string> = {
  [SupportedChainId.ETHEREUM_MAINNET]: fallbackRpcUrls[SupportedChainId.ETHEREUM_MAINNET][0],
  [SupportedChainId.OPTIMISM_MAINNET]: fallbackRpcUrls[SupportedChainId.OPTIMISM_MAINNET][0],
  [SupportedChainId.BSC_MAINNET]: fallbackRpcUrls[SupportedChainId.BSC_MAINNET][0],
  [SupportedChainId.POLYGON_MAINNET]: fallbackRpcUrls[SupportedChainId.POLYGON_MAINNET][0],
  [SupportedChainId.OPBNB_MAINNET]: fallbackRpcUrls[SupportedChainId.OPBNB_MAINNET][0],
  [SupportedChainId.FANTOM_MAINNET]: fallbackRpcUrls[SupportedChainId.FANTOM_MAINNET][0],
  [SupportedChainId.HEDERA_MAINNET]: fallbackRpcUrls[SupportedChainId.HEDERA_MAINNET][0],
  [SupportedChainId.HEDERA_TESTNET]: fallbackRpcUrls[SupportedChainId.HEDERA_TESTNET][0],
  [SupportedChainId.POLYGON_ZKEVM]: fallbackRpcUrls[SupportedChainId.POLYGON_ZKEVM][0],
  [SupportedChainId.GANACHE]: fallbackRpcUrls[SupportedChainId.GANACHE][0],
  [SupportedChainId.MANTLE_MAINNET]: fallbackRpcUrls[SupportedChainId.MANTLE_MAINNET][0],
  [SupportedChainId.EVMOS_MAINNET]: fallbackRpcUrls[SupportedChainId.EVMOS_MAINNET][0],
  [SupportedChainId.HARDHAT]: fallbackRpcUrls[SupportedChainId.HARDHAT][0],
  [SupportedChainId.AVALANCHE_MAINNET]: fallbackRpcUrls[SupportedChainId.AVALANCHE_MAINNET][0],
  [SupportedChainId.SEPOLIA]: fallbackRpcUrls[SupportedChainId.SEPOLIA][0],
  [SupportedChainId.ARBITRUM_MAINNET]: fallbackRpcUrls[SupportedChainId.ARBITRUM_MAINNET][0],
  [SupportedChainId.POLYGON_MUMBAI]: fallbackRpcUrls[SupportedChainId.POLYGON_MUMBAI][0],
  [SupportedChainId.LINEA_MAINNET]: fallbackRpcUrls[SupportedChainId.LINEA_MAINNET][0],
  [SupportedChainId.HORIZEN_MAINNET]: fallbackRpcUrls[SupportedChainId.HORIZEN_MAINNET][0],
  [SupportedChainId.BASE_MAINNET]: fallbackRpcUrls[SupportedChainId.BASE_MAINNET][0],
  [SupportedChainId.ZKSYNC_TESTNET]: fallbackRpcUrls[SupportedChainId.ZKSYNC_TESTNET][0],
  [SupportedChainId.ZKSYNC_MAINNET]: fallbackRpcUrls[SupportedChainId.ZKSYNC_MAINNET][0],
  [SupportedChainId.INK_SEPOLIA]: fallbackRpcUrls[SupportedChainId.INK_SEPOLIA][0],
  [SupportedChainId.INK_MAINNET]: fallbackRpcUrls[SupportedChainId.INK_MAINNET][0],
  [SupportedChainId.BERACHAIN_MAINNET]: fallbackRpcUrls[SupportedChainId.BERACHAIN_MAINNET][0],
};

const infuraSupportedNetworks: Partial<Record<SupportedChainId, boolean>> = {
  [SupportedChainId.ETHEREUM_MAINNET]: true,
  [SupportedChainId.BASE_MAINNET]: false,
  [SupportedChainId.POLYGON_MAINNET]: true,
  [SupportedChainId.OPTIMISM_MAINNET]: true,
  [SupportedChainId.ARBITRUM_MAINNET]: true,
  [SupportedChainId.AVALANCHE_MAINNET]: true,
};

function getChainUrl(chainId: SupportedChainId): string {
  // Check if the chainId has a custom URL in infuraSupportedNetworks
  if (infuraSupportedNetworks[chainId]) {
    return `https://${chainNames[chainId]}.infura.io/v3/${infuraApiKey}`;
  }

  return defaultRpcUrls[chainId];
}

function getChainConfig(chainId: SupportedChainId): NetworkUserConfig {
  const jsonRpcUrl = getChainUrl(chainId);

  return {
    accounts: hasPK
      ? [deployerPK]
      : {
          count: 10,
          mnemonic: mnemonic!,
          path: "m/44'/60'/0'/0",
        },
    chainId,
    url: jsonRpcUrl,
    timeout: 60_000, // added as the default timeout isn't sufficient for Hedera
  };
}

const chainConfigs = Object.entries(chainNames).reduce((config, [chainIdString, chainName]) => {
  const chainId = Number(chainIdString);
  if (isValidChainId(chainId)) {
    config[chainName] = getChainConfig(chainId);
    return config;
  } else {
    throw new Error("Invalid chainId");
  }
}, {} as Record<string, ReturnType<typeof getChainConfig>>);

const chainVerifyApiKeys = Object.entries(chainNames).reduce((config, [chainIdString, chainName]) => {
  const chainId = Number(chainIdString);
  if (isValidChainId(chainId)) {
    config[chainName] = etherscanApiKeys[chainId] || "";
    return config;
  } else {
    throw new Error("Invalid chainId");
  }
}, {} as Record<string, string>);

function getForkChainConfig(chain: SupportedChainId): {
  url: string;
  blockNumber?: number;
} {
  const jsonRpcUrl = getChainUrl(chain);
  const blockNumber = getForkChainBlockNumber(chain);

  return {
    url: jsonRpcUrl,
    blockNumber,
  };
}

const chainConfigsArray: ChainConfig[] = Object.entries(etherscanConfig).reduce((acc, [chainIdString, config]) => {
  const chainId = Number(chainIdString) as SupportedChainId;
  const networkName = chainNames[chainId];
  // Construct the ChainConfig object if URLs are provided
  if (config?.urls) {
    const chainConfig: ChainConfig = {
      network: networkName,
      chainId,
      urls: config.urls,
    };
    acc.push(chainConfig);
  }
  return acc;
}, [] as ChainConfig[]);

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      ...chainVerifyApiKeys,
    },
    customChains: chainConfigsArray,
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
    src: "./contracts",
  },
  networks: {
    ...chainConfigs,
    // NOTE: chainConfigs is destructed before "hardhat" and "ganache" below so as to not overwrite the configs below
    hardhat: {
      forking: forkChain ? getForkChainConfig(forkChain) : undefined,
      chainId: forkChain ? forkChain : SupportedChainId.HARDHAT,
      accounts: {
        mnemonic,
      },
    },
    ganache: {
      accounts: {
        mnemonic
      },
      chainId: SupportedChainId.GANACHE,
      url: "http://localhost:8545",
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    compilers: [
      {
        version: "0.5.17",
        // settings: {
        //   optimizer: {
        //     enabled: true,
        //     runs: 200,
        //   },
        // },
      },
    ],
  },
  typechain: {
    outDir: "types",
    // target: "ethers-v6",
  },
  mocha: {
    timeout: 3600_000, // 1 hour
  },
};

export default config;
