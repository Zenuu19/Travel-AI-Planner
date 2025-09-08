'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCurrency, SUPPORTED_CURRENCIES } from '@/hooks/useCurrency';
import { Globe2Icon } from 'lucide-react';

interface CurrencySelectorProps {
  className?: string;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function CurrencySelector({ 
  className = '', 
  label = 'Display Currency',
  showLabel = true,
  size = 'default'
}: CurrencySelectorProps) {
  const { selectedCurrency, setSelectedCurrency } = useCurrency();

  const sizeClasses = {
    sm: 'h-8 text-sm',
    default: 'h-10',
    lg: 'h-12 text-lg'
  };

  return (
    <div className={className}>
      {showLabel && (
        <Label htmlFor="currency-selector" className="text-sm font-medium">
          {label}
        </Label>
      )}
      <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
        <SelectTrigger 
          id="currency-selector"
          className={`${sizeClasses[size]} ${showLabel ? 'mt-1' : ''}`}
        >
          <div className="flex items-center">
            <Globe2Icon className="w-4 h-4 mr-2 text-gray-500" />
            <SelectValue placeholder="Select currency">
              {SUPPORTED_CURRENCIES[selectedCurrency]?.symbol} {selectedCurrency}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
            <SelectItem key={code} value={code}>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm w-8">{info.symbol}</span>
                <span className="font-medium">{code}</span>
                <span className="text-gray-500 text-sm">- {info.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
