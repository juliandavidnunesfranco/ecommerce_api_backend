import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const config = new DocumentBuilder()
    .setTitle('API Ecommerce Document')
    .setDescription('API description')
    .setVersion('1.0')
    .addTag('Auth', 'Operation for sistem authentication ')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory, {
    customSiteTitle: 'API Ecommerce Document',
    customCss: `
      .swagger-ui .topbar { background-color: #2c3e50; }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .scheme-container { background-color: #ffffff; }
      .swagger-ui .filter .filter-container { margin-bottom: 1em; }
      .swagger-ui .filter input { width: 100%; }`,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      filterHighlightColor: '#2c3e50',
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
    },
  });
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const middleware = app.get(TenantContextMiddleware);
    await middleware.use(req, res, next);
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
