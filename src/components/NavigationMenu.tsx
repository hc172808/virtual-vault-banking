import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
  Lock,
  CreditCard,
  History,
  DollarSign,
  Settings,
  User,
  FileCheck,
  Headphones,
  Shield,
  Wrench,
  BarChart3
} from "lucide-react";

interface NavigationMenuProps {
  userRole: string;
  onMenuItemClick: (item: string) => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({ userRole, onMenuItemClick }) => {
  const [open, setOpen] = useState(false);

  const menuItems = [
    { id: 'pin', label: 'PIN Settings', icon: Lock, roles: ['CLIENT', 'AGENT', 'ADMIN'] },
    { id: 'card', label: 'Card Details', icon: CreditCard, roles: ['CLIENT', 'AGENT', 'ADMIN'] },
    { id: 'history', label: 'Transaction History', icon: History, roles: ['CLIENT', 'AGENT', 'ADMIN'] },
    { id: 'requests', label: 'Payment Requests', icon: DollarSign, roles: ['CLIENT', 'AGENT', 'ADMIN'] },
    { id: 'settings', label: 'Account Settings', icon: Settings, roles: ['CLIENT', 'AGENT', 'ADMIN'] },
    { id: 'profile', label: 'Manage Profile', icon: User, roles: ['CLIENT', 'AGENT', 'ADMIN'] },
    { id: 'kyc', label: 'KYC Review', icon: FileCheck, roles: ['AGENT', 'ADMIN'] },
    { id: 'agent-tools', label: 'Agent Tools', icon: Wrench, roles: ['AGENT', 'ADMIN'] },
    { id: 'support', label: 'Client Support', icon: Headphones, roles: ['AGENT', 'ADMIN'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN'] },
    { id: 'admin', label: 'Admin Controls', icon: Shield, roles: ['ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  const handleMenuItemClick = (itemId: string) => {
    onMenuItemClick(itemId);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            Access your banking features
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-1">
            {filteredMenuItems.map((item, index) => (
              <React.Fragment key={item.id}>
                {(item.id === 'kyc' || item.id === 'analytics') && index > 0 && (
                  <Separator className="my-2" />
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() => handleMenuItemClick(item.id)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NavigationMenu;
