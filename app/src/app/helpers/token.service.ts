import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TokenService
{
  accessTokenUpdated$ = new BehaviorSubject<any>(this.token);

  // ----------------------------------------------------------------------------------------------------------------
  constructor()
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  get token(): string
  {
    return sessionStorage.getItem('token');
  }

  // ----------------------------------------------------------------------------------------------------------------
  set token(value: string)
  {
    if (value)
      sessionStorage.setItem('token', value);
    else
      sessionStorage.removeItem('token');

    this.accessTokenUpdated$.next(value);
  }

  // ----------------------------------------------------------------------------------------------------------------
  get prevAuthAttempt(): number
  {
    const attempt = sessionStorage.getItem('prevAuthAttempt');
    if (attempt == null)
      return new Date().getTime();

    try
    {
      return JSON.parse(attempt) | 0;
    }
    catch(err)
    {
      return new Date().getTime();
    }
  }

  // ----------------------------------------------------------------------------------------------------------------
  set prevAuthAttempt(value: number)
  {
    sessionStorage.setItem('prevAuthAttempt', `${value}`);
  }
}
