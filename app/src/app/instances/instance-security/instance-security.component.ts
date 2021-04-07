import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CatalogService } from '../../catalog/helpers/catalog.service';
import { InstancesService } from '../helpers/instances.service';
import { Subject } from 'rxjs';
import { delay, switchMap, takeUntil, tap } from 'rxjs/operators';
import Fuse from 'fuse.js';
import { SecurityService } from '../../security/helpers/security.service';

@Component({
  selector: 'app-instance-security',
  templateUrl: './instance-security.component.html',
  styleUrls: ['./instance-security.component.scss']
})
export class InstanceSecurityComponent implements OnInit, OnDestroy
{
  @Input()
  instance: any;

  @Input()
  set loadRoles(value: boolean)
  {
    if (value && this.instance && !this.roles)
      this.getRoles();
  }

  loadingRoles: boolean;
  filteredRoles: any[];
  roleName: string;
  _searchTerm: string;
  shouldSearch: boolean;

  private destroy$ = new Subject();
  private roles: any[];
  private readonly fuseJsOptions: {};

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly instancesService: InstancesService,
    private readonly securityService: SecurityService,
    private readonly toastr: ToastrService)
  {
    // Configure FuseJs
    this.fuseJsOptions = {
      includeScore: false,
      minMatchCharLength: 2,
      includeMatches: false,
      shouldSort: false,
      threshold: .3, // Lower value means a more exact search
      keys: [
        { name: 'name', weight: .9 }
      ]
    };
  }

  // ----------------------------------------------------------------------------------------------------------------
  searchBoxFocused(isFocused = true)
  {
    if (isFocused)
      this.shouldSearch = true;
    else
      this.shouldSearch = !!this.searchTerm;
  }

  // ----------------------------------------------------------------------------------------------------------------
  get searchTerm()
  {
    return this._searchTerm;
  }
  set searchTerm(value: string)
  {
    this._searchTerm = value;

    if (!value)
    {
      this.filteredRoles = this.roles;
    }
    else
    {
      // Use fuzzy search for lookups
      const fuse = new Fuse(this.roles, this.fuseJsOptions);
      this.filteredRoles = fuse.search(value).map(x => x.item);
    }
  }

  // ----------------------------------------------------------------------------------------------------------------
  setInstanceRole(event, role)
  {

  }

  // ----------------------------------------------------------------------------------------------------------------
  private getRoles()
  {
    this.loadingRoles = true;

    this.securityService.getRoles()
      .subscribe(x =>
      {
        this.roles = x;
        this.filteredRoles = x;

        this.loadingRoles = false;
      },
        err =>
        {
          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Failed to retrieve the list of roles ${errorDetails}`);
          this.loadingRoles = false;
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    // TODO: Find a way to retrieve the list of RoleTags
    //this.instancesService.getRoleTags(this.instance.id)
    //  .subscribe();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
