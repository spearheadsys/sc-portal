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
  getMigration(machineId: string, migrationId: string): Observable<any>
  {
    return this.httpClient.get(`/api/my/migrations/${migrationId}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  migrate(machineId: string): Observable<any>
  {
    // https://apidocs.Spearhead.com/cloudapi/#Migrate
    return this.httpClient.post(`/api/my/machines/${machineId}/migrate`, { action: 'begin | sync | switch | automatic | pause | abort | watch', affinity: [] })
      .pipe(tap(() => cacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  getMigrationProgress(machineId: string): Observable<any>
  {
    // https://apidocs.Spearhead.com/cloudapi/#Migrate
    return this.httpClient.get(`/api/my/machines/${machineId}/migrate?action=watch`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  finalizeMigration(machineId: string): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${machineId}/migrate?action=finalize`, {})
      .pipe(tap(() => cacheBuster$.next()));
  }
}
