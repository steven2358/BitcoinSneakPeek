// Bitcoin balance providers for Bitcoin Sneak Peek
// Each provider implements: name, explorerUrl, fetchBalance(address)

const SATOSHI_DIVISOR = 100000000;

const providers = [
  {
    name: 'Blockchain.com',
    explorerUrl: 'https://www.blockchain.com/explorer/addresses/btc',
    async fetchBalance(address) {
      const response = await fetch(
        `https://blockchain.info/balance?active=${address}&cors=true`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const addrData = data[address];
      if (!addrData) throw new Error('Address not found in response');
      return {
        balance: addrData.final_balance / SATOSHI_DIVISOR,
        received: addrData.total_received / SATOSHI_DIVISOR
      };
    }
  },

  {
    name: 'Mempool.space',
    explorerUrl: 'https://mempool.space/address',
    async fetchBalance(address) {
      const response = await fetch(
        `https://mempool.space/api/address/${address}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const stats = data.chain_stats;
      return {
        balance: (stats.funded_txo_sum - stats.spent_txo_sum) / SATOSHI_DIVISOR,
        received: stats.funded_txo_sum / SATOSHI_DIVISOR
      };
    }
  },

  {
    name: 'Blockstream.info',
    explorerUrl: 'https://blockstream.info/address',
    async fetchBalance(address) {
      const response = await fetch(
        `https://blockstream.info/api/address/${address}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const stats = data.chain_stats;
      return {
        balance: (stats.funded_txo_sum - stats.spent_txo_sum) / SATOSHI_DIVISOR,
        received: stats.funded_txo_sum / SATOSHI_DIVISOR
      };
    }
  },

  {
    name: 'BlockCypher',
    explorerUrl: 'https://live.blockcypher.com/btc/address',
    async fetchBalance(address) {
      const response = await fetch(
        `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return {
        balance: data.final_balance / SATOSHI_DIVISOR,
        received: data.total_received / SATOSHI_DIVISOR
      };
    }
  }
];

// Fetch balance with automatic fallback through providers
// Set skipCount to skip N providers (for testing fallbacks)
async function fetchBalanceWithFallback(address, skipCount = 0) {
  const errors = [];
  const providersToTry = skipCount > 0 ? providers.slice(skipCount) : providers;

  if (skipCount > 0) {
    const skipped = providers.slice(0, skipCount).map(p => p.name).join(', ');
    console.log(`[BitcoinSneakPeek] Skipping ${skipCount} provider(s): ${skipped}`);
  }

  for (const provider of providersToTry) {
    try {
      console.log(`[BitcoinSneakPeek] Trying ${provider.name}...`);
      const result = await provider.fetchBalance(address);
      console.log(`[BitcoinSneakPeek] Success with ${provider.name}`);
      return {
        success: true,
        source: provider.name,
        balance: result.balance,
        received: result.received,
        url: `${provider.explorerUrl}/${address}`
      };
    } catch (error) {
      const errMsg = `${provider.name}: ${error.message}`;
      errors.push(errMsg);
      console.log(`[BitcoinSneakPeek] ${errMsg}`);
    }
  }

  console.error('[BitcoinSneakPeek] All providers failed:', errors);
  return {
    success: false,
    error: 'All providers failed: ' + errors.join('; ')
  };
}
