import api from '../config/axios';
import type { SkyboxStyle, SkyboxGenerationRequest, SkyboxGenerationResponse, SkyboxStatusResponse } from '../types/skybox';

export const skyboxApiService = {
  // Get available skybox styles
  async getStyles(page = 1, limit = 20): Promise<{ success: boolean; data?: any; error?: string }> {
    console.log('🎨 [DEBUG] getStyles called with:', { page, limit });
    try {
      const startTime = Date.now();
      const response = await api.get('/skybox/styles', { params: { page, limit } });
      const duration = Date.now() - startTime;
      
      console.log('🎨 [DEBUG] getStyles response received in', duration + 'ms:', {
        success: response.data.success,
        dataLength: response.data.data?.length,
        total: response.data.data?.length
      });
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [DEBUG] getStyles failed:', error);
      console.error('❌ [DEBUG] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Failed to fetch skybox styles: ${error.message}`);
    }
  },

  // Generate a new skybox
  async generateSkybox({ prompt, style_id, negative_prompt, userId }: { prompt: string; style_id: string|number; negative_prompt?: string; userId?: string }) {
    console.log('🌅 [DEBUG] generateSkybox called with:', {
      prompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
      promptLength: prompt.length,
      style_id,
      negative_prompt: negative_prompt?.substring(0, 30) + (negative_prompt && negative_prompt.length > 30 ? '...' : ''),
      userId,
      hasNegativePrompt: !!negative_prompt
    });

    try {
      const requestPayload = { 
        prompt, 
        skybox_style_id: style_id, // <-- FIXED: use correct field name
        negative_text: negative_prompt, 
        userId 
      };

      console.log('📡 [DEBUG] Making POST request to /skybox/generate with payload:', {
        ...requestPayload,
        prompt: requestPayload.prompt.substring(0, 50) + '...',
        negative_text: requestPayload.negative_text?.substring(0, 30) + (requestPayload.negative_text && requestPayload.negative_text.length > 30 ? '...' : '')
      });

      const startTime = Date.now();
      const response = await api.post('/skybox/generate', requestPayload);
      const duration = Date.now() - startTime;

      console.log('📡 [DEBUG] generateSkybox API response received in', duration + 'ms:', {
        status: response.status,
        statusText: response.statusText,
        dataKeys: Object.keys(response.data || {}),
        success: response.data?.success,
        hasData: !!response.data?.data,
        generationId: response.data?.data?.generationId || response.data?.data?.id,
        error: response.data?.error
      });

      console.log('📡 [DEBUG] Full API response data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [DEBUG] generateSkybox API call failed:', error);
      console.error('❌ [DEBUG] Error response:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
      
      // Handle specific errors
      if (error.response?.status === 403) {
        console.error('🔒 [DEBUG] Forbidden error - API key or permissions issue');
        throw new Error('Skybox generation service is not configured properly. Please contact support.');
      } else if (error.response?.status === 400) {
        console.error('📝 [DEBUG] Bad request - parameter validation failed');
        throw new Error('Invalid request parameters. Please check your prompt and style selection.');
      } else if (error.response?.status === 500) {
        console.error('🚨 [DEBUG] Server error - backend service issue');
        throw new Error('Skybox generation service is temporarily unavailable. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        console.error('🌐 [DEBUG] Network error - connection issue');
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw new Error(`Failed to generate skybox: ${error.message}`);
    }
  },

  // Get skybox generation status
  async getStatus(generationId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    console.log('📊 [DEBUG] getStatus called for generation:', generationId);
    try {
      const startTime = Date.now();
      const response = await api.get(`/skybox/status/${generationId}`);
      const duration = Date.now() - startTime;

      console.log('📊 [DEBUG] getStatus response received in', duration + 'ms:', {
        success: response.data.success,
        status: response.data.data?.status,
        hasFileUrl: !!response.data.data?.file_url,
        hasThumbnailUrl: !!response.data.data?.thumbnail_url
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ [DEBUG] getStatus failed for generation', generationId + ':', error);
      console.error('❌ [DEBUG] Status error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Failed to get skybox status: ${error.message}`);
    }
  },

  // Get skybox history
  async getSkyboxHistory(userId: string, page: number = 1, limit: number = 20) {
    try {
      const response = await api.get(`/skybox/history?userId=${userId}&page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      console.error('Skybox history fetch failed:', error);
      
      // Handle specific errors
      if (error.response?.status === 403) {
        throw new Error('Skybox service is not configured properly. Please contact support.');
      } else if (error.response?.status === 500) {
        throw new Error('Skybox service is temporarily unavailable. Please try again later.');
      }
      
      throw new Error(`Failed to get skybox history: ${error.message}`);
    }
  }
}; 