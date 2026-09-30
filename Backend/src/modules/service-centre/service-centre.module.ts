import { Module } from '@nestjs/common';

import { CacheModule } from '../../common/cache/cache.module';
import { ServiceCentreController } from './service-centre.controller';
import { ServiceCentreService } from './service-centre.service';

@Module({
  imports: [CacheModule],
  controllers: [ServiceCentreController],
  providers: [ServiceCentreService],
  exports: [ServiceCentreService],
})
export class ServiceCentreModule {}
