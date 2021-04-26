import { Injectable } from '@angular/core';
import { Router, CanActivate, CanLoad, ActivatedRouteSnapshot, RouterStateSnapshot, Route, UrlSegment } from '@angular/router';
import { Observable } from 'rxjs';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate, CanLoad
{
  constructor(private readonly router: Router,
    private readonly tokenService: TokenService) { }

  // ----------------------------------------------------------------------------------------------------------------
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean
  {
    if (this.tokenService.accessTokenUpdated$.getValue())
    {
      const redirectUrl = sessionStorage.getItem('redirectUrl');
      if (redirectUrl)
      {
        this.router.navigate([redirectUrl], { queryParamsHandling: '' });
        sessionStorage.removeItem('redirectUrl');
      }

      return true;
    }

    sessionStorage.setItem('redirectUrl', state.url);

    return false;
  }

  canLoad(route: Route, segments: UrlSegment[]): boolean | Observable<boolean> | Promise<boolean>
  {
    if (this.tokenService.accessTokenUpdated$.getValue())
      return true;

    //this.router.navigate(['/unauthorized'], { state: { data: route.data } });
    return false;
  }
}
