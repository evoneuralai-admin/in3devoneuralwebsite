import { Request, Response } from 'express';
import { skyboxService } from '../services/skyboxService';
import type { SkyboxGenerationRequest, SkyboxStyle, ApiResponse } from '../types/skybox';

// Get all skybox styles
export const getStyles = async (req: Request, res: Response) => {
  console.log('🎨 [DEBUG] Backend getStyles called with query:', req.query);
  
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log('🎨 [DEBUG] Parsed parameters:', { page, limit });
    console.log('🎨 [DEBUG] Calling skyboxService.getStyles...');

    const startTime = Date.now();
    const styles = await skyboxService.getStyles(page, limit);
    const duration = Date.now() - startTime;

    console.log('🎨 [DEBUG] skyboxService.getStyles completed in', duration + 'ms');
    console.log('🎨 [DEBUG] Retrieved', styles.length, 'styles');

    const response: ApiResponse<{ styles: SkyboxStyle[]; pagination: any }> = {
      success: true,
      data: {
        styles,
        pagination: {
          page,
          limit,
          total: styles.length,
          totalPages: Math.ceil(styles.length / limit),
          hasNext: styles.length === limit,
          hasPrev: page > 1
        }
      },
      message: `Retrieved ${styles.length} skybox styles`
    };

    console.log('🎨 [DEBUG] Sending response with', styles.length, 'styles');
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ [DEBUG] getStyles error:', error);
    console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch skybox styles'
    };

    res.status(500).json(response);
  }
};

/**
 * Generate a new skybox
 * POST /api/skybox/generate
 */
export const generateSkybox = async (req: Request, res: Response) => {
  console.log('🌅 [DEBUG] Backend generateSkybox called');
  console.log('🌅 [DEBUG] Request body:', {
    ...req.body,
    prompt: req.body.prompt?.substring(0, 50) + (req.body.prompt?.length > 50 ? '...' : ''),
    negative_text: req.body.negative_text?.substring(0, 30) + (req.body.negative_text?.length > 30 ? '...' : '')
  });
  console.log('🌅 [DEBUG] Request headers:', {
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 50),
    authorization: req.headers.authorization ? 'Present' : 'Missing'
  });

  try {
    const { prompt, skybox_style_id, remix_imagine_id, webhook_url, negative_text } = req.body;

    console.log(`🌅 [DEBUG] Skybox API: POST /generate - style_id: ${skybox_style_id}`);
    console.log('🌅 [DEBUG] Extracted parameters:', {
      prompt: prompt?.substring(0, 50) + '...',
      promptLength: prompt?.length,
      skybox_style_id,
      hasRemixId: !!remix_imagine_id,
      hasWebhookUrl: !!webhook_url,
      hasNegativeText: !!negative_text,
      negativeTextLength: negative_text?.length
    });

    // Validate required fields
    if (!prompt || !skybox_style_id) {
      console.error('❌ [DEBUG] Validation failed - missing required fields:', {
        hasPrompt: !!prompt,
        hasSkyboxStyleId: !!skybox_style_id
      });
      
      const response: ApiResponse<null> = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: prompt and skybox_style_id are required'
      };
      return res.status(400).json(response);
    }

    console.log('✅ [DEBUG] Validation passed, creating request object');
    const request: SkyboxGenerationRequest = {
      prompt: prompt.trim(),
      skybox_style_id: parseInt(skybox_style_id),
      remix_imagine_id,
      webhook_url,
      negative_text
    };

    console.log('🌅 [DEBUG] Calling skyboxService.generateSkybox with:', {
      ...request,
      prompt: request.prompt.substring(0, 50) + '...',
      negative_text: request.negative_text?.substring(0, 30) + (request.negative_text && request.negative_text.length > 30 ? '...' : '')
    });

    const startTime = Date.now();
    const generation = await skyboxService.generateSkybox(request);
    const duration = Date.now() - startTime;

    console.log('🎉 [DEBUG] skyboxService.generateSkybox completed in', duration + 'ms');
    console.log('🎉 [DEBUG] Generation result:', {
      id: generation.id,
      status: generation.status,
      hasWebhookUrl: !!generation.webhook_url
    });

    const response: ApiResponse<{ generationId: string; status: string }> = {
      success: true,
      data: {
        generationId: generation.id.toString(),
        status: generation.status
      },
      message: 'Skybox generation initiated successfully'
    };

    console.log('📤 [DEBUG] Sending success response:', {
      generationId: response.data?.generationId,
      status: response.data?.status
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ [DEBUG] Skybox API Error - generateSkybox:', error);
    console.error('❌ [DEBUG] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error
    });
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'GENERATION_ERROR',
      message: error instanceof Error ? error.message : 'Failed to generate skybox'
    };

    console.log('📤 [DEBUG] Sending error response:', response);
    res.status(400).json(response);
  }
};

/**
 * Get skybox generation status
 * GET /api/skybox/status/:generationId
 */
export const getSkyboxStatus = async (req: Request, res: Response) => {
  console.log('📊 [DEBUG] Backend getSkyboxStatus called');
  console.log('📊 [DEBUG] Request params:', req.params);
  
  try {
    const { generationId } = req.params;

    console.log(`📊 [DEBUG] Skybox API: GET /status/${generationId}`);

    if (!generationId) {
      console.error('❌ [DEBUG] Validation failed - missing generationId');
      const response: ApiResponse<null> = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Generation ID is required'
      };
      return res.status(400).json(response);
    }

    console.log('📊 [DEBUG] Calling skyboxService.getSkyboxStatus...');
    const startTime = Date.now();
    const status = await skyboxService.getSkyboxStatus(generationId);
    const duration = Date.now() - startTime;

    console.log('📊 [DEBUG] skyboxService.getSkyboxStatus completed in', duration + 'ms');
    console.log('📊 [DEBUG] Status result:', {
      id: status.id,
      status: status.status,
      hasFileUrl: !!status.file_url,
      hasThumbnailUrl: !!status.thumbnail_url,
      progress: status.progress
    });

    const response: ApiResponse<any> = {
      success: true,
      data: status,
      message: 'Skybox status retrieved successfully'
    };

    console.log('📤 [DEBUG] Sending status response for:', generationId);
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ [DEBUG] Skybox API Error - getSkyboxStatus:', error);
    console.error('❌ [DEBUG] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      generationId: req.params.generationId
    });
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'STATUS_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get skybox status'
    };

    console.log('📤 [DEBUG] Sending status error response');
    res.status(400).json(response);
  }
};

/**
 * Health check endpoint
 * GET /api/skybox/health
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    console.log('Skybox API: GET /health');

    const health = await skyboxService.healthCheck();

    const response: ApiResponse<any> = {
      success: health.status === 'healthy',
      data: {
        status: health.status,
        message: health.message,
        details: health.details
      },
      message: health.message
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(response);
  } catch (error) {
    console.error('Skybox API Error - healthCheck:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'SERVICE_ERROR',
      message: 'Health check failed'
    };

    res.status(503).json(response);
  }
};

/**
 * Clear cache endpoint
 * DELETE /api/skybox/cache
 */
export const clearCache = async (req: Request, res: Response) => {
  try {
    console.log('Skybox API: DELETE /cache');

    skyboxService.clearCache();

    const response: ApiResponse<null> = {
      success: true,
      message: 'Cache cleared successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Skybox API Error - clearCache:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'SERVICE_ERROR',
      message: 'Failed to clear cache'
    };

    res.status(500).json(response);
  }
};

/**
 * Legacy endpoint for backward compatibility
 * GET /api/skybox/getSkyboxStyles
 */
export const getSkyboxStylesLegacy = async (req: Request, res: Response) => {
  try {
    console.log('Skybox API: GET /getSkyboxStyles (legacy)');

    const result = await skyboxService.getSkyboxStyles(1, 100); // Get all styles for legacy compatibility

    const response: ApiResponse<{ styles: any[] }> = {
      success: true,
      data: {
        styles: result.styles
      },
      message: `Retrieved ${result.styles.length} skybox styles`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Skybox API Error - getSkyboxStylesLegacy:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch skybox styles'
    };

    res.status(400).json(response);
  }
};

/**
 * Legacy endpoint for backward compatibility
 * POST /api/skybox/generateSkybox
 */
export const generateSkyboxLegacy = async (req: Request, res: Response) => {
  try {
    const { prompt, skybox_style_id, remix_imagine_id, webhook_url } = req.body;

    console.log(`Skybox API: POST /generateSkybox (legacy) - style_id: ${skybox_style_id}`);

    // Validate required fields
    if (!prompt || !skybox_style_id) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: prompt and skybox_style_id are required'
      };
      return res.status(400).json(response);
    }

    const request: SkyboxGenerationRequest = {
      prompt: prompt.trim(),
      skybox_style_id: parseInt(skybox_style_id),
      remix_imagine_id,
      webhook_url
    };

    const generation = await skyboxService.generateSkybox(request);

    const response: ApiResponse<any> = {
      success: true,
      data: generation,
      message: 'Skybox generation initiated successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Skybox API Error - generateSkyboxLegacy:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Failed to generate skybox'
    };

    res.status(400).json(response);
  }
};

/**
 * Get user skyboxes with pagination
 * GET /api/skybox/user
 */
export const getUserSkyboxes = async (req: Request, res: Response) => {
  try {
    // In a real implementation, you would fetch from your DB or service
    // For now, return an empty array and mock pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const data: any[] = [];
    const pagination = {
      page,
      limit,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    };
    res.status(200).json({ success: true, data: { data, pagination } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to fetch user skyboxes' });
  }
};
