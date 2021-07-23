import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TokenService } from './token.service';
import { AccountService } from '../account/helpers/account.service';
import { BehaviorSubject } from 'rxjs';
import { UserInfo } from '../account/models/user-info';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService
{
  userInfoUpdated$ = new BehaviorSubject<UserInfo>(null);

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly httpClient: HttpClient,
    private readonly tokenService: TokenService,
    private readonly accountService: AccountService)
  {
    const authToken = this.qs['token'];

    if (authToken)
    {
      tokenService.token = authToken;

      // Remove the query params from the URL to avoid having the users 
      // pass around by mistake the auth token.
      router.navigate([], {
        relativeTo: activatedRoute,
        queryParams: {a: 111},
        queryParamsHandling: 'merge'
      });
    }
    else
      this.login();

    tokenService.accessTokenUpdated$.subscribe(token =>
    {
      if (token)
        accountService.getUserInfo().subscribe(userInfo => this.userInfoUpdated$.next(userInfo));
      else
        this.userInfoUpdated$.next(null);
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  login()
  {
    // Wait X seconds between login attempts
    if (!this.tokenService.prevAuthAttempt ||
      !this.tokenService.token ||
      !this.tokenService.token && Math.abs(new Date().getTime() - this.tokenService.prevAuthAttempt) / 1000 > 60)
    {
      this.tokenService.prevAuthAttempt = new Date().getTime();

      this.httpClient.get(`/api/login`).subscribe((response: any) => window.location = response.url);
    }
  }

  // ----------------------------------------------------------------------------------------------------------------
  logout()
  {
    this.tokenService.token = null;

    this.login();
  }

  // ----------------------------------------------------------------------------------------------------------------
  set userInfo(value: UserInfo)
  {
    this.userInfoUpdated$.next(value);
  }

  // ----------------------------------------------------------------------------------------------------------------
  private get qs()
  {
    const params = location.search.substr(1).split('&');

    if (!params)
      return {};

    const result = {};
    for (let i = 0; i < params.length; ++i)
    {
      const p = params[i].split('=', 2);
      if (p.length === 1)
        result[p[0]] = '';
      else
        result[p[0]] = decodeURIComponent(p[1].replace(/\+/g, ' '));
    }

    return result;
  }
}
