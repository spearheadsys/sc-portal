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
    private readonly toastr: ToastrService)
  {
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


    modalRef.content.save.pipe(first()).subscribe(x => this.userKeys = [...this.userKeys, x]);
    //  this.accountService.addKey('test',
    //    'ssh-rsa AAAAB3NzaC1yc2EAAAABJQAAAQEAzf7Cbu8tPvxgwG3MhXK959F7TtsSCQQXb3jSPAJtQT+CltA+OYLod/ojclfQfnutIHUpqq6PsCD/nhxiF2JYkKWve7olJV6akvXQOGNLqRdXTcEouUhevLAQV3sB+YNvjr5FRpspNK8prAn7UU4vyZhCKBT8VAgwkio3u8eR/26XDNow1C9NXC6P+2BYWjjKbJCI41XpLFIzsmHBw+XZox+IbVg8mcVsWfdhEHRDyxM1HgvOKU9vkCwigmww9nsIatSQuM0jCtohQRkddc2DlfKieBmpeC/VqNoWE77iei/nVOcgIaLjwwevdCGHhwtSBmkE+W14JCwFbzl0yThL2w== rsa-key-20210314',
    //    'ba:04:55:94:64:24:75:a4:b2:60:e5:bf:77:19:df:34')
    //    .subscribe(response => this.userKeys = [...this.userKeys, response],
    //      err =>
    //      {
    //        this.toastr.error(err.error.message)
    //      });
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
