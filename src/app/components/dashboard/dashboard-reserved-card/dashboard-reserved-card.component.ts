import { Component } from '@angular/core';
import { MotionCardDirective } from '../../../motion/motion.directives';
import { QrLiveComponent } from '../../qr/qr-live/qr-live.component';

@Component({
  selector: 'app-dashboard-reserved-card',
  imports: [QrLiveComponent, MotionCardDirective],
  templateUrl: './dashboard-reserved-card.component.html',
  styleUrl: './dashboard-reserved-card.component.css',
})
export class DashboardReservedCardComponent {}
