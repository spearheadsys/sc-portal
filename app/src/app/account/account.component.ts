import { Component, OnInit, OnDestroy } from '@angular/core';
import { AccountService } from './helpers/account.service';
import { AuthService } from '../helpers/auth.service';
import { first, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { UserInfo } from './models/user-info';
import { UserKey } from './models/user-key';
import { BsModalService } from 'ngx-bootstrap/modal';
import { AccountEditorComponent } from './account-editor/account-editor.component';
import { ToastrService } from 'ngx-toastr';
import { SshKeyEditorComponent } from './ssh-key-editor/ssh-key-editor.component';
import { Title } from "@angular/platform-browser";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit, OnDestroy
{
  userInfo: UserInfo;
  userKeys: UserKey[];

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly accountService: AccountService,
    private readonly authService: AuthService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService,
    private readonly titleService: Title,
    private readonly translationService: TranslateService)
  {
    translationService.get('account.title').pipe(first()).subscribe(x => titleService.setTitle(`Joyent - ${x}`));

    //accountService.getUsers().subscribe(x => console.log(x));

    accountService.getUserLimits().subscribe(x => console.log(x));

    authService.userInfoUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(x => this.userInfo = x);

    accountService.getKeys().subscribe(x => this.userKeys = x);
  }

  // ----------------------------------------------------------------------------------------------------------------
  showEditor()
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {}
    };

    const modalRef = this.modalService.show(AccountEditorComponent, modalConfig);
    modalRef.setClass('modal-lg');
  }

  // ----------------------------------------------------------------------------------------------------------------
  addSshKey()
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {}
    };

    const modalRef = this.modalService.show(SshKeyEditorComponent, modalConfig);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit()
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
