import { NgModule } from '@angular/core';

import { SharedModule } from '../shared.module';
import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { TranslateLoader } from '@ngx-translate/core';
import { WebpackTranslateLoader } from '../helpers/webpack-translate-loader.service';
import { TranslateCompiler } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';

import { CatalogComponent } from './catalog.component';
import { ImagesComponent } from './images/images.component';
import { CustomImageEditorComponent } from './custom-image-editor/custom-image-editor.component';

@NgModule({
  declarations: [
    CatalogComponent,
    ImagesComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: CatalogComponent,
        children: [
          {
            path: '',
            redirectTo: 'images'
          },
          {
            path: 'images',
            component: ImagesComponent,
            data:
            {
              title: 'catalog.images.title',
              subTitle: 'catalog.images.subTitle',
              icon: 'layer-group'
            }
          }
        ]
      }
    ]),
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        //useClass: WebpackTranslateLoader
        useFactory: () => new WebpackTranslateLoader('catalog')
      },
      compiler: {
        provide: TranslateCompiler,
        useFactory: () => new TranslateMessageFormatCompiler()
      },
      isolate: true
    })
  ],
  entryComponents: [
    CustomImageEditorComponent
  ]
})
export class CatalogModule
{
  constructor(private readonly translate: TranslateService)
  {
    translate.use(translate.store.currentLang);

    translate.store.onLangChange.subscribe((event: LangChangeEvent) => translate.use(event.lang));
  }
}
