import { NgModule } from '@angular/core';

import { SharedModule } from '../shared.module';
import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { TranslateLoader } from '@ngx-translate/core';
import { WebpackTranslateLoader } from '../helpers/webpack-translate-loader.service';
import { TranslateCompiler } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';

import { InstancesComponent } from './instances.component';
import { InstanceWizardComponent } from './instance-wizard/instance-wizard.component';
import { PackageSelectorComponent } from './package-selector/package-selector.component';
import { InstanceSnapshotsComponent } from './instance-snapshots/instance-snapshots.component';
import { InstanceNetworksComponent } from './instance-networks/instance-networks.component';
import { InstanceSecurityComponent } from './instance-security/instance-security.component';
import { InstanceTagEditorComponent } from './instance-tag-editor/instance-tag-editor.component';
import { InstanceHistoryComponent } from './instance-history/instance-history.component';
import { CustomImageEditorComponent } from '../catalog/custom-image-editor/custom-image-editor.component';
import { InstanceInfoComponent } from './instance-info/instance-info.component';

@NgModule({
  declarations: [
    InstancesComponent,
    InstanceWizardComponent,
    PackageSelectorComponent,
    InstanceSnapshotsComponent,
    InstanceNetworksComponent,
    InstanceSecurityComponent,
    InstanceTagEditorComponent,
    InstanceHistoryComponent,
    InstanceInfoComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: InstancesComponent,
        data:
        {
          title: 'instances.title',
          subTitle: 'instances.subTitle',
          icon: 'server'
        },
        children: [
          {
            path: 'wizard',
            component: InstanceWizardComponent,
            data:
            {
              title: 'instances.wizard.title',
              subTitle: 'instances.wizard.subTitle',
              icon: 'hat-wizard'
            }
          }
        ]
      }
    ]),
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        //useClass: WebpackTranslateLoader
        useFactory: () => new WebpackTranslateLoader('dashboard')
      },
      compiler: {
        provide: TranslateCompiler,
        useFactory: () => new TranslateMessageFormatCompiler()
      },
      isolate: true
    })
  ],
  entryComponents: [
    InstanceWizardComponent,
    PackageSelectorComponent,
    InstanceTagEditorComponent,
    InstanceHistoryComponent,
    CustomImageEditorComponent

  ]
})
export class InstancesModule
{
  constructor(private readonly translate: TranslateService)
  {
    translate.use(translate.store.currentLang);

    translate.store.onLangChange.subscribe((event: LangChangeEvent) => translate.use(event.lang));
  }
}
