import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilsService
{
  constructor() { }
}

export function sortArray(array: any[], sortProperty: string, sortAlphabetically = true): any[]
{
  return array.sort((a, b) =>
  {
    if (typeof a[sortProperty] === 'string')
      return a[sortProperty].localeCompare(b[sortProperty]);

    // equal items sort equally
    if (a[sortProperty] === b[sortProperty])
      return 0;

    // nulls sort after anything else
    if (a[sortProperty] == null)
      return 1;

    if (b[sortProperty] == null)
      return -1;

    // otherwise, if we're ascending, lowest sorts first
    if (sortAlphabetically)
      return a[sortProperty] < b[sortProperty] ? -1 : 1;

    // if descending, highest sorts first
    return a[sortProperty] < b[sortProperty] ? 1 : -1;
  });
}
