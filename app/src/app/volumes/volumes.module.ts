import { NgModule } from '@angular/core';

import { SharedModule } from '../shared.module';
import { RouterModule } from '@angular/router';

import { WebpackTranslateLoader } from '../helpers/webpack-translate-loader.service';
import { LangChangeEvent, TranslateCompiler, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';

import { VolumesComponent } from './volumes.component';
import { VolumeEditorComponent } from './volume-editor/volume-editor.component';


@NgModule({
  declarations: [
    VolumesComponent,
    VolumeEditorComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: VolumesComponent,
        data:
        {
          title: 'volumes.title',
          subTitle: 'volumes.subTitle',
          icon: 'database'
        }
      }
    ]),
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        //useClass: WebpackTranslateLoader
        useFactory: () => new WebpackTranslateLoader('volumes')
      },
      compiler: {
        provide: TranslateCompiler,
        useFactory: () => new TranslateMessageFormatCompiler()
      },
      isolate: true
    })
  ],
  entryComponents: [
    VolumeEditorComponent
  ]
})
export class VolumesModule
{
  constructor(private readonly translate: TranslateService)
  {
    translate.use(translate.store.currentLang);

    translate.store.onLangChange.subscribe((event: LangChangeEvent) => translate.use(event.lang));
  }
}
