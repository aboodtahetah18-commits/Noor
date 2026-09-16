export const NDOS_V1_2_ASSETS = {
  logo: '/brand/ndos/namaa-logo-official.png',
  banks: {
    central: '/brand/ndos/banks/namaa-central-bank.png',
    hilal: '/brand/ndos/banks/hilal-bank.png',
    malaa: '/brand/ndos/banks/malaa-bank.png',
    investmentAssets: '/brand/ndos/banks/investment-assets-bank.png',
  },
  personas: '/brand/ndos/personas/namaa-algorithmic-personas.png',
} as const;

export type NdosBankAssetKey = keyof typeof NDOS_V1_2_ASSETS.banks;
