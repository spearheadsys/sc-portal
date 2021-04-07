import { NgModule } from '@angular/core';

import { SharedModule } from '../shared.module';
import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { TranslateLoader } from '@ngx-translate/core';
import { WebpackTranslateLoader } from '../helpers/webpack-translate-loader.service';
import { TranslateCompiler } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';

import { CatalogComponent } from './catalog.component';
import { CustomImagesComponent } from './custom-images/custom-images.component';
import { DockerImagesComponent } from './docker-images/docker-images.component';
import { DockerRegistryComponent } from './docker-registry/docker-registry.component';
import { DockerImageEditorComponent } from './docker-image-editor/docker-image-editor.component';
import { DockerRegistryEditorComponent } from './docker-registry-editor/docker-registry-editor.component';
import { CustomImageEditorComponent } from './custom-image-editor/custom-image-editor.component';

@NgModule({
  declarations: [
    CatalogComponent,
    CustomImagesComponent,
    DockerImagesComponent,
    DockerRegistryComponent,
    DockerImageEditorComponent,
    DockerRegistryEditorComponent
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
            redirectTo: 'custom-images'
          },
          {
            path: 'custom-images',
            component: CustomImagesComponent,
            data:
            {
              title: 'catalog.customImages.title',
              subTitle: 'catalog.customImages.subTitle',
              icon: 'layer-group'
            }
          },
          {
            path: 'docker-images',
            component: DockerImagesComponent,
            data:
            {
              title: 'catalog.dockerImages.title',
              subTitle: 'catalog.dockerImages.subTitle',
              icon: ['fab', 'docker']
            }
          },
          {
            path: 'docker-registry',
            component: DockerRegistryComponent,
            data:
            {
              title: 'catalog.dockerRegistry.title',
              subTitle: 'catalog.dockerRegistry.subTitle',
              icon: ['fab', 'docker']
            }
          }]
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
    DockerImageEditorComponent,
    DockerRegistryEditorComponent,
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
