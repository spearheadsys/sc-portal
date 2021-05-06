import { NgModule } from '@angular/core';

import { SharedModule } from '../shared.module';
import { RouterModule } from '@angular/router';

import { WebpackTranslateLoader } from '../helpers/webpack-translate-loader.service';
import { LangChangeEvent, TranslateCompiler, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { HelpComponent } from './help/help.component';

@NgModule({
  declarations: [HelpComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: HelpComponent,
        data:
        {
          title: 'help.title',
          subTitle: 'help.subTitle',
          icon: 'help-circle'
        }
      }
    ]),
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        //useClass: WebpackTranslateLoader
        useFactory: () => new WebpackTranslateLoader('help')
      },
      compiler: {
        provide: TranslateCompiler,
        useFactory: () => new TranslateMessageFormatCompiler()
      },
      isolate: true
    })
  ]
})
export class HelpModule
{
  constructor(private readonly translate: TranslateService)
  {
    translate.use(translate.store.currentLang);

    translate.store.onLangChange.subscribe((event: LangChangeEvent) => translate.use(event.lang));
  }
}
