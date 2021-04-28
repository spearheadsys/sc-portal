import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { TabsModule } from 'ngx-bootstrap/tabs';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { CarouselModule } from 'ngx-bootstrap/carousel';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { AlertModule } from 'ngx-bootstrap/alert';
import { AccordionModule } from 'ngx-bootstrap/accordion';

import { ToastrModule } from 'ngx-toastr';
import { TimeagoModule } from 'ngx-timeago';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { VirtualScrollerModule } from 'ngx-virtual-scroller';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { ClipboardModule } from 'ngx-clipboard';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import
{
  faHome, faFolder, faNetworkWired, faServer, faShieldAlt, faFireAlt, faProjectDiagram, faKey, faUsers, faLayerGroup, faInfoCircle,
  faTimes, faTrash, faUser, faUserTag, faTag, faUserLock, faLock, faPen, faCheckCircle, faPenNib, faPlus, faMinus, faAngleRight, faHandPointer,
  faArrowsAlt, faTags, faEllipsisV, faHatWizard, faUserCog, faCircle, faAngleLeft, faExternalLinkAlt, faCheck, faPowerOff, faBars, faSpinner,
  faStop, faPlay, faRedo, faMicrochip, faDesktop, faCopy, faSquare, faCheckSquare, faSave, faDatabase, faClone, faSearch, faHistory, faMask,
  faCloud, faCloudUploadAlt, faEye, faFingerprint, faLink, faClipboard, faCoins, faArrowRight, faEllipsisH, faStar, faCommentAlt, faOutdent,
  faUndo
} from '@fortawesome/free-solid-svg-icons';
import { faDocker } from '@fortawesome/free-brands-svg-icons';

import { AutofocusDirective } from './directives/autofocus.directive';

import { InlineEditorComponent } from './components/inline-editor/inline-editor.component';
import { PackagesComponent } from './catalog/packages/packages.component';
import { FileSizePipe } from './pipes/file-size.pipe';
import { AutosizeModule } from 'ngx-autosize';
import { AlphaOnlyDirective } from './directives/alpha-only.directive';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { PromptDialogComponent } from './components/prompt-dialog/prompt-dialog.component';
import { CustomImageEditorComponent } from './catalog/custom-image-editor/custom-image-editor.component';
import { LazyLoadDirective } from './directives/lazy-load.directive';

@NgModule({
  declarations: [
    AutofocusDirective,
    //HasPermissionDirective,
    InlineEditorComponent,
    PackagesComponent,
    FileSizePipe,
    AlphaOnlyDirective,
    ConfirmationDialogComponent,
    PromptDialogComponent,
    CustomImageEditorComponent,
    LazyLoadDirective,
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    ButtonsModule.forRoot(),
    CollapseModule.forRoot(),
    BsDropdownModule.forRoot(),
    TooltipModule.forRoot(),
    PopoverModule.forRoot(),
    ModalModule.forRoot(),
    AlertModule.forRoot(),
    CarouselModule.forRoot(),
    BsDatepickerModule.forRoot(),
    TabsModule.forRoot(),
    AccordionModule.forRoot(),
    ToastrModule.forRoot({
      timeOut: 5000,
      positionClass: 'toast-bottom-center',
      preventDuplicates: true,
      autoDismiss: true,
      maxOpened: 5,
      closeButton: true,
      enableHtml: true,
      tapToDismiss: false
    }),
    TranslateModule,
    TimeagoModule.forRoot(),
    NgxDatatableModule,
    AutosizeModule,
    VirtualScrollerModule,
    NgxSliderModule,
    ClipboardModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    ButtonsModule,
    CollapseModule,
    BsDropdownModule,
    TooltipModule,
    PopoverModule,
    ModalModule,
    AlertModule,
    CarouselModule,
    BsDatepickerModule,
    TabsModule,
    AccordionModule,
    TranslateModule,
    AutofocusDirective,
    TimeagoModule,
    NgxDatatableModule,
    PackagesComponent,
    FileSizePipe,
    InlineEditorComponent,
    AutosizeModule,
    AlphaOnlyDirective,
    ConfirmationDialogComponent,
    PromptDialogComponent,
    CustomImageEditorComponent,
    LazyLoadDirective,
    VirtualScrollerModule,
    NgxSliderModule,
    ClipboardModule,
    //HasPermissionDirective
  ],
  providers: [
    FileSizePipe
  ],
  entryComponents: [

  ]
})
export class SharedModule
{
  constructor()
  {
    // Add an icon to the library for convenient access in other components
    library.add(
      faHome, faFolder, faDocker, faNetworkWired, faServer, faShieldAlt, faFireAlt, faProjectDiagram, faKey, faUsers, faLayerGroup, faInfoCircle,
      faTimes, faTrash, faUser, faUserTag, faTag, faUserLock, faLock, faPen, faCheckCircle, faPenNib, faPlus, faMinus, faAngleRight, faHandPointer,
      faArrowsAlt, faTags, faEllipsisV, faHatWizard, faUserCog, faCircle, faAngleLeft, faExternalLinkAlt, faCheck, faPowerOff, faBars, faSpinner,
      faStop, faPlay, faRedo, faMicrochip, faDesktop, faCopy, faSquare, faCheckSquare, faSave, faDatabase, faClone, faSearch, faHistory, faMask,
      faCloud, faCloudUploadAlt, faEye, faFingerprint, faLink, faClipboard, faCoins, faArrowRight, faEllipsisH, faStar, faCommentAlt, faOutdent,
      faUndo
    );
  }
}
