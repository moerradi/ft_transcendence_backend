import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // get config service
  const configService = app.get(ConfigService);
  // disable cors for dev purposes
  if (configService.get('NODE_ENV') === 'development') {
    app.enableCors();
  } else {
    app.enableCors({
      origin: configService.get('CORS_ORIGIN'),
      credentials: true,
    });
  }
  // add whitelist to validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // configruate swagger
  const options = new DocumentBuilder()
    .setTitle('Transcendance API')
    .setDescription('This is the API for the Transcendance project.')
    .setVersion('1.0')
    .addTag('main')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);
  const port = configService.get('PORT') || 4242;
  await app.listen(port);
}
bootstrap();
