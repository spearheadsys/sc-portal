import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Snapshot } from '../models/snapshot';
import { Instance } from '../models/instance';
import { delay, filter, map, repeatWhen, take, tap } from 'rxjs/operators';
import { Cacheable } from 'ts-cacheable';

const cacheBuster$ = new Subject<void>();

@Injectable({
  providedIn: 'root'
})
export class SnapshotsService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: cacheBuster$
  })
  getSnapshots(instanceId: string): Observable<Snapshot[]>
  {
    return this.httpClient.get<Snapshot[]>(`/api/my/machines/${instanceId}/snapshots`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: cacheBuster$
  })
  getSnapshot(instanceId: string, snapshotName: string): Observable<Snapshot>
  {
    return this.httpClient.get<Snapshot>(`/api/my/machines/${instanceId}/snapshots/${encodeURIComponent(snapshotName)}`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getSnapshotUntilExpectedState(instance: Instance, snapshot: Snapshot, expectedStates: string[], maxRetries = 10): Observable<Snapshot>
  {
    // Keep polling the snapshot until it reaches the expected state
    return this.httpClient.get<Snapshot>(`/api/my/machines/${instance.id}/snapshots/${encodeURIComponent(snapshot.name)}`)
      .pipe(
        tap(x => 
        {
          if (x.state !== 'deleted')
            snapshot.state = x.state;
        }),
        repeatWhen(x =>
        {
          let retries = 0;

          return x.pipe(
            delay(3000),
            map(() =>
            {
              if (retries++ === maxRetries)
                throw { error: { message: `Failed to retrieve the current status for snapshot "${snapshot.name}"` } };
            })
          );
        }),
        filter(x => expectedStates.includes(x.state)),
        take(1), //  needed to stop the repeatWhen loop
        tap(() => cacheBuster$.next())
      );
  }

  // ----------------------------------------------------------------------------------------------------------------
  createSnapshot(instanceId: string, snapshotName: string): Observable<Snapshot>
  {
    return this.httpClient.post<Snapshot>(`/api/my/machines/${instanceId}/snapshots?name=${encodeURIComponent(snapshotName)}`, {})
      .pipe(tap(() => cacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteSnapshot(instanceId: string, snapshotName: string): Observable<any>
  {
    return this.httpClient.delete(`/api/my/machines/${instanceId}/snapshots/${encodeURIComponent(snapshotName)}`)
      .pipe(tap(() => cacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  startFromSnapshot(instanceId: string, snapshotName: string): Observable<any>
  {
    return this.httpClient.post(`/api/my/machines/${instanceId}/snapshots/${encodeURIComponent(snapshotName)}`, {})
      .pipe(tap(() => cacheBuster$.next()));
  }
}
