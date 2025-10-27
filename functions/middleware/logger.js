// Logging middleware for monitoring and debugging
export function createLogger(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const timestamp = new Date().toISOString();
  
  return {
    info: (message, data = {}) => {
      logMessage('INFO', message, data, timestamp, url.pathname, env);
    },
    warn: (message, data = {}) => {
      logMessage('WARN', message, data, timestamp, url.pathname, env);
    },
    error: (message, error = null, data = {}) => {
      logMessage('ERROR', message, { ...data, error: error?.stack || error }, timestamp, url.pathname, env);
    },
    debug: (message, data = {}) => {
      if (env.DEBUG === 'true') {
        logMessage('DEBUG', message, data, timestamp, url.pathname, env);
      }
    }
  };
}

function logMessage(level, message, data, timestamp, path, env) {
  const logEntry = {
    timestamp,
    level,
    message,
    path,
    data,
    environment: env.ENVIRONMENT || 'development'
  };
  
  // Log to console for local development
  console.log(JSON.stringify(logEntry));
  
  // In production, you could send to external logging service
  if (env.ENVIRONMENT === 'production') {
    // Example: Send to Cloudflare Analytics, Datadog, etc.
    // This would require additional setup and credentials
  }
}

// Performance monitoring middleware
export function withPerformanceMonitoring(handler) {
  return async function(context) {
    const startTime = Date.now();
    const logger = createLogger(context);
    
    try {
      const response = await handler(context);
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        status: response.status,
        duration,
        method: context.request.method,
        path: new URL(context.request.url).pathname
      });
      
      // Add performance headers
      response.headers.set('X-Response-Time', `${duration}ms`);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Request failed', error, {
        duration,
        method: context.request.method,
        path: new URL(context.request.url).pathname
      });
      
      throw error;
    }
  };
}

// Error tracking middleware
export function withErrorTracking(handler) {
  return async function(context) {
    const logger = createLogger(context);
    
    try {
      return await handler(context);
    } catch (error) {
      logger.error('Unhandled error', error, {
        userAgent: context.request.headers.get('User-Agent'),
        ip: context.request.headers.get('CF-Connecting-IP'),
        country: context.request.cf?.country
      });
      
      // Return appropriate error response
      if (error.name === 'ValidationError') {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: error.message
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (error.name === 'AuthenticationError') {
        return new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Default error response
      return new Response(JSON.stringify({
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

// Health check endpoint
export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    // Check database connection
    const dbCheck = await env.CF_INFOBIP_DB.prepare('SELECT 1').first();
    
    // Check external services
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT || 'development',
      services: {
        database: dbCheck ? 'healthy' : 'unhealthy',
        google_oauth: env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
        infobip: env.INFOBIP_API_KEY ? 'configured' : 'missing'
      }
    };
    
    const isHealthy = healthStatus.services.database === 'healthy';
    
    return new Response(JSON.stringify(healthStatus), {
      status: isHealthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}