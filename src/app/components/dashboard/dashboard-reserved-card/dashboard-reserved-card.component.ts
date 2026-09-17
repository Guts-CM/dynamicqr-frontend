import { Component } from '@angular/core';
import { MotionCardDirective } from '../../../motion/motion.directives';
import { DashboardQrLiveComponent } from '../dashboard-qr-live/dashboard-qr-live.component';

@Component({
  selector: 'app-dashboard-reserved-card',
  imports: [DashboardQrLiveComponent, MotionCardDirective],
  templateUrl: './dashboard-reserved-card.component.html',
  styleUrl: './dashboard-reserved-card.component.css',
})
export class DashboardReservedCardComponent {}
