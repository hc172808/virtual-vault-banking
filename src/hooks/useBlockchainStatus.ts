import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BlockchainReadiness,
  BlockchainNodeConfig,
  checkBlockchainReadiness,
  DEFAULT_GYD_CONFIG,
  DEFAULT_GYDS_CONFIG
} from '@/lib/blockchainStatus';

interface UseBlockchainStatusReturn {
  status: BlockchainReadiness | null;
  isLoading: boolean;
  isReady: boolean;
  gydConfig: BlockchainNodeConfig;
  gydsConfig: BlockchainNodeConfig;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useBlockchainStatus(): UseBlockchainStatusReturn {
  const [status, setStatus] = useState<BlockchainReadiness | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gydConfig, setGydConfig] = useState<BlockchainNodeConfig>(DEFAULT_GYD_CONFIG);
  const [gydsConfig, setGydsConfig] = useState<BlockchainNodeConfig>(DEFAULT_GYDS_CONFIG);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      // Load blockchain configuration from system_settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'blockchain_rpc',
          'blockchain_chain_id',
          'blockchain_event_indexer',
          'gyds_rpc',
          'gyds_chain_id',
          'gyds_event_indexer'
        ]);

      if (settings) {
        const settingsMap: Record<string, string> = {};
        settings.forEach(s => {
          settingsMap[s.setting_key] = s.setting_value;
        });

        // Configure GYD (primary)
        const newGydConfig: BlockchainNodeConfig = {
          ...DEFAULT_GYD_CONFIG,
          rpcEndpoint: settingsMap['blockchain_rpc'] || '',
          chainId: settingsMap['blockchain_chain_id'] || '1',
          eventIndexer: settingsMap['blockchain_event_indexer'] || ''
        };
        setGydConfig(newGydConfig);

        // Configure GYDS (secondary/monitoring)
        const newGydsConfig: BlockchainNodeConfig = {
          ...DEFAULT_GYDS_CONFIG,
          rpcEndpoint: settingsMap['gyds_rpc'] || '',
          chainId: settingsMap['gyds_chain_id'] || '1',
          eventIndexer: settingsMap['gyds_event_indexer'] || ''
        };
        setGydsConfig(newGydsConfig);

        return { gydConfig: newGydConfig, gydsConfig: newGydsConfig };
      }

      return { gydConfig: DEFAULT_GYD_CONFIG, gydsConfig: DEFAULT_GYDS_CONFIG };
    } catch (error) {
      console.error('Error loading blockchain config:', error);
      return { gydConfig: DEFAULT_GYD_CONFIG, gydsConfig: DEFAULT_GYDS_CONFIG };
    }
  }, []);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { gydConfig, gydsConfig } = await loadConfig();
      const readiness = await checkBlockchainReadiness(gydConfig, gydsConfig);
      setStatus(readiness);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error checking blockchain status:', error);
      setStatus({
        isReady: false,
        gyd: {
          isConnected: false,
          blockHeight: null,
          latency: null,
          lastChecked: new Date(),
          error: 'Failed to check status'
        },
        activeNetwork: 'GYD',
        message: 'Failed to check blockchain status'
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadConfig]);

  useEffect(() => {
    checkStatus();

    // Re-check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    // Subscribe to settings changes
    const channel = supabase
      .channel('blockchain-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'setting_key=in.(blockchain_rpc,blockchain_chain_id,gyds_rpc,gyds_chain_id)'
        },
        () => {
          console.log('Blockchain settings changed, refreshing status...');
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [checkStatus]);

  return {
    status,
    isLoading,
    isReady: status?.isReady ?? false,
    gydConfig,
    gydsConfig,
    refresh: checkStatus,
    lastUpdated
  };
}
