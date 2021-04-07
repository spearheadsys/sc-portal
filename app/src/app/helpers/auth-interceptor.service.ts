import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TokenService } from './token.service';
import { retryBackoff } from 'backoff-rxjs'

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptorService implements HttpInterceptor
{
  constructor(private readonly httpClient: HttpClient,
    private readonly router: Router,
    private readonly tokenService: TokenService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>
  {
    if (!req.url.includes('/api'))
      return next.handle(req);

    if (sessionStorage.getItem('token'))
      req = req.clone({
        setHeaders: {
          'X-Auth-Token': sessionStorage.getItem('token')
        }
      });

    return next.handle(req)
      .pipe(
        catchError((err) =>
        {
          if (err instanceof HttpErrorResponse && this.tokenService.token)
          {
            if (err.status === 401)
            {
              this.tokenService.token = null;
              this.tokenService.prevAuthAttempt = null;

              this.httpClient.get(`/api/login`).subscribe((response: any) => window.location = response.url);
            }
          }

          return throwError(err);
        }),
        retryBackoff({
          initialInterval: 100,
          maxRetries: 10,
          resetOnSuccess: true,
          shouldRetry: error => error.status === 408
        })
      );
  }
}
