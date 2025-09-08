import { useState, useEffect, useCallback } from 'react';

export interface CurrencyInfo {
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  KRW: { symbol: '₩', name: 'South Korean Won' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
  THB: { symbol: '฿', name: 'Thai Baht' },
  MXN: { symbol: '$', name: 'Mexican Peso' },
  BRL: { symbol: 'R$', name: 'Brazilian Real' },
  ZAR: { symbol: 'R', name: 'South African Rand' },
  SEK: { symbol: 'kr', name: 'Swedish Krona' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone' },
  DKK: { symbol: 'kr', name: 'Danish Krone' },
  PLN: { symbol: 'zł', name: 'Polish Zloty' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  SAR: { symbol: 'ر.س', name: 'Saudi Riyal' },
  QAR: { symbol: 'ر.ق', name: 'Qatari Riyal' },
  KWD: { symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  BHD: { symbol: '.د.ب', name: 'Bahraini Dinar' },
  OMR: { symbol: 'ر.ع.', name: 'Omani Rial' },
  EGP: { symbol: '£', name: 'Egyptian Pound' },
  TRY: { symbol: '₺', name: 'Turkish Lira' },
  RUB: { symbol: '₽', name: 'Russian Ruble' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar' },
  TWD: { symbol: 'NT$', name: 'Taiwan Dollar' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah' },
  PHP: { symbol: '₱', name: 'Philippine Peso' },
  VND: { symbol: '₫', name: 'Vietnamese Dong' },
  ILS: { symbol: '₪', name: 'Israeli Shekel' },
  CZK: { symbol: 'Kč', name: 'Czech Koruna' },
  HUF: { symbol: 'Ft', name: 'Hungarian Forint' },
  RON: { symbol: 'lei', name: 'Romanian Leu' },
  BGN: { symbol: 'лв', name: 'Bulgarian Lev' },
  HRK: { symbol: 'kn', name: 'Croatian Kuna' },
  ISK: { symbol: 'kr', name: 'Icelandic Krona' },
};

export interface ConvertedPrice {
  originalAmount: number;
  originalCurrency: string;
  amount: number;
  currency: string;
  symbol: string;
}

export interface UseCurrencyReturn {
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  convertPrice: (amount: number, fromCurrency: string) => Promise<ConvertedPrice | null>;
  formatPrice: (amount: number, currency?: string) => string;
  isLoading: boolean;
  error: string | null;
}

// Get user's preferred currency from localStorage or browser locale
function getDefaultCurrency(): string {
  try {
    // Check localStorage first
    const saved = localStorage.getItem('preferredCurrency');
    if (saved && SUPPORTED_CURRENCIES[saved]) {
      return saved;
    }

    // Try to detect from browser locale
    const locale = navigator.language || navigator.languages?.[0] || 'en-US';
    
    if (locale.includes('en-US') || locale.includes('en-CA')) return 'USD';
    if (locale.includes('en-GB')) return 'GBP';
    if (locale.includes('de') || locale.includes('fr') || locale.includes('es') || locale.includes('it')) return 'EUR';
    if (locale.includes('ja')) return 'JPY';
    if (locale.includes('zh')) return 'CNY';
    if (locale.includes('ko')) return 'KRW';
    if (locale.includes('hi') || locale.includes('en-IN')) return 'INR';
    if (locale.includes('th')) return 'THB';
    if (locale.includes('pt-BR')) return 'BRL';
    if (locale.includes('sv')) return 'SEK';
    if (locale.includes('no')) return 'NOK';
    if (locale.includes('da')) return 'DKK';
    if (locale.includes('pl')) return 'PLN';
    if (locale.includes('ar-AE') || locale.includes('en-AE')) return 'AED';
    if (locale.includes('ar-SA') || locale.includes('en-SA')) return 'SAR';
    if (locale.includes('ar-QA') || locale.includes('en-QA')) return 'QAR';
    if (locale.includes('ar-KW') || locale.includes('en-KW')) return 'KWD';
    if (locale.includes('ar-BH') || locale.includes('en-BH')) return 'BHD';
    if (locale.includes('ar-OM') || locale.includes('en-OM')) return 'OMR';
    if (locale.includes('ar-EG') || locale.includes('en-EG')) return 'EGP';
    if (locale.includes('tr')) return 'TRY';
    if (locale.includes('ru')) return 'RUB';
    if (locale.includes('en-AU')) return 'AUD';
    if (locale.includes('en-NZ')) return 'NZD';
    if (locale.includes('zh-TW')) return 'TWD';
    if (locale.includes('ms') || locale.includes('en-MY')) return 'MYR';
    if (locale.includes('id') || locale.includes('en-ID')) return 'IDR';
    if (locale.includes('tl') || locale.includes('en-PH')) return 'PHP';
    if (locale.includes('vi') || locale.includes('en-VN')) return 'VND';
    if (locale.includes('he') || locale.includes('en-IL')) return 'ILS';
    if (locale.includes('cs') || locale.includes('en-CZ')) return 'CZK';
    if (locale.includes('hu') || locale.includes('en-HU')) return 'HUF';
    if (locale.includes('ro') || locale.includes('en-RO')) return 'RON';
    if (locale.includes('bg') || locale.includes('en-BG')) return 'BGN';
    if (locale.includes('hr') || locale.includes('en-HR')) return 'HRK';
    if (locale.includes('is') || locale.includes('en-IS')) return 'ISK';
    
    return 'USD'; // Default fallback
  } catch {
    return 'USD';
  }
}

export function useCurrency(): UseCurrencyReturn {
  const [selectedCurrency, setSelectedCurrencyState] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize currency on mount
  useEffect(() => {
    const defaultCurrency = getDefaultCurrency();
    setSelectedCurrencyState(defaultCurrency);
  }, []);

  // Save currency preference
  const setSelectedCurrency = useCallback((currency: string) => {
    if (SUPPORTED_CURRENCIES[currency]) {
      setSelectedCurrencyState(currency);
      try {
        localStorage.setItem('preferredCurrency', currency);
      } catch (error) {
        console.warn('Failed to save currency preference:', error);
      }
    }
  }, []);

  // Convert a single price
  const convertPrice = useCallback(async (amount: number, fromCurrency: string): Promise<ConvertedPrice | null> => {
    if (fromCurrency === selectedCurrency) {
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        amount: amount,
        currency: selectedCurrency,
        symbol: SUPPORTED_CURRENCIES[selectedCurrency].symbol
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/currency/convert?from=${fromCurrency}&to=${selectedCurrency}&amount=${amount}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Currency conversion failed');
      }

      const data = await response.json();
      
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        amount: data.to.amount,
        currency: data.to.currency,
        symbol: data.to.symbol
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert currency';
      setError(errorMessage);
      console.error('Currency conversion error:', err);
      
      // Return original price as fallback
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        amount: amount,
        currency: fromCurrency,
        symbol: SUPPORTED_CURRENCIES[fromCurrency]?.symbol || fromCurrency
      };
    } finally {
      setIsLoading(false);
    }
  }, [selectedCurrency]);

  // Format price with currency symbol
  const formatPrice = useCallback((amount: number, currency?: string): string => {
    const currencyCode = currency || selectedCurrency;
    const currencyInfo = SUPPORTED_CURRENCIES[currencyCode];
    
    if (!currencyInfo) {
      return `${currencyCode} ${amount.toFixed(2)}`;
    }

    // Format based on currency
    if (currencyCode === 'JPY' || currencyCode === 'KRW') {
      // No decimal places for JPY and KRW
      return `${currencyInfo.symbol}${Math.round(amount).toLocaleString()}`;
    }
    
    return `${currencyInfo.symbol}${amount.toFixed(2)}`;
  }, [selectedCurrency]);

  return {
    selectedCurrency,
    setSelectedCurrency,
    convertPrice,
    formatPrice,
    isLoading,
    error
  };
}
