import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { DashboardChartCardComponent } from './dashboard-chart-card/dashboard-chart-card.component';
import { DashboardRecordsCardComponent } from './dashboard-records-card/dashboard-records-card.component';
import { DashboardReservedCardComponent } from './dashboard-reserved-card/dashboard-reserved-card.component';
import { DashboardUserCardComponent } from './dashboard-user-card/dashboard-user-card.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    NgTemplateOutlet,
    DashboardUserCardComponent,
    DashboardChartCardComponent,
    DashboardReservedCardComponent,
    DashboardRecordsCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  host: {
    class: 'block min-h-dvh',
  },
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly displayName = 'Admin';
  protected readonly navItems = [
    { id: 'panel', label: 'Panel' },
    { id: 'qr', label: 'QR' },
    { id: 'escaneos', label: 'Escaneos' },
    { id: 'versiones', label: 'Versiones' },
    { id: 'usuarios', label: 'Usuarios' },
  ] as const;

  protected signOut(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
