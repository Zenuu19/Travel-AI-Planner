'use client';

import { useState, useEffect } from 'react';
import { useCurrency, SUPPORTED_CURRENCIES } from '@/hooks/useCurrency';
import { LoaderIcon } from 'lucide-react';

interface PriceDisplayProps {
  amount: number | string;
  currency: string;
  className?: string;
  showOriginal?: boolean;
  prefix?: string;
  suffix?: string;
}

export function PriceDisplay({ 
  amount, 
  currency, 
  className = '', 
  showOriginal = false,
  prefix = '',
  suffix = ''
}: PriceDisplayProps) {
  const { selectedCurrency, convertPrice, formatPrice, isLoading } = useCurrency();
  const [convertedPrice, setConvertedPrice] = useState<{
    amount: number;
    currency: string;
    symbol: string;
  } | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const cleanCurrency = currency?.toUpperCase() || 'USD';

  useEffect(() => {
    if (!numericAmount || numericAmount <= 0) {
      return;
    }

    if (cleanCurrency === selectedCurrency) {
      setConvertedPrice({
        amount: numericAmount,
        currency: selectedCurrency,
        symbol: SUPPORTED_CURRENCIES[selectedCurrency]?.symbol || selectedCurrency
      });
      return;
    }

    let isMounted = true;
    setIsConverting(true);

    convertPrice(numericAmount, cleanCurrency)
      .then((result) => {
        if (isMounted && result) {
          setConvertedPrice({
            amount: result.amount,
            currency: result.currency,
            symbol: result.symbol
          });
        }
      })
      .catch((error) => {
        console.error('Price conversion failed:', error);
        if (isMounted) {
          // Fallback to original price
          setConvertedPrice({
            amount: numericAmount,
            currency: cleanCurrency,
            symbol: SUPPORTED_CURRENCIES[cleanCurrency]?.symbol || cleanCurrency
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsConverting(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [numericAmount, cleanCurrency, selectedCurrency, convertPrice]);

  if (!numericAmount || numericAmount <= 0) {
    return (
      <span className={className}>
        {prefix}Price not available{suffix}
      </span>
    );
  }

  if (isConverting) {
    return (
      <span className={`flex items-center ${className}`}>
        <LoaderIcon className="w-4 h-4 animate-spin mr-1" />
        Converting...
      </span>
    );
  }

  const displayPrice = convertedPrice || {
    amount: numericAmount,
    currency: cleanCurrency,
    symbol: SUPPORTED_CURRENCIES[cleanCurrency]?.symbol || cleanCurrency
  };

  const formattedPrice = formatPrice(displayPrice.amount, displayPrice.currency);

  return (
    <span className={className}>
      {prefix}
      {formattedPrice}
      {showOriginal && cleanCurrency !== selectedCurrency && (
        <span className="text-xs text-gray-500 ml-1">
          (orig. {SUPPORTED_CURRENCIES[cleanCurrency]?.symbol || cleanCurrency}{numericAmount.toFixed(2)})
        </span>
      )}
      {suffix}
    </span>
  );
}

interface PriceRangeDisplayProps {
  minAmount?: number | string;
  maxAmount?: number | string;
  currency: string;
  className?: string;
  separator?: string;
}

export function PriceRangeDisplay({
  minAmount,
  maxAmount,
  currency,
  className = '',
  separator = ' - '
}: PriceRangeDisplayProps) {
  if (!minAmount && !maxAmount) {
    return <span className={className}>Price range not available</span>;
  }

  if (!maxAmount || minAmount === maxAmount) {
    return (
      <PriceDisplay 
        amount={minAmount || maxAmount || 0} 
        currency={currency} 
        className={className} 
      />
    );
  }

  return (
    <span className={className}>
      <PriceDisplay amount={minAmount || 0} currency={currency} />
      {separator}
      <PriceDisplay amount={maxAmount} currency={currency} />
    </span>
  );
}
