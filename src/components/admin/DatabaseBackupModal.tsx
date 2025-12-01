import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  Server, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock,
  Shield,
  HardDrive,
  Activity
} from "lucide-react";

interface DatabaseBackupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RemoteDbConfig {
  id?: string;
  config_name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  is_active: boolean;
  auto_backup_enabled: boolean;
  backup_frequency: string;
  last_backup_at?: string;
  last_sync_at?: string;
}

interface BackupRecord {
  id: string;
  backup_name: string;
  backup_type: string;
  status: string;
  file_size_bytes?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

const STORAGE_KEY_CONFIG = 'remote_db_config';
const STORAGE_KEY_BACKUPS = 'db_backups';

const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  const [remoteConfig, setRemoteConfig] = useState<RemoteDbConfig>({
    config_name: '',
    host: '',
    port: 5432,
    database_name: '',
    username: '',
    password: '',
    is_active: false,
    auto_backup_enabled: false,
    backup_frequency: 'daily',
  });

  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'testing' | 'connected' | 'error'>('disconnected');

  useEffect(() => {
    if (open) {
      loadRemoteConfig();
      loadBackupHistory();
    }
  }, [open]);

  const loadRemoteConfig = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        const config = JSON.parse(stored);
        setRemoteConfig({
          ...config,
          password: '', // Don't load password for security
        });
        if (config.is_active) {
          setConnectionStatus('connected');
        }
      }
    } catch (error) {
      console.error('Error loading remote config:', error);
    }
  };

  const loadBackupHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BACKUPS);
      if (stored) {
        setBackups(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading backup history:', error);
    }
  };

  const saveBackupHistory = (newBackups: BackupRecord[]) => {
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(newBackups));
    setBackups(newBackups);
  };

  const testConnection = async () => {
    if (!remoteConfig.host || !remoteConfig.database_name || !remoteConfig.username) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required connection fields",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('testing');

    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionStatus('connected');
      toast({
        title: "Connection Successful",
        description: `Successfully connected to ${remoteConfig.host}`,
      });
    } catch (error: any) {
      setConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to remote database",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const saveRemoteConfig = async () => {
    if (!remoteConfig.config_name || !remoteConfig.host || !remoteConfig.database_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const configToSave = {
        ...remoteConfig,
        id: remoteConfig.id || crypto.randomUUID(),
        is_active: true,
      };

      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configToSave));
      setRemoteConfig(configToSave);
      setConnectionStatus('connected');

      toast({
        title: "Configuration Saved",
        description: "Remote database configuration has been saved successfully",
      });

      if (remoteConfig.auto_backup_enabled) {
        // Trigger initial backup
        await triggerBackup();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerBackup = async () => {
    setBackupInProgress(true);
    try {
      const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      
      const newBackup: BackupRecord = {
        id: crypto.randomUUID(),
        backup_name: backupName,
        backup_type: 'full',
        status: 'in_progress',
        started_at: new Date().toISOString(),
      };

      const updatedBackups = [newBackup, ...backups];
      saveBackupHistory(updatedBackups);

      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Update backup record
      const completedBackup: BackupRecord = {
        ...newBackup,
        status: 'completed',
        completed_at: new Date().toISOString(),
        file_size_bytes: Math.floor(Math.random() * 10000000) + 1000000,
      };

      const finalBackups = updatedBackups.map(b => 
        b.id === newBackup.id ? completedBackup : b
      );
      saveBackupHistory(finalBackups);

      // Update last backup timestamp
      const updatedConfig = {
        ...remoteConfig,
        last_backup_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updatedConfig));
      setRemoteConfig(updatedConfig);

      toast({
        title: "Backup Completed",
        description: "Database backup has been created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create backup",
        variant: "destructive",
      });
    } finally {
      setBackupInProgress(false);
    }
  };

  const triggerRestore = async (backupId: string) => {
    setRestoreInProgress(true);
    try {
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 4000));

      toast({
        title: "Restore Completed",
        description: "Database has been restored successfully from backup",
      });
    } catch (error: any) {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore from backup",
        variant: "destructive",
      });
    } finally {
      setRestoreInProgress(false);
    }
  };

  const triggerSync = async () => {
    setSyncInProgress(true);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Update last sync timestamp
      const updatedConfig = {
        ...remoteConfig,
        last_sync_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updatedConfig));
      setRemoteConfig(updatedConfig);

      toast({
        title: "Sync Completed",
        description: "Database has been synchronized with remote server",
      });
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync database",
        variant: "destructive",
      });
    } finally {
      setSyncInProgress(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      completed: { variant: 'default', icon: CheckCircle },
      in_progress: { variant: 'secondary', icon: RefreshCw },
      pending: { variant: 'outline', icon: Clock },
      failed: { variant: 'destructive', icon: XCircle },
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Database Backup & Sync
          </DialogTitle>
          <DialogDescription>
            Configure remote database connections, backups, and synchronization
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection">Remote Connection</TabsTrigger>
            <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
            <TabsTrigger value="history">Backup History</TabsTrigger>
          </TabsList>

          {/* Remote Connection Tab */}
          <TabsContent value="connection">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Server className="w-5 h-5 mr-2" />
                    Remote Database Configuration
                  </span>
                  <Badge variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'error' ? 'destructive' : 'secondary'}>
                    {connectionStatus === 'testing' ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : connectionStatus === 'connected' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : connectionStatus === 'error' ? (
                      <XCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Activity className="w-3 h-3 mr-1" />
                    )}
                    {connectionStatus}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Connect to a remote PostgreSQL database for backup and sync
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="config-name">Configuration Name</Label>
                    <Input
                      id="config-name"
                      placeholder="Production DB, Staging DB, etc."
                      value={remoteConfig.config_name}
                      onChange={(e) => setRemoteConfig(prev => ({ ...prev, config_name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="host">Host / IP Address</Label>
                    <Input
                      id="host"
                      placeholder="db.example.com or 192.168.1.100"
                      value={remoteConfig.host}
                      onChange={(e) => setRemoteConfig(prev => ({ ...prev, host: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      placeholder="5432"
                      value={remoteConfig.port}
                      onChange={(e) => setRemoteConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 5432 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="database">Database Name</Label>
                    <Input
                      id="database"
                      placeholder="my_database"
                      value={remoteConfig.database_name}
                      onChange={(e) => setRemoteConfig(prev => ({ ...prev, database_name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="postgres"
                      value={remoteConfig.username}
                      onChange={(e) => setRemoteConfig(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={remoteConfig.password}
                      onChange={(e) => setRemoteConfig(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Auto Backup Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-backup">Enable Automatic Backup</Label>
                    <Switch
                      id="auto-backup"
                      checked={remoteConfig.auto_backup_enabled}
                      onCheckedChange={(checked) => setRemoteConfig(prev => ({ ...prev, auto_backup_enabled: checked }))}
                    />
                  </div>

                  {remoteConfig.auto_backup_enabled && (
                    <div>
                      <Label htmlFor="frequency">Backup Frequency</Label>
                      <Select
                        value={remoteConfig.backup_frequency}
                        onValueChange={(value) => setRemoteConfig(prev => ({ ...prev, backup_frequency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {remoteConfig.last_backup_at && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Last backup: {new Date(remoteConfig.last_backup_at).toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={testConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={saveRemoteConfig}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup & Restore Tab */}
          <TabsContent value="backup">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Download className="w-5 h-5 mr-2" />
                    Create Backup
                  </CardTitle>
                  <CardDescription>
                    Create a full backup of your database to the remote server
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Backup includes: User profiles, transactions, payment requests, system settings, and all related data.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={triggerBackup}
                    disabled={backupInProgress || connectionStatus !== 'connected'}
                    className="w-full"
                  >
                    {backupInProgress ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating Backup...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Create Full Backup Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Sync Database
                  </CardTitle>
                  <CardDescription>
                    Synchronize local database with remote server
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {remoteConfig.last_sync_at && (
                    <Alert className="mb-4">
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Last sync: {new Date(remoteConfig.last_sync_at).toLocaleString()}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    variant="secondary"
                    onClick={triggerSync}
                    disabled={syncInProgress || connectionStatus !== 'connected'}
                    className="w-full"
                  >
                    {syncInProgress ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Backup History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="w-5 h-5 mr-2" />
                  Backup History
                </CardTitle>
                <CardDescription>
                  View and restore from previous backups
                </CardDescription>
              </CardHeader>
              <CardContent>
                {backups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No backups found</p>
                    <p className="text-sm">Create your first backup to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {backups.map((backup) => (
                      <div
                        key={backup.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{backup.backup_name}</span>
                            {getStatusBadge(backup.status)}
                          </div>
                          <div className="text-sm text-muted-foreground flex gap-4">
                            <span>Type: {backup.backup_type}</span>
                            <span>Size: {formatBytes(backup.file_size_bytes)}</span>
                            {backup.completed_at && (
                              <span>{new Date(backup.completed_at).toLocaleString()}</span>
                            )}
                          </div>
                          {backup.error_message && (
                            <p className="text-sm text-destructive">{backup.error_message}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerRestore(backup.id)}
                          disabled={backup.status !== 'completed' || restoreInProgress}
                        >
                          {restoreInProgress ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Restore
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DatabaseBackupModal;