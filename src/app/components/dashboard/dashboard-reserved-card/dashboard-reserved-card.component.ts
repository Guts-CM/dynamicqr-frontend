import { Component } from '@angular/core';
import { DashboardQrLiveComponent } from '../dashboard-qr-live/dashboard-qr-live.component';

@Component({
  selector: 'app-dashboard-reserved-card',
  imports: [DashboardQrLiveComponent],
  templateUrl: './dashboard-reserved-card.component.html',
  styleUrl: './dashboard-reserved-card.component.css',
})
export class DashboardReservedCardComponent {}
