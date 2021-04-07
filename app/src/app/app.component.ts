import { Component } from '@angular/core';
import { Router, RouteConfigLoadStart, RouteConfigLoadEnd, NavigationStart, NavigationEnd, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BsLocaleService } from 'ngx-bootstrap/datepicker';
import { filter, map, mergeMap } from 'rxjs/operators';
import { TokenService } from './helpers/token.service';
import { AuthService } from './helpers/auth.service';
import { UserInfo } from './account/models/user-info';

@Component({
  selector: 'app-root',
  styleUrls: ['./app.component.scss'],
  templateUrl: './app.component.html'
})
export class AppComponent
{
  showProgress = false;
  menuVisibility = false;
  title: string;
  subTitle: string;
  icon: string | string[];
  userInfo: UserInfo;
  routeChanged: boolean;

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly translate: TranslateService,
    private readonly localeService: BsLocaleService,
    private readonly authService: AuthService)
  {
    // This language will be used as a fallback when a translation isn't found in the current language
    translate.setDefaultLang('en');

    translate.use('en');

    // NgxBootstrap locale
    this.localeService.use('en');

    router.events
      .pipe(filter(x => x instanceof RouteConfigLoadStart || x instanceof RouteConfigLoadEnd))
      .subscribe(x =>
      {
        this.showProgress = x instanceof RouteConfigLoadStart;
      });

    router.events
      .pipe(filter(x => x instanceof NavigationStart))
      .subscribe(x => this.routeChanged = false);

    router.events
      .pipe(
        filter(x => x instanceof NavigationEnd),
        map(() => activatedRoute),
        map(route =>
        {
          while (route.firstChild)
            route = route.firstChild;

          return route;
        }),
        filter(route => route.outlet === 'primary'),
        mergeMap(route => route.data)
      )
      .subscribe(x =>
      {
        this.title = x.title;
        this.subTitle = x.subTitle;
        this.icon = x.icon;

        this.routeChanged = true;
      });

    authService.userInfoUpdated$.subscribe(userInfo => this.userInfo = userInfo);
  }

  // ----------------------------------------------------------------------------------------------------------------
  logOff()
  {
    this.authService.logout();
  }
}
