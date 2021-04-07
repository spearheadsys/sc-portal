import { TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { from } from 'rxjs';

export class WebpackTranslateLoader implements TranslateLoader
{
  private readonly moduleName: string;

  constructor(moduleName?: string)
  {
    this.moduleName = moduleName;
  }

  getTranslation(lang: string): Observable<any>
  {
    const moduleName = this.moduleName ? `/${this.moduleName}` : '';
    return from(import(`../../assets/i18n${moduleName}/${lang}.json`));
  }
}

