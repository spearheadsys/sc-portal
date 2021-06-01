import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Cacheable } from 'ts-cacheable';
import { delay, filter, map, mergeMap, repeatWhen, take, tap } from 'rxjs/operators';
import { CatalogPackage } from '../models/package';
import { CatalogImage } from '../models/image';

const cacheBuster$ = new Subject<void>();
const imagesCacheBuster$ = new Subject<void>();

@Injectable({
  providedIn: 'root'
})
export class CatalogService
{
  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly httpClient: HttpClient) { }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: cacheBuster$
  })
  getDataCenters(): Observable<any[]>
  {
    return this.httpClient.get<any[]>(`/api/my/datacenters`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  getServices(): Observable<any>
  {
    return this.httpClient.get<any>(`/api/my/services`);
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: cacheBuster$
  })
  getPackages(): Observable<CatalogPackage[]>
  {
    return this.httpClient.get<CatalogPackage[]>(`/api/my/packages`)
      .pipe(mergeMap(packages => 
        {
          return this.httpClient.get(`./assets/data/packages.json`).pipe(map(prices => 
            {
              packages.forEach(x => x.price = prices[x.id])

              return packages;
            }))
        }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: cacheBuster$
  })
  getPackage(packageId: string): Observable<CatalogPackage>
  {
    return this.httpClient.get<CatalogPackage>(`/api/my/packages/${packageId}`)
      .pipe(mergeMap(pkg => 
        {
          return this.httpClient.get(`./assets/data/packages.json`).pipe(map(prices => 
            {
              pkg.price = prices[pkg.id];

              return pkg;
            }))
        }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: imagesCacheBuster$
  })
  getImages(allStates = false): Observable<CatalogImage[]>
  {
    return this.httpClient.get<CatalogImage[]>(`/api/my/images?${allStates ? 'state=all' : ''}`)
      .pipe(mergeMap(images => 
        {
          return this.httpClient.get(`./assets/data/images.json`).pipe(map(prices => 
            {
              images.forEach(x => x.price = prices[x.id])

              return images;
            }))
        }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  @Cacheable({
    cacheBusterObserver: imagesCacheBuster$
  })
  getImage(id: string): Observable<CatalogImage>
  {
    return this.httpClient.get<CatalogImage>(`/api/my/images/${id}`)
      .pipe(mergeMap(image => 
        {
          return this.httpClient.get(`./assets/data/images.json`).pipe(map(prices => 
            {
              image.price = prices[image.id];

              return image;
            }))
        }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  getImageUntilExpectedState(image: CatalogImage, expectedStates: string[], maxRetries = 10): Observable<CatalogImage>
  {
    // Keep polling the image until it reaches the expected state
    return this.httpClient.get<CatalogImage>(`/api/my/images/${image.id}`)
      .pipe(
        tap(x => image.state = x.state),
        repeatWhen(x =>
        {
          let retries = 0;

          return x.pipe(delay(3000), map(y =>
          {
            if (retries++ === maxRetries)
              throw { error: `Failed to retrieve the current status for image "${image.name}"` };

            return y;
          }));
        }),
        filter(x => expectedStates.includes(x.state)),
        take(1) //  needed to stop the repeatWhen loop
      );
  }

  // ----------------------------------------------------------------------------------------------------------------
  createImage(machineId: string, name: string, version: string,
    description?: string, homepage?: string, eula?: string, acl?: string, tags?: string): Observable<CatalogImage>
  {
    return this.httpClient.post<any>(`/api/my/images`,
      {
        machine: machineId,
        name,
        version,
        description,
        homepage,
        eula,
        acl,
        tags
      })
      .pipe(tap(() => imagesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  importImage(sourceDataCenterId: string, imageId: string): Observable<CatalogImage>
  {
    // Copy the image with id from the source datacenter into this datacenter
    return this.httpClient.post<CatalogImage>(`/api/my/images?action=import-from-datacenter`,
      {
        datacenter: sourceDataCenterId,
        image: imageId
      })
      .pipe(tap(() => imagesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  editImage(imageId: string, name: string, version: string, description?: string, homepage?: string, eula?: string, acl?: string, tags?: string): Observable<any>
  {
    return this.httpClient.post<any>(`/api/my/images/${imageId}?action=update`,
      {
        name,
        version,
        description,
        homepage,
        eula,
        acl,
        tags
      })
      .pipe(tap(() => imagesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  cloneImage(imageId: string): Observable<any>
  {
    // https://apidocs.Spearhead.com/cloudapi/#CloneImage
    return this.httpClient.post<any>(`/api/my/images/${imageId}?action=clone`, {})
      .pipe(tap(() => imagesCacheBuster$.next()));
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteImage(id: string): Observable<any>
  {
    // Note: Caller must be the owner of the image
    return this.httpClient.delete(`/api/my/images/${id}`)
      .pipe(tap(() => imagesCacheBuster$.next()));
  }
}
