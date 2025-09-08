import { NextRequest, NextResponse } from 'next/server';

// Exchange rates API (using a free service)
const EXCHANGE_RATES_API = 'https://api.exchangerate-api.com/v4/latest/USD';

// Cache exchange rates for 1 hour
let exchangeRatesCache: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Popular currencies for travel
export const SUPPORTED_CURRENCIES = {
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

async function fetchExchangeRates(): Promise<Record<string, number> | null> {
  try {
    // Check cache first
    if (exchangeRatesCache && Date.now() - exchangeRatesCache.timestamp < CACHE_DURATION) {
      return exchangeRatesCache.rates;
    }

    console.log('Fetching fresh exchange rates...');
    const response = await fetch(EXCHANGE_RATES_API);
    
    if (!response.ok) {
      console.error('Failed to fetch exchange rates:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Update cache
    exchangeRatesCache = {
      rates: data.rates,
      timestamp: Date.now()
    };

    console.log('Exchange rates updated successfully');
    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

export function convertCurrency(
  amount: number, 
  fromCurrency: string, 
  toCurrency: string, 
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Convert from source currency to USD first, then to target currency
  const usdAmount = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency];
  const convertedAmount = toCurrency === 'USD' ? usdAmount : usdAmount * rates[toCurrency];
  
  return parseFloat(convertedAmount.toFixed(2));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from')?.toUpperCase() || 'USD';
    const to = searchParams.get('to')?.toUpperCase() || 'USD';
    const amount = parseFloat(searchParams.get('amount') || '1');

    // Validate currencies
    if (!SUPPORTED_CURRENCIES[from as keyof typeof SUPPORTED_CURRENCIES] || 
        !SUPPORTED_CURRENCIES[to as keyof typeof SUPPORTED_CURRENCIES]) {
      return NextResponse.json({ 
        error: 'Unsupported currency. Check supported currencies list.' 
      }, { status: 400 });
    }

    // Get exchange rates
    const rates = await fetchExchangeRates();
    if (!rates) {
      return NextResponse.json({ 
        error: 'Unable to fetch current exchange rates. Please try again later.' 
      }, { status: 503 });
    }

    // Convert currency
    const convertedAmount = convertCurrency(amount, from, to, rates);

    return NextResponse.json({
      success: true,
      from: {
        currency: from,
        amount: amount,
        symbol: SUPPORTED_CURRENCIES[from as keyof typeof SUPPORTED_CURRENCIES].symbol
      },
      to: {
        currency: to,
        amount: convertedAmount,
        symbol: SUPPORTED_CURRENCIES[to as keyof typeof SUPPORTED_CURRENCIES].symbol
      },
      rate: convertCurrency(1, from, to, rates),
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json({ 
      error: 'Failed to convert currency' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prices, targetCurrency } = await request.json();

    if (!Array.isArray(prices) || !targetCurrency) {
      return NextResponse.json({ 
        error: 'Invalid request. Provide prices array and targetCurrency.' 
      }, { status: 400 });
    }

    // Validate target currency
    if (!SUPPORTED_CURRENCIES[targetCurrency.toUpperCase() as keyof typeof SUPPORTED_CURRENCIES]) {
      return NextResponse.json({ 
        error: 'Unsupported target currency.' 
      }, { status: 400 });
    }

    // Get exchange rates
    const rates = await fetchExchangeRates();
    if (!rates) {
      return NextResponse.json({ 
        error: 'Unable to fetch current exchange rates. Please try again later.' 
      }, { status: 503 });
    }

    // Convert all prices
    const convertedPrices = prices.map((priceItem: any) => {
      const { amount, currency, ...rest } = priceItem;
      
      if (!amount || !currency) {
        return { ...priceItem, error: 'Missing amount or currency' };
      }

      const convertedAmount = convertCurrency(
        parseFloat(amount), 
        currency.toUpperCase(), 
        targetCurrency.toUpperCase(), 
        rates
      );

      return {
        ...rest,
        originalAmount: amount,
        originalCurrency: currency,
        amount: convertedAmount,
        currency: targetCurrency.toUpperCase(),
        symbol: SUPPORTED_CURRENCIES[targetCurrency.toUpperCase() as keyof typeof SUPPORTED_CURRENCIES].symbol
      };
    });

    return NextResponse.json({
      success: true,
      convertedPrices,
      targetCurrency: targetCurrency.toUpperCase(),
      targetSymbol: SUPPORTED_CURRENCIES[targetCurrency.toUpperCase() as keyof typeof SUPPORTED_CURRENCIES].symbol,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Batch currency conversion error:', error);
    return NextResponse.json({ 
      error: 'Failed to convert currencies' 
    }, { status: 500 });
  }
}
