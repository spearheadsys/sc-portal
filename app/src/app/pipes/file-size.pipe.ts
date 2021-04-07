import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileSize'
})
export class FileSizePipe implements PipeTransform
{
  constructor()
  {

  }

  transform(bytes: any, ...args: any[]): string
  {
    if (!bytes) return '0 Bytes';

    const k = 1024;
    const dm = !args || args[0] < 0 ? 0 : args[0];
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || sizes[sizes.length - 1]}`;
  }

}
