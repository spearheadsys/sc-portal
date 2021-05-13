import { Component, OnInit, OnDestroy } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem, copyArrayItem, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { SecurityService } from './helpers/security.service';
import { User } from './models/user';
import { first, mergeMap, switchMap, takeUntil, tap } from 'rxjs/operators';
import { forkJoin, Subject } from 'rxjs';
import { Role } from './models/role';
import { Policy } from './models/policy';
import { ToastrService } from 'ngx-toastr';
import { BsModalService } from 'ngx-bootstrap/modal';
import { UserEditorComponent } from './user-editor/user-editor.component';
import { PolicyEditorComponent } from './policy-editor/policy-editor.component';
import { RolePoliciesEditorComponent } from './role-policies-editor/role-policies-editor.component';
import { UserRolesEditorComponent } from './user-roles-editor/user-roles-editor.component';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { PromptDialogComponent } from '../components/prompt-dialog/prompt-dialog.component';
import { RolePolicy } from './models/role-policy';
import { RoleUser } from './models/role-user';
import { Title } from "@angular/platform-browser";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-security',
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss']
})
export class SecurityComponent implements OnInit, OnDestroy
{
  users: User[];
  roles: Role[];
  policies: Policy[];

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly securityService: SecurityService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService,
    private readonly titleService: Title,
    private readonly translationService: TranslateService)
  {
    translationService.get('security.title').pipe(first()).subscribe(x => titleService.setTitle(`Spearhead - ${x}`));

    forkJoin({
      users: securityService.getUsers(),
      roles: securityService.getRoles(),
      policies: securityService.getPolicies()
    })
      .subscribe(response =>
      {
        // Roles has links to both Users and Policies
        this.roles = response.roles;

        this.policies = response.policies;

        const userRoles = {};
        for (const role of response.roles)
        {
          for (const member of role.members)
          {
            userRoles[member.id] = userRoles[member.id] || [];
            userRoles[member.id].push({
              id: role.id,
              name: role.name
            });
          }
        }

        this.users = response.users.map(x =>
        {
          let user = new User();
          user = Object.assign(user, x);

          user.roles = userRoles[x.id] || [];

          return user;
        });
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  drop = (event: CdkDragDrop<string[]>) =>
  {
    if (event.previousContainer === event.container)
      //moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;

    //copyArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    switch (event.previousContainer.id)
    {
      case 'policies':
        return this.addPolicyToRole(event.item.data, this.roles.find(x => x.id === event.container.data['id']));

      case 'roles':
        return this.addRoleToUser(event.item.data, this.users.find(x => x.id === event.container.data['id']));
    }
  }

  // ----------------------------------------------------------------------------------------------------------------
  usersEnterPredicate = (drag: CdkDrag, drop: CdkDropList) =>
  {
    if (drag.dropContainer.id !== 'roles')
      return false;

    const user = this.users.find(x => x.id === drop.data.id);

    return !user.roles.find(x => x.id === drag.data.id);
  }

  // ----------------------------------------------------------------------------------------------------------------
  rolesEnterPredicate = (drag: CdkDrag, drop: CdkDropList) =>
  {
    if (drag.dropContainer.id !== 'policies')
      return false;

    const role = this.roles.find(x => x.id === drop.data.id);

    return !role.policies.find(x => x.id === drag.data.id);
  }

  // ----------------------------------------------------------------------------------------------------------------
  noReturnPredicate(drag: CdkDrag, drop: CdkDropList)
  {
    return false;
  }

  // ----------------------------------------------------------------------------------------------------------------
  noSortPredicate()
  {
    return false;
  }

  // ----------------------------------------------------------------------------------------------------------------
  showUserEditor(user?: User, changePassword = false)
  {
    if (user)
      user.working = true;

    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { user, changePassword }
    };

    const modalRef = this.modalService.show(UserEditorComponent, modalConfig);
    modalRef.setClass('modal-lg');

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      if (changePassword)
      {
        this.toastr.info(`The password has been update for user "${user.login}"`);
      }
      else if (user)
      {
        this.toastr.info(`The details have been updated for user "${user.login}"`);

        user = Object.assign(user, x);
      }
      else
      {
        this.users.push(x);

        user.working = false;
      }
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteUser(user: User)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete the "${user.login}" user?`,
        confirmButtonText: 'Yes, delete this user',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);
    modalRef.content.confirm.pipe(
      first(),
      switchMap(() => this.securityService.removeUser(user))
    )
      .subscribe(() =>
      {
        const index = this.users.findIndex(p => p.id === user.id);
        if (index >= 0)
          this.users.splice(index, 1);

        this.toastr.info(`The "${user.login}" user has been succesfuly removed`);
      }, err =>
      {
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Faild to remove the "${user.login}" role (${errorDetails})`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  showRoleEditor(role?: Role)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        value: role?.name,
        required: true,
        title: role ? 'Change role name' : 'Create role',
        prompt: 'Type in the name for this role',
        placeholder: 'Role name',
        saveButtonText: role ? 'Save changes' : 'Create role'
      }
    };

    const modalRef = this.modalService.show(PromptDialogComponent, modalConfig);
    modalRef.content.save
      .pipe(
        first(),
        switchMap(roleName =>
        {
          if (role)
            return this.securityService.editRole(role.id, roleName);

          return this.securityService.addRole(roleName);
        })
      )
      .subscribe(x =>
      {
        const message = role
          ? `The "${role.name}" role has been renamed to "${x.name}"`
          : `The "${x.name}" role has been created`;

        if (role)
        {
          const index = this.roles.findIndex(p => p.id === x.id);
          if (index >= 0)
            this.roles.splice(index, 1, x);

          // Also update the users that use this role
          for (const user of this.users)
            for (const userRole of user.roles)
              if (role.id === userRole.id)
                userRole.name = x.name;
        }
        else
          this.roles.push(x);

        this.toastr.info(message);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteRole(role: Role)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete the "${role.name}" role?`,
        confirmButtonText: 'Yes, delete this role',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);
    modalRef.content.confirm.pipe(
      first(),
      switchMap(() => this.securityService.removeRole(role))
    )
      .subscribe(() =>
      {
        const index = this.roles.findIndex(p => p.id === role.id);
        if (index >= 0)
          this.roles.splice(index, 1);

        // Also remove this role from all the associated users
        for (const user of this.users)
          user.roles = user.roles.filter(rp => rp.id !== role.id);

        this.toastr.info(`The "${role.name}" role has been succesfuly removed`);
      }, err =>
      {
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Faild to remove the "${role.name}" role (${errorDetails})`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  showPolicyEditor(policy?: Policy)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { policy }
    };

    const modalRef = this.modalService.show(PolicyEditorComponent, modalConfig);

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      if (policy)
      {
        const index = this.policies.findIndex(p => p.id === policy.id);
        if (index >= 0)
          this.policies.splice(index, 1, x);

        // Also update the roles that use this policy
        for (const role of this.roles)
          for (const rolePolicy of role.policies)
            if (policy.id === rolePolicy.id)
              rolePolicy.name = x.name;
      }
      else
      {
        this.policies = this.policies || [];
        this.policies.push(x);
      }
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deletePolicy(policy: Policy)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete the "${policy.name}" policy?`,
        confirmButtonText: 'Yes, delete this policy',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);
    modalRef.content.confirm.pipe(
      first(),
      switchMap(() => this.securityService.removePolicy(policy))
    )
      .subscribe(() =>
      {
        const index = this.policies.findIndex(p => p.id === policy.id);
        if (index >= 0)
          this.policies.splice(index, 1);

        // Also remove this policy from all the associated roles
        for (const role of this.roles)
          role.policies = role.policies.filter(rp => rp.id !== policy.id);

        this.toastr.info(`The "${policy.name}" policy has been succesfuly removed`);
      }, err =>
      {
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Faild to remove the "${policy.name}" policy ${errorDetails}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  assignPolicyToRoles(policy: Policy)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {}
    };

    const modalRef = this.modalService.show(RolePoliciesEditorComponent, modalConfig);

    modalRef.content.save.pipe(first()).subscribe(x => { });
  }

  // ----------------------------------------------------------------------------------------------------------------
  addPolicyToRole(policy: Policy, role: Role)
  {
    const rolePolicy = new RolePolicy();
    rolePolicy.id = policy.id;
    rolePolicy.name = policy.name;

    // This causes the UI to add the item in the list. In case of an error we have a compensation action
    // that will remove this item from the list. We do this to avoid having the user see an empty list
    // while the server responds.
    role.policies = role.policies || [];
    role.policies.push(rolePolicy);

    // We don't specify the second parameter of securityService.addPolicyToRole() because we've already
    // updated the role's policies above
    this.securityService.addPolicyToRole(role)
      .subscribe(x =>
      {
        this.toastr.info(`The "${policy.name}" policy has been added to the "${role.name}" role`);
      }, err =>
      {
        // Compensation action
        const index = role.policies.findIndex(x => x.id === policy.id);
        if (index >= 0)
          role.policies.splice(index, 1);

        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Failed to add the "${policy.name}" policy to the "${role.name}" role ${errorDetails}`);;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  removePolicyFromRole(policy: Policy, role: Role)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to remove the "${policy.name}" policy from the "${role.name}" role?`,
        confirmButtonText: 'Yes, remove it',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);
    modalRef.content.confirm
      .pipe(
        first(),
        switchMap(() => this.securityService.removePolicyFromRole(policy.id, role))
      )
      .subscribe(x =>
      {
        const index = role.policies.findIndex(rp => rp.id === policy.id);
        if (index >= 0)
        {
          role.policies.splice(index, 1);

          this.toastr.info(`The "${policy.name}" policy has been removed from the "${role.name}" role`);
        }
      }, err =>
      {
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Failed to remove the "${policy.name}" policy from the "${role.name}" role ${errorDetails}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  addRoleToUser(role: Role, user: User)
  {
    const roleUser = new RoleUser();
    roleUser.id = user.id;
    roleUser.type = 'subuser';
    roleUser.default = !role.members.length;

    // This causes the UI to add the item in the list. In case of an error we have a compensation action
    // that will remove this item from the list. We do this to avoid having the user see an empty list
    // while the server responds.
    user.roles = user.roles || [];
    user.roles.push(role);

    this.toastr.info(`Adding the "${role.name}" role to the "${user.login}" user...`);

    this.securityService.addRoleToUser(role, roleUser)
      .pipe(
        switchMap(() => this.securityService
          .getRoleUntil(role, x => x.members?.some(m => m.id === roleUser.id))
          .pipe(takeUntil(this.destroy$))
        ))
      .subscribe(x =>
      {
        this.toastr.info(`The "${role.name}" role has been added to the "${user.login}" user`);
      }, err =>
      {
        // TODO: Investigate further why this method returns a 500 error, even though it succeeds
        // Compensation action
        const index = user.roles.findIndex(x => x.id === role.id);
        if (index >= 0)
          user.roles.splice(index, 1);

        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Failed to add the "${role.name}" role to the "${user.login}" user ${errorDetails}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeRoleFromUser(roleUser: RoleUser, user: User)
  {
    const role = this.roles.find(x => x.id === roleUser.id);

    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to remove the "${role.name}" role from the "${user.login}" user?`,
        confirmButtonText: 'Yes, remove it',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);
    modalRef.content.confirm
      .pipe(
        first(),
        tap(() => this.toastr.info(`Removing the "${role.name}" role from the "${user.login}" user...`)),
        switchMap(() => this.securityService.removeRoleFromUser(role, user.id)),
        switchMap(() => this.securityService
          .getRoleUntil(role, x => !x.members?.some(m => m.id === roleUser.id))
          .pipe(takeUntil(this.destroy$))
        )
      )
      .subscribe(x =>
      {
        let index = user.roles.findIndex(r => r.id === role.id);
        if (index >= 0)
        {
          // Remove the role from the user's list of roles
          user.roles.splice(index, 1);

          // Also remove the role from the list of role members
          index = role.members.findIndex(rm => rm.id === user.id);
          if (index >= 0)
            role.members.splice(index, 1);

          this.toastr.info(`The "${role.name}" role has been removed from the "${user.login}" user`);
        }
      }, err =>
      {
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Failed to remove the "${role.name}" role from the "${user.login}" user ${errorDetails}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  assignRoleToUsers(role: Role)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {}
    };

    const modalRef = this.modalService.show(UserRolesEditorComponent, modalConfig);

    modalRef.content.save.pipe(first()).subscribe(x => { });
  }

  // ----------------------------------------------------------------------------------------------------------------
  get roleDropLists()
  {
    return this.roles ? new Array(this.roles.length).fill(0).map((x, i) => `role${i}`) : [];
  }

  // ----------------------------------------------------------------------------------------------------------------
  get userDropLists()
  {
    return this.users ? new Array(this.users.length).fill(0).map((x, i) => `user${i}`) : [];
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy(): void
  {
    this.destroy$.next();
  }
}
