import React from 'react';
import { useBlockchainStatus } from '@/hooks/useBlockchainStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';

interface BlockchainStatusIndicatorProps {
  compact?: boolean;
}

export const BlockchainStatusIndicator: React.FC<BlockchainStatusIndicatorProps> = ({ 
  compact = false 
}) => {
  const { status, isLoading, isReady, refresh, lastUpdated, gydConfig, gydsConfig } = useBlockchainStatus();

  const getStatusColor = () => {
    if (isLoading) return 'bg-muted text-muted-foreground';
    if (isReady) return 'bg-success/10 text-success border-success/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="w-3 h-3 animate-spin" />;
    if (isReady) return <Wifi className="w-3 h-3" />;
    return <WifiOff className="w-3 h-3" />;
  };

  const formatLatency = (ms: number | null) => {
    if (ms === null) return 'N/A';
    if (ms < 100) return `${ms}ms (Excellent)`;
    if (ms < 300) return `${ms}ms (Good)`;
    if (ms < 500) return `${ms}ms (Fair)`;
    return `${ms}ms (Slow)`;
  };

  const formatBlockHeight = (height: number | null) => {
    if (height === null) return 'N/A';
    return height.toLocaleString();
  };

  if (compact) {
    return (
      <Badge 
        variant="outline" 
        className={`${getStatusColor()} cursor-pointer transition-colors`}
        onClick={() => refresh()}
      >
        {getStatusIcon()}
        <span className="ml-1.5 text-xs">
          {isLoading ? 'Checking' : isReady ? 'GYD Connected' : 'Offline'}
        </span>
      </Badge>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant="outline" 
          className={`${getStatusColor()} cursor-pointer transition-colors hover:opacity-80`}
        >
          {getStatusIcon()}
          <span className="ml-1.5 text-xs">
            {isLoading ? 'Checking' : isReady ? 'GYD' : 'Offline'}
          </span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary" />
              <h4 className="font-medium">Blockchain Status</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refresh()}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Overall Status */}
          <div className={`p-3 rounded-lg ${isReady ? 'bg-success/10' : 'bg-destructive/10'}`}>
            <div className="flex items-center space-x-2">
              {isReady ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className={`font-medium ${isReady ? 'text-success' : 'text-destructive'}`}>
                  {isReady ? 'System Ready' : 'System Offline'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {status?.message || 'Checking connection...'}
                </p>
              </div>
            </div>
          </div>

          {/* GYD Node (Primary) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">GYD Node (Primary)</span>
              <Badge variant={status?.gyd?.isConnected ? 'default' : 'destructive'} className="text-xs">
                {status?.gyd?.isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            {status?.gyd && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Block Height</p>
                  <p className="font-mono">{formatBlockHeight(status.gyd.blockHeight)}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Latency</p>
                  <p className="font-mono">{formatLatency(status.gyd.latency)}</p>
                </div>
              </div>
            )}
            {status?.gyd?.error && (
              <p className="text-xs text-destructive">{status.gyd.error}</p>
            )}
          </div>

          {/* GYDS Node (Monitoring) */}
          {status?.gyds && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">GYDS Node (Monitor)</span>
                <Badge variant={status.gyds.isConnected ? 'outline' : 'secondary'} className="text-xs">
                  {status.gyds.isConnected ? 'Connected' : 'Optional'}
                </Badge>
              </div>
              {status.gyds.isConnected && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-muted-foreground">Block Height</p>
                    <p className="font-mono">{formatBlockHeight(status.gyds.blockHeight)}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-muted-foreground">Latency</p>
                    <p className="font-mono">{formatLatency(status.gyds.latency)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Network */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Active Network</span>
            <span className="text-xs font-medium">{status?.activeNetwork || 'GYD'}</span>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BlockchainStatusIndicator;
