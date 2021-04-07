import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Cacheable } from 'ts-cacheable';
import { tap } from 'rxjs/operators';

const cacheBuster$ = new Subject<void>();

@Injectable({
  providedIn: 'root'
})
export class MigrationsService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: cacheBuster$
  })
  getMigrations(): Observable<any>
  {
    return this.httpClient.get(`/api/my/migrations`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: cacheBuster$
  })
  getMigration(instanceId: string, migrationId: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/migrations/${migrationId}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  migrate(instanceId: string): Observable<any>
  {
    // https://apidocs.joyent.com/cloudapi/#Migrate
    return this.httpClient.post(`/api/my/machines/${instanceId}/migrate`, { action: 'begin | sync | switch | automatic | pause | abort | watch', affinity: [] })
      .pipe(tap(() => cacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  getMigrationProgress(instanceId: string): Observable<any>
  {
    // https://apidocs.joyent.com/cloudapi/#Migrate
    return this.httpClient.get(`/api/my/machines/${instanceId}/migrate?action=watch`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  finalizeMigration(instanceId: string): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${instanceId}/migrate?action=finalize`, {})
      .pipe(tap(() => cacheBuster$.next()));
  }
}
