import { NgModule } from '@angular/core';

import { SharedModule } from '../shared.module';
import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { TranslateLoader } from '@ngx-translate/core';
import { WebpackTranslateLoader } from '../helpers/webpack-translate-loader.service';
import { TranslateCompiler } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';

import { DragDropModule } from '@angular/cdk/drag-drop';

import { SecurityComponent } from './security.component';
import { PolicyEditorComponent } from './policy-editor/policy-editor.component';
import { UserEditorComponent } from './user-editor/user-editor.component';
import { RolePoliciesEditorComponent } from './role-policies-editor/role-policies-editor.component';
import { UserRolesEditorComponent } from './user-roles-editor/user-roles-editor.component';

@NgModule({
  declarations: [
    SecurityComponent,
    PolicyEditorComponent,
    UserEditorComponent,
    RolePoliciesEditorComponent,
    UserRolesEditorComponent
  ],
  imports: [
    SharedModule,
    DragDropModule,
    RouterModule.forChild([
      {
        path: '',
        component: SecurityComponent
      }
    ]),
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        //useClass: WebpackTranslateLoader
        useFactory: () => new WebpackTranslateLoader('security')
      },
      compiler: {
        provide: TranslateCompiler,
        useFactory: () => new TranslateMessageFormatCompiler()
      },
      isolate: true
    })
  ]
})
export class SecurityModule
{
  constructor(private readonly translate: TranslateService)
  {
    translate.use(translate.store.currentLang);

    translate.store.onLangChange.subscribe((event: LangChangeEvent) => translate.use(event.lang));
  }
}
