import app from './app';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

app.listen(env.PORT, () => {
  logger.info(`🚀 Servidor backend corriendo en http://localhost:${env.PORT}`);
});
