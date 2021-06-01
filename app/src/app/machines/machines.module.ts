import { NgModule } from '@angular/core';

import { SharedModule } from '../shared.module';
import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { TranslateLoader } from '@ngx-translate/core';
import { WebpackTranslateLoader } from '../helpers/webpack-translate-loader.service';
import { TranslateCompiler } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';

import { MachinesComponent } from './machines.component';
import { MachineWizardComponent } from './machine-wizard/machine-wizard.component';
import { PackageSelectorComponent } from './package-selector/package-selector.component';
import { MachineSnapshotsComponent } from './machine-snapshots/machine-snapshots.component';
import { MachineNetworksComponent } from './machine-networks/machine-networks.component';
import { MachineSecurityComponent } from './machine-security/machine-security.component';
import { MachineTagEditorComponent } from './machine-tag-editor/machine-tag-editor.component';
import { MachineHistoryComponent } from './machine-history/machine-history.component';
import { CustomImageEditorComponent } from '../catalog/custom-image-editor/custom-image-editor.component';
import { MachineInfoComponent } from './machine-info/machine-info.component';

@NgModule({
  declarations: [
    MachinesComponent,
    MachineWizardComponent,
    PackageSelectorComponent,
    MachineSnapshotsComponent,
    MachineNetworksComponent,
    MachineSecurityComponent,
    MachineTagEditorComponent,
    MachineHistoryComponent,
    MachineInfoComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: MachinesComponent,
        data:
        {
          title: 'machines.title',
          subTitle: 'machines.subTitle',
          icon: 'server'
        },
        children: [
          {
            path: 'wizard',
            component: MachineWizardComponent,
            data:
            {
              title: 'machines.wizard.title',
              subTitle: 'machines.wizard.subTitle',
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
        useFactory: () => new WebpackTranslateLoader('machines')
      },
      compiler: {
        provide: TranslateCompiler,
        useFactory: () => new TranslateMessageFormatCompiler()
      },
      isolate: true
    })
  ],
  entryComponents: [
    MachineWizardComponent,
    PackageSelectorComponent,
    MachineTagEditorComponent,
    MachineHistoryComponent,
    CustomImageEditorComponent

  ]
})
export class MachinesModule
{
  constructor(private readonly translate: TranslateService)
  {
    translate.use(translate.store.currentLang);

    translate.store.onLangChange.subscribe((event: LangChangeEvent) => translate.use(event.lang));
  }
}
