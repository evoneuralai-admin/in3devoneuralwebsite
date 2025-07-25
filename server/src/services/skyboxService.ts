import { BlockadeLabsSdk } from '@blockadelabs/sdk';
import { env } from '../config/env';

// Cache for skybox styles to reduce API calls
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Skybox Style Interface
export interface SkyboxStyle {
  id: number;
  name: string;
  description?: string;
  preview_image_url?: string;
  category?: string;
  model?: string;
  image_jpg?: string;
  image_webp?: string;
}

// Pagination Interface
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Skybox Generation Interface
export interface SkyboxGenerationRequest {
  prompt: string;
  skybox_style_id: number;
  remix_imagine_id?: string;
  webhook_url?: string;
  negative_text?: string;
}

// Skybox Generation Response - Updated to match SDK types
export interface SkyboxGenerationResponse {
  id: number; // Changed from string to number to match SDK
  status: 'pending' | 'complete' | 'failed';
  file_url?: string;
  title?: string;
  prompt?: string;
  created_at?: string;
  type?: string;
  skybox_style_id?: number;
  skybox_style_name?: string;
  queue_position?: number;
  thumb_url?: string;
  user_id?: number;
  username?: string;
  obfuscated_id?: string;
  pusher_channel?: string;
  depth_map_url?: string;
}

// API Response Interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationInfo;
}

class SkyboxService {
  private sdk: BlockadeLabsSdk;
  private stylesCache: CacheEntry<SkyboxStyle[]> | null = null;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    if (!env.API_KEY) {
      throw new Error('BlockadeLabs API key is required');
    }
    this.sdk = new BlockadeLabsSdk({ api_key: env.API_KEY });
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cache: CacheEntry<any>): boolean {
    return Date.now() - cache.timestamp < cache.ttl;
  }

  /**
   * Paginate styles array
   */
  private paginateStyles(styles: SkyboxStyle[], page: number, limit: number): {
    styles: SkyboxStyle[];
    pagination: PaginationInfo;
  } {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStyles = styles.slice(startIndex, endIndex);
    const total = styles.length;
    const totalPages = Math.ceil(total / limit);

    return {
      styles: paginatedStyles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get skybox styles with caching and pagination
   */
  async getSkyboxStyles(page: number = 1, limit: number = 20): Promise<{
    styles: SkyboxStyle[];
    pagination: PaginationInfo;
  }> {
    try {
      // Validate pagination parameters
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;

      // Check cache first
      if (this.stylesCache && this.isCacheValid(this.stylesCache)) {
        console.log('Returning cached skybox styles');
        return this.paginateStyles(this.stylesCache.data, page, limit);
      }

      console.log('Fetching fresh skybox styles from BlockadeLabs API');
      const styles = await this.sdk.getSkyboxStyles();
      
      // Cache the results
      this.stylesCache = {
        data: styles,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      };

      console.log(`Fetched ${styles.length} skybox styles from API`);
      return this.paginateStyles(styles, page, limit);
    } catch (error) {
      console.error('Error fetching skybox styles:', error);
      throw new Error(`Failed to fetch skybox styles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a new skybox
   */
  async generateSkybox(request: SkyboxGenerationRequest): Promise<SkyboxGenerationResponse> {
    console.log('🌅 [DEBUG] skyboxService.generateSkybox called');
    console.log('🌅 [DEBUG] Request details:', {
      prompt: request.prompt.substring(0, 50) + (request.prompt.length > 50 ? '...' : ''),
      promptLength: request.prompt.length,
      skybox_style_id: request.skybox_style_id,
      hasRemixId: !!request.remix_imagine_id,
      hasWebhookUrl: !!request.webhook_url,
      hasNegativeText: !!request.negative_text,
      negativeTextLength: request.negative_text?.length
    });

    try {
      // Validate required fields
      if (!request.prompt || request.prompt.trim().length === 0) {
        console.error('❌ [DEBUG] Validation failed - prompt is empty');
        throw new Error('Prompt is required');
      }

      if (!request.skybox_style_id || request.skybox_style_id <= 0) {
        console.error('❌ [DEBUG] Validation failed - invalid skybox_style_id:', request.skybox_style_id);
        throw new Error('Valid skybox_style_id is required');
      }

      // Validate prompt length
      if (request.prompt.length < 3 || request.prompt.length > 1000) {
        console.error('❌ [DEBUG] Validation failed - prompt length:', request.prompt.length);
        throw new Error('Prompt must be between 3 and 1000 characters');
      }

      console.log('✅ [DEBUG] Request validation passed');
      console.log('🌅 [DEBUG] Generating skybox with parameters:', {
        prompt: request.prompt.substring(0, 50) + '...',
        skybox_style_id: request.skybox_style_id,
        has_remix: !!request.remix_imagine_id,
        has_webhook: !!request.webhook_url
      });

      console.log('📡 [DEBUG] Calling Blockade Labs SDK...');
      const startTime = Date.now();
      
      const generation = await this.sdk.generateSkybox({
        prompt: request.prompt.trim(),
        skybox_style_id: request.skybox_style_id,
        remix_id: request.remix_imagine_id ? parseInt(request.remix_imagine_id) : undefined,
        webhook_url: request.webhook_url,
        negative_text: request.negative_text
      });
      
      const duration = Date.now() - startTime;

      console.log('📡 [DEBUG] Blockade Labs SDK response received in', duration + 'ms');
      console.log('🎉 [DEBUG] Skybox generation initiated:', {
        id: generation.id,
        status: generation.status,
        hasWebhookUrl: !!generation.webhook_url,
        type: typeof generation.id
      });

      console.log('📤 [DEBUG] Returning generation response');
      return generation as SkyboxGenerationResponse;
    } catch (error) {
      console.error('❌ [DEBUG] Error generating skybox:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        name: error instanceof Error ? error.name : 'Unknown'
      });

      // Check if it's a Blockade Labs SDK error
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          console.error('🔑 [DEBUG] API key error detected');
          throw new Error('BlockadeLabs API key is invalid or missing');
        } else if (error.message.includes('rate limit')) {
          console.error('⏰ [DEBUG] Rate limit error detected');
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          console.error('🌐 [DEBUG] Network error detected');
          throw new Error('Network error connecting to BlockadeLabs API');
        } else if (error.message.includes('style')) {
          console.error('🎨 [DEBUG] Style error detected');
          throw new Error('Invalid or unavailable skybox style');
        }
      }

      throw new Error(`Failed to generate skybox: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get skybox generation status
   */
  async getSkyboxStatus(generationId: string): Promise<any> {
    console.log('📊 [DEBUG] skyboxService.getSkyboxStatus called for:', generationId);
    
    try {
      if (!generationId || generationId.trim().length === 0) {
        console.error('❌ [DEBUG] Validation failed - empty generationId');
        throw new Error('Generation ID is required');
      }

      console.log('📊 [DEBUG] Calling Blockade Labs SDK for status...');
      const startTime = Date.now();
      
      const status = await this.sdk.getGenerationById(generationId);
      
      const duration = Date.now() - startTime;

      console.log('📊 [DEBUG] Blockade Labs SDK status response received in', duration + 'ms');
      console.log('📊 [DEBUG] Status details:', {
        id: status.id,
        status: status.status,
        hasFileUrl: !!status.file_url,
        hasThumbnailUrl: !!status.thumbnail_url,
        progress: status.progress,
        createdAt: status.created_at,
        updatedAt: status.updated_at
      });

      // Log status transitions
      if (status.status === 'complete' && status.file_url) {
        console.log('🎉 [DEBUG] Generation completed successfully with file URL');
      } else if (status.status === 'failed' || status.status === 'error') {
        console.error('❌ [DEBUG] Generation failed with status:', status.status);
        console.error('❌ [DEBUG] Error message:', status.error_message);
      } else if (status.status === 'processing' || status.status === 'dispatched') {
        console.log('⏳ [DEBUG] Generation still in progress:', status.status);
      }

      console.log('📤 [DEBUG] Returning status response');
      return status;
    } catch (error) {
      console.error('❌ [DEBUG] Error getting skybox status:', error);
      console.error('❌ [DEBUG] Status error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        generationId,
        type: typeof error
      });

      // Check for specific errors
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('404')) {
          console.error('🔍 [DEBUG] Generation not found');
          throw new Error('Generation not found. It may have been deleted or expired.');
        } else if (error.message.includes('API key')) {
          console.error('🔑 [DEBUG] API key error in status check');
          throw new Error('BlockadeLabs API key is invalid or missing');
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          console.error('🌐 [DEBUG] Network error in status check');
          throw new Error('Network error connecting to BlockadeLabs API');
        }
      }

      throw new Error(`Failed to get skybox status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear the styles cache
   */
  clearCache(): void {
    this.stylesCache = null;
    console.log('Skybox styles cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    hasCache: boolean;
    isValid: boolean;
    age: number;
    ttl: number;
  } {
    if (!this.stylesCache) {
      return {
        hasCache: false,
        isValid: false,
        age: 0,
        ttl: this.CACHE_TTL
      };
    }

    const age = Date.now() - this.stylesCache.timestamp;
    const isValid = this.isCacheValid(this.stylesCache);

    return {
      hasCache: true,
      isValid,
      age,
      ttl: this.CACHE_TTL
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    details: {
      apiKeyConfigured: boolean;
      cacheStatus: any;
      lastApiCall?: string;
    };
  }> {
    try {
      const cacheStatus = this.getCacheStatus();
      
      // Test API connection by fetching a small number of styles
      const testStyles = await this.sdk.getSkyboxStyles();
      
      return {
        status: 'healthy',
        message: 'Skybox service is operational',
        details: {
          apiKeyConfigured: !!env.API_KEY,
          cacheStatus,
          lastApiCall: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Skybox service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          apiKeyConfigured: !!env.API_KEY,
          cacheStatus: this.getCacheStatus()
        }
      };
    }
  }
}

// Export singleton instance
export const skyboxService = new SkyboxService(); 