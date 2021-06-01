import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { AuthGuardService } from './helpers/auth-guard.service';

const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'machines',
  },
  {
    path: 'machines',
    loadChildren: () => import('./machines/machines.module').then(x => x.MachinesModule),
    canActivate: [AuthGuardService],
    canLoad: [AuthGuardService],
  },
  {
    path: 'catalog',
    loadChildren: () => import('./catalog/catalog.module').then(x => x.CatalogModule),
    canActivate: [AuthGuardService],
    canLoad: [AuthGuardService],
  },
  {
    path: 'volumes',
    loadChildren: () => import('./volumes/volumes.module').then(x => x.VolumesModule),
    canActivate: [AuthGuardService],
    canLoad: [AuthGuardService],
  },
  {
    path: 'networking',
    loadChildren: () => import('./networking/networking.module').then(x => x.NetworkingModule),
    canActivate: [AuthGuardService],
    canLoad: [AuthGuardService],
  },
  {
    path: 'security',
    loadChildren: () => import('./security/security.module').then(x => x.SecurityModule),
    canActivate: [AuthGuardService],
    canLoad: [AuthGuardService],
    data:
    {
      title: 'security.title',
      subTitle: 'security.subTitle',
      icon: 'shield-alt'
    }
  },
  {
    path: 'account',
    loadChildren: () => import('./account/account.module').then(x => x.AccountModule),
    canActivate: [AuthGuardService],
    canLoad: [AuthGuardService],
    data:
    {
      title: 'account.title',
      subTitle: 'account.subTitle',
      icon: 'user-cog'
    }
  },
  {
    path: 'help',
    loadChildren: () => import('./help/help.module').then(x => x.HelpModule),
    canActivate: [AuthGuardService],
    canLoad: [AuthGuardService],
    data:
    {
      title: 'help.title',
      subTitle: 'help.subTitle',
      icon: 'question-circle'
    }
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
