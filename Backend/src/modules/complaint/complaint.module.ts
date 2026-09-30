import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { NotificationModule } from '../notification/notification.module';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint.service';
import { ComplaintAdminController } from './complaint-admin.controller';
import { ComplaintSlaService } from './services/complaint-sla.service';
import { ComplaintSlaListener } from './listeners/complaint-sla.listener';

@Module({
  imports: [FirebaseModule, NotificationModule],
  controllers: [ComplaintController, ComplaintAdminController],
  providers: [ComplaintService, ComplaintSlaService, ComplaintSlaListener],
  exports: [ComplaintService],
})
export class ComplaintModule {}
