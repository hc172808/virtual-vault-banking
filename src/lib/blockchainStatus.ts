// Blockchain Node Status and Readiness Checker
// Supports GYD (primary) and GYDS (secondary) tokens on the GYD blockchain

export interface BlockchainNodeConfig {
  rpcEndpoint: string;
  chainId: string;
  eventIndexer?: string;
  coinSymbol: 'GYD' | 'GYDS';
  coinName: string;
  decimals: number;
}

export interface NodeStatus {
  isConnected: boolean;
  blockHeight: number | null;
  latency: number | null;
  lastChecked: Date;
  error?: string;
}

export interface BlockchainReadiness {
  isReady: boolean;
  gyd: NodeStatus;
  gyds?: NodeStatus; // Optional - GYDS monitoring but not used
  activeNetwork: 'GYD';
  message: string;
}

// Default configurations
export const DEFAULT_GYD_CONFIG: BlockchainNodeConfig = {
  rpcEndpoint: '',
  chainId: '1',
  eventIndexer: '',
  coinSymbol: 'GYD',
  coinName: 'GYD Stablecoin',
  decimals: 18
};

export const DEFAULT_GYDS_CONFIG: BlockchainNodeConfig = {
  rpcEndpoint: '',
  chainId: '1',
  eventIndexer: '',
  coinSymbol: 'GYDS',
  coinName: 'GYD Savings Token',
  decimals: 18
};

/**
 * Check if a blockchain RPC endpoint is reachable and get block height
 */
export async function checkNodeStatus(config: BlockchainNodeConfig): Promise<NodeStatus> {
  if (!config.rpcEndpoint) {
    return {
      isConnected: false,
      blockHeight: null,
      latency: null,
      lastChecked: new Date(),
      error: 'RPC endpoint not configured'
    };
  }

  const startTime = Date.now();

  try {
    // Standard JSON-RPC call to get block number
    const response = await fetch(config.rpcEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }

    const blockHeight = parseInt(data.result, 16);

    return {
      isConnected: true,
      blockHeight,
      latency,
      lastChecked: new Date()
    };
  } catch (error: any) {
    return {
      isConnected: false,
      blockHeight: null,
      latency: Date.now() - startTime,
      lastChecked: new Date(),
      error: error.message || 'Connection failed'
    };
  }
}

/**
 * Check event indexer status
 */
export async function checkEventIndexer(indexerUrl: string): Promise<boolean> {
  if (!indexerUrl) return false;

  try {
    const response = await fetch(`${indexerUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check overall blockchain readiness for the banking system
 * Only GYD is used for transactions, GYDS is monitored but not active
 */
export async function checkBlockchainReadiness(
  gydConfig: BlockchainNodeConfig,
  gydsConfig?: BlockchainNodeConfig
): Promise<BlockchainReadiness> {
  const gydStatus = await checkNodeStatus(gydConfig);
  
  let gydsStatus: NodeStatus | undefined;
  if (gydsConfig?.rpcEndpoint) {
    gydsStatus = await checkNodeStatus(gydsConfig);
  }

  // System is ready if GYD node is connected
  const isReady = gydStatus.isConnected;

  let message = '';
  if (isReady) {
    message = `GYD blockchain connected. Block height: ${gydStatus.blockHeight?.toLocaleString()}. Latency: ${gydStatus.latency}ms.`;
    if (gydsStatus?.isConnected) {
      message += ` GYDS monitoring active (read-only).`;
    }
  } else {
    message = `GYD blockchain not connected: ${gydStatus.error || 'Unknown error'}. Waiting for node configuration.`;
  }

  return {
    isReady,
    gyd: gydStatus,
    gyds: gydsStatus,
    activeNetwork: 'GYD',
    message
  };
}

/**
 * Format block number for display
 */
export function formatBlockNumber(blockNumber: number | null): string {
  if (blockNumber === null) return 'N/A';
  return blockNumber.toLocaleString();
}

/**
 * Format latency for display
 */
export function formatLatency(latency: number | null): string {
  if (latency === null) return 'N/A';
  if (latency < 100) return `${latency}ms (Excellent)`;
  if (latency < 300) return `${latency}ms (Good)`;
  if (latency < 1000) return `${latency}ms (Fair)`;
  return `${latency}ms (Slow)`;
}

/**
 * Get connection status color
 */
export function getStatusColor(isConnected: boolean): string {
  return isConnected ? 'text-green-500' : 'text-red-500';
}

/**
 * Subscribe to new blocks (for real-time updates)
 */
export function subscribeToBlocks(
  rpcEndpoint: string,
  callback: (blockNumber: number) => void,
  pollInterval: number = 12000 // Default 12 seconds (average block time)
): () => void {
  if (!rpcEndpoint) {
    return () => {};
  }

  const poll = async () => {
    try {
      const response = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      if (data.result) {
        const blockNumber = parseInt(data.result, 16);
        callback(blockNumber);
      }
    } catch (error) {
      console.error('Block polling error:', error);
    }
  };

  // Initial poll
  poll();

  // Set up interval
  const intervalId = setInterval(poll, pollInterval);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
