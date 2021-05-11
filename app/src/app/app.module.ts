import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';

import { TranslateModule, TranslateCompiler, TranslateLoader } from '@ngx-translate/core';
import { MESSAGE_FORMAT_CONFIG, TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { WebpackTranslateLoader } from './helpers/webpack-translate-loader.service';

import { SharedModule } from './shared.module';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { NavMenuComponent } from './components/nav-menu/nav-menu.component';
import { AuthInterceptorService } from './helpers/auth-interceptor.service';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    UnauthorizedComponent,
    NotFoundComponent,
    NavMenuComponent
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule.withServerTransition({ appId: 'spearhead-portal' }),
    HttpClientModule,
    AppRoutingModule,
    SharedModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: () => new WebpackTranslateLoader()
      },
      compiler: {
        provide: TranslateCompiler,
        useFactory: () => new TranslateMessageFormatCompiler()
      }
    })
  ],
  providers: [
    {
      provide: MESSAGE_FORMAT_CONFIG,
      useValue: {
        locales: ['en', 'ro']
      }
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule
{
  constructor()
  {
    registerLocaleData(localeEn, 'en');
  }
}
