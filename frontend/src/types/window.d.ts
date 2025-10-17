// 扩展Window接口以支持Web3相关属性
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isConnected?: () => boolean;
      request?: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
      [key: string]: any;
    };
    web3?: any;
  }
}

export {};


