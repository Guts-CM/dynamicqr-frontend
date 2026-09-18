import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './components/auth/auth.guard';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login/login.component';
import { QrComponent } from './components/qr/qr/qr.component';
import { UsuarioComponent } from './components/usuario/usuario/usuario.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'qr', component: QrComponent, canActivate: [authGuard] },
  { path: 'usuarios', component: UsuarioComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
