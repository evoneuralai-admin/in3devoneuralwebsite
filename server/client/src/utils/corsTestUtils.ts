// CORS Test Utilities
// Utils for testing CORS-related asset loading with fallback strategies

import { getApiBaseUrl } from './apiConfig';

/**
 * Test asset loading with fallback strategies
 */
export const testAssetLoading = async (assetUrl: string): Promise<{
  success: boolean;
  strategy: string;
  error?: string;
}> => {
  const strategies = [
    {
      name: 'Backend Proxy',
      url: `${getApiBaseUrl()}/proxy-asset?url=${encodeURIComponent(assetUrl)}`
    },
    {
      name: 'Direct URL',
      url: assetUrl
    }
  ];

  for (const strategy of strategies) {
    try {
      console.log(`🔄 Testing ${strategy.name}:`, strategy.url);
      
      const response = await fetch(strategy.url, {
        method: 'HEAD', // Use HEAD to avoid downloading the full asset
        mode: 'cors'
      });

      if (response.ok) {
        console.log(`✅ ${strategy.name} succeeded`);
        return {
          success: true,
          strategy: strategy.name
        };
      } else {
        console.warn(`⚠️ ${strategy.name} failed:`, response.status, response.statusText);
      }
    } catch (error) {
      console.warn(`⚠️ ${strategy.name} failed:`, error);
    }
  }

  return {
    success: false,
    strategy: 'None',
    error: 'All loading strategies failed'
  };
};

/**
 * Test multiple asset URLs for CORS compatibility
 */
export const testMultipleAssets = async (assetUrls: string[]): Promise<{
  totalTests: number;
  successes: number;
  failures: number;
  results: Array<{
    url: string;
    success: boolean;
    strategy: string;
    error?: string;
  }>;
}> => {
  const results = [];
  let successes = 0;
  let failures = 0;

  for (const url of assetUrls) {
    const result = await testAssetLoading(url);
    results.push({
      url,
      ...result
    });

    if (result.success) {
      successes++;
    } else {
      failures++;
    }
  }

  return {
    totalTests: assetUrls.length,
    successes,
    failures,
    results
  };
};

/**
 * Log CORS test results in a readable format
 */
export const logCorsTestResults = (results: any) => {
  console.log('\n🔍 CORS Test Results:');
  console.log('='.repeat(50));
  console.log(`Total tests: ${results.totalTests}`);
  console.log(`✅ Successes: ${results.successes}`);
  console.log(`❌ Failures: ${results.failures}`);
  console.log(`📊 Success rate: ${((results.successes / results.totalTests) * 100).toFixed(1)}%`);
  
  console.log('\nDetailed Results:');
  results.results.forEach((result: any, index: number) => {
    console.log(`\n${index + 1}. ${result.url.substring(0, 60)}...`);
    console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Strategy: ${result.strategy}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
}; 