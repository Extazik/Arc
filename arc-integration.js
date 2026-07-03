import { AppKit } from '@circle-fin/app-kit';
import type { BridgeResult, SwapResult } from '@circle-fin/app-kit';
import {
  createViemAdapterFromProvider,
  type ViemAdapter,
} from '@circle-fin/adapter-viem-v2';
import type { EIP1193Provider } from 'viem';

// ── Event payload types ──────────────────────────────────────────────────────

type BridgeEventPayload = {
  values: {
    name: string;
    state: 'pending' | 'success' | 'error';
    txHash?: string;
    explorerUrl?: string;
    error?: Error;
  };
};
type UBEventPayload = { data: unknown };
type AnyKitPayload = BridgeEventPayload | UBEventPayload;

function isBridgePayload(p: AnyKitPayload): p is BridgeEventPayload {
  return (
    'values' in p &&
    typeof (p as BridgeEventPayload).values?.state === 'string'
  );
}

// ── Class ────────────────────────────────────────────────────────────────────

class ArcIntegration {
  private kit: AppKit;
  private adapter: ViemAdapter | null = null;
  private provider: EIP1193Provider | null = null;
  private initPromise: Promise<void> | null = null;

  private readonly onAccountsChanged = (accs: unknown) =>
    void this.handleAccountChange(accs as string[]);
  private readonly onChainChanged = (chainId: unknown) =>
    this.handleChainChange(chainId as string);

  constructor() {
    this.kit = new AppKit();

    // Safe handling of different payload formats
    this.kit.on('*', (payload: AnyKitPayload) => {
      if (isBridgePayload(payload)) {
        console.log('Bridge event:', payload.values.name, payload.values.state);
        if (payload.values.state === 'error') this.handleBridgeError(payload);
      } else {
        console.log('UB event:', (payload as UBEventPayload).data);
      }
    });
  }

  private handleBridgeError(payload: BridgeEventPayload): void {
    console.error('Bridge error:', payload.values.error);
    // TODO: UI notification
  }

  // Resetting initPromise on error
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit().catch((err) => {
      this.initPromise = null;
      throw err;
    });
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    if (!import.meta.env.VITE_CIRCLE_KIT_KEY) {
      console.warn('⚠️ VITE_CIRCLE_KIT_KEY not set — swap will fail');
    }
  }

  disconnect(): void {
    if (this.provider) {
      if (typeof this.provider.removeListener === 'function') {
        this.provider.removeListener('accountsChanged', this.onAccountsChanged);
        this.provider.removeListener('chainChanged', this.onChainChanged);
      } else if (import.meta.env.DEV) {
        console.warn('Provider missing removeListener — potential memory leak');
      }
    }
    this.adapter = null;
    this.provider = null;
  }

  // Disconnect() before setting up new listeners
  async connectWallet(provider: EIP1193Provider): Promise<string | null> {
    this.disconnect(); // Remove previous listeners

    await provider.request({ method: 'eth_requestAccounts' });
    const accounts = await provider.request({
      method: 'eth_accounts',
    }) as string[];

    this.provider = provider;
    this.adapter = await createViemAdapterFromProvider({ provider });

    provider.on('accountsChanged', this.onAccountsChanged);
    provider.on('chainChanged', this.onChainChanged);

    return accounts[0] ?? null;
  }

  private async handleAccountChange(newAccounts: string[]): Promise<void> {
    if (newAccounts.length === 0) {
      this.adapter = null;
      this.provider = null;
      console.log('Wallet disconnected');
      return;
    }
    console.log('Account changed:', newAccounts[0]);
    if (!this.provider) return;
    try {
      this.adapter = await createViemAdapterFromProvider({
        provider: this.provider,
      });
    } catch (err) {
      console.error('Failed to recreate adapter after account change:', err);
      this.adapter = null;
    }
  }

  // Recreating the adapter when chain changes
  private handleChainChange(chainId: string): void {
    console.log('Chain changed:', chainId);
    if (!this.provider) return;
    void createViemAdapterFromProvider({ provider: this.provider })
      .then((adapter) => { this.adapter = adapter; })
      .catch((err) => {
        console.error('Failed to recreate adapter after chain change:', err);
        this.adapter = null;
      });
  }

  // RetryBridge accepts bare adapters (not {adapter, chain})
  async bridgeToArc(
    amount: string,
    fromChain: string,
    toChain = 'Arc_Testnet',
  ): Promise<BridgeResult> {
    await this.initialize();
    if (!this.adapter) throw new Error('Wallet not connected');

    let result = await this.kit.bridge({
      from: { adapter: this.adapter, chain: fromChain },
      to:   { adapter: this.adapter, chain: toChain },
      amount,
    });

    if (result.state === 'error') {
      // Checking for actionable errors before retry
      const errorStep = result.steps.find((s) => s.state === 'error');
      const isTransient =
        !errorStep?.errorMessage ||
        errorStep.errorMessage.includes('gas') ||
        errorStep.errorMessage.includes('timeout') ||
        errorStep.errorMessage.includes('network');

      if (isTransient) {
        console.warn('Transient error, retrying step:', errorStep?.name);
        result = await this.kit.retryBridge(result, {
          from: this.adapter,
          to:   this.adapter,
        });
      } else {
        throw new Error(errorStep?.errorMessage ?? 'Bridge failed');
      }
    }

    return result;
  }

  // Единственная точка чтения kitKey
  private get kitKey(): string {
    const key = import.meta.env.VITE_CIRCLE_KIT_KEY as string | undefined;
    if (!key) throw new Error('VITE_CIRCLE_KIT_KEY is required for swap');
    return key;
  }

  async swapTokens(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    chain = 'Arc_Testnet',
  ): Promise<SwapResult> {
    await this.initialize();
    if (!this.adapter) throw new Error('Wallet not connected');

    try {
      return await this.kit.swap({
        from: { adapter: this.adapter, chain },
        tokenIn,
        tokenOut,
        amountIn,
        config: { kitKey: this.kitKey },
      });
    } catch (error) {
      console.error('Swap failed:', error);
      throw error;
    }
  }

  async depositToUnifiedBalance(
    amount: string,
    fromChain: string,
    token = 'USDC',
  ) {
    await this.initialize();
    if (!this.adapter) throw new Error('Wallet not connected');

    try {
      return await this.kit.unifiedBalance.deposit({
        from: { adapter: this.adapter, chain: fromChain },
        amount,
        token,
      });
    } catch (error) {
      console.error('Unified Balance deposit failed:', error);
      return null;
    }
  }


  async spendFromUnifiedBalance(
    amount: string,
    toChain: string,
    recipientAddress: string,
  ) {
    await this.initialize();
    if (!this.adapter) throw new Error('Wallet not connected');

    try {
      return await this.kit.unifiedBalance.spend({
        amount,
        token: 'USDC',                      // Explicitly specify the token
        from: [{ adapter: this.adapter }],  // from — array of sources
        to: {
          adapter: this.adapter,
          chain: toChain,
          recipientAddress,
        },
      });
    } catch (error) {
      console.error('Unified Balance spend failed:', error);
      return null;
    }
  }
}

export const arcIntegration = new ArcIntegration();