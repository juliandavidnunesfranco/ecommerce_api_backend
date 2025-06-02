export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 10,
  },
  audit: {
    enabled: process.env.AUDIT_ENABLED === 'true',
    schema: process.env.AUDIT_SCHEMA || 'audit',
  },
  services: {
    marketplace: {
      enabled: process.env.ENABLE_MARKETPLACE === 'true',
      features: {
        multiVendor: process.env.MARKETPLACE_MULTI_VENDOR === 'true',
        digitalProducts: process.env.MARKETPLACE_DIGITAL_PRODUCTS === 'true',
        subscriptions: process.env.MARKETPLACE_SUBSCRIPTIONS === 'true',
      },
    },
    logistics: {
      enabled: process.env.ENABLE_LOGISTICS === 'true',
      features: {
        realTimeTracking: process.env.LOGISTICS_REAL_TIME_TRACKING === 'true',
        fleetManagement: process.env.LOGISTICS_FLEET_MANAGEMENT === 'true',
        routeOptimization: process.env.LOGISTICS_ROUTE_OPTIMIZATION === 'true',
      },
    },
    marketing: {
      enabled: process.env.ENABLE_MARKETING === 'true',
      features: {
        emailCampaigns: process.env.MARKETING_EMAIL_CAMPAIGNS === 'true',
        analytics: process.env.MARKETING_ANALYTICS === 'true',
        socialMedia: process.env.MARKETING_SOCIAL_MEDIA === 'true',
      },
    },
  },
});
