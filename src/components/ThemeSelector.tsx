import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Check, Palette, Moon, Sun } from 'lucide-react';
import {
  themes,
  getStoredTheme,
  getStoredMode,
  setStoredTheme,
  setStoredMode,
  applyTheme,
} from '@/lib/themeManager';
import { useToast } from '@/hooks/use-toast';

interface ThemeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState(getStoredTheme());
  const [isDarkMode, setIsDarkMode] = useState(getStoredMode() === 'dark');

  useEffect(() => {
    if (open) {
      setSelectedTheme(getStoredTheme());
      setIsDarkMode(getStoredMode() === 'dark');
    }
  }, [open]);

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    const mode = isDarkMode ? 'dark' : 'light';
    applyTheme(themeId, mode);
    setStoredTheme(themeId);
    
    const theme = themes.find(t => t.id === themeId);
    toast({
      title: 'Theme Changed',
      description: `Switched to ${theme?.name || themeId} theme`,
    });
  };

  const handleModeToggle = (dark: boolean) => {
    setIsDarkMode(dark);
    const mode = dark ? 'dark' : 'light';
    applyTheme(selectedTheme, mode);
    setStoredMode(mode);
    
    toast({
      title: 'Mode Changed',
      description: `Switched to ${dark ? 'dark' : 'light'} mode`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme & Appearance
          </DialogTitle>
          <DialogDescription>
            Customize how your banking app looks and feels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dark Mode Toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Moon className="w-5 h-5 text-primary" />
                  ) : (
                    <Sun className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <Label htmlFor="dark-mode" className="text-base font-medium">
                      Dark Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isDarkMode ? 'Easier on the eyes at night' : 'Classic light appearance'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="dark-mode"
                  checked={isDarkMode}
                  onCheckedChange={handleModeToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Theme Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Color Theme
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themes.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                const previewColors = isDarkMode ? theme.dark : theme.light;
                
                return (
                  <Card
                    key={theme.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleThemeSelect(theme.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{theme.icon}</span>
                          <div>
                            <h3 className="font-medium">{theme.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {theme.description}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      
                      {/* Color Preview */}
                      <div className="flex gap-1 mt-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: `hsl(${previewColors.primary})` }}
                          title="Primary"
                        />
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: `hsl(${previewColors.accent})` }}
                          title="Accent"
                        />
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: `hsl(${previewColors.secondary})` }}
                          title="Secondary"
                        />
                        <div
                          className="w-6 h-6 rounded-full border"
                          style={{ 
                            backgroundColor: `hsl(${previewColors.background})`,
                            borderColor: `hsl(${previewColors.border})`
                          }}
                          title="Background"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Preview Section */}
          <Card>
            <CardContent className="pt-6">
              <Label className="text-base font-medium mb-3 block">
                Live Preview
              </Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button>Primary Button</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm">Destructive</Button>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-success-foreground">
                    Success
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-warning-foreground">
                    Warning
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is how your app will look with the selected theme.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeSelector;
