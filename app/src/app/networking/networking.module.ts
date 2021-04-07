import { NgModule } from '@angular/core';

import { SharedModule } from '../shared.module';
import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { TranslateLoader } from '@ngx-translate/core';
import { WebpackTranslateLoader } from '../helpers/webpack-translate-loader.service';
import { TranslateCompiler } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';

import { NetworkingComponent } from './networking.component';
import { NetworksComponent } from './networks/networks.component';
import { NetworkEditorComponent } from './network-editor/network-editor.component';
import { VirtualNetworkEditorComponent } from './virtual-network-editor/virtual-network-editor.component';
import { FirewallEditorComponent } from './firewall-editor/firewall-editor.component';
import { FirewallRulesComponent } from './firewall-rules/firewall-rules.component';
import { FirewallRuleEditorComponent } from './firewall-rule-editor/firewall-rule-editor.component';

@NgModule({
  declarations: [
    NetworkingComponent,
    NetworksComponent,
    NetworkEditorComponent,
    VirtualNetworkEditorComponent,
    FirewallEditorComponent,
    FirewallRulesComponent,
    FirewallRuleEditorComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        redirectTo: 'networks'
      },
      {
        path: 'networks',
        component: NetworksComponent,
        data:
        {
          title: 'networks.title',
          subTitle: 'networks.subTitle',
          icon: 'network-wired'
        }
      },
      {
        path: 'firewall-rules',
        component: FirewallRulesComponent,
        data:
        {
          title: 'firewall.title',
          subTitle: 'firewall.subTitle',
          icon: 'fire-alt'
        }
      }
    ]),
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        //useClass: WebpackTranslateLoader
        useFactory: () => new WebpackTranslateLoader('networking')
      },
      compiler: {
        provide: TranslateCompiler,
        useFactory: () => new TranslateMessageFormatCompiler()
      },
      isolate: true
    })
  ],
  entryComponents: [
    NetworkEditorComponent,
    VirtualNetworkEditorComponent,
    FirewallEditorComponent
  ]
})
export class NetworkingModule
{
  constructor(private readonly translate: TranslateService)
  {
    translate.use(translate.store.currentLang);

    translate.store.onLangChange.subscribe((event: LangChangeEvent) => translate.use(event.lang));
  }
}
