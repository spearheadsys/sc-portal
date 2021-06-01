import { Component, OnInit, OnDestroy } from '@angular/core';
import { FirewallEditorComponent } from '../firewall-editor/firewall-editor.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { distinctUntilChanged, first, takeUntil, debounceTime, filter, switchMap } from 'rxjs/operators';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import Fuse from 'fuse.js';
import { Subject, ReplaySubject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { FirewallRule } from '../models/firewall-rule';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { MachinesService } from '../../machines/helpers/machines.service';
import { FirewallService } from '../helpers/firewall.service';
import { sortArray } from '../../helpers/utils.service';
import { Title } from "@angular/platform-browser";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-firewall-rules',
  templateUrl: './firewall-rules.component.html',
  styleUrls: ['./firewall-rules.component.scss']
})
export class FirewallRulesComponent implements OnInit, OnDestroy
{
  firewallRules: FirewallRule[];
  listItems: FirewallRule[];
  loadingIndicator = true;
  editorForm: FormGroup;
  machines = {};

  private readonly fuseJsOptions: {};
  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly firewallService: FirewallService,
    private readonly machinesService: MachinesService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService,
    private readonly fb: FormBuilder,
    private readonly titleService: Title,
    private readonly translationService: TranslateService)
  {
    translationService.get('networking.firewall.title').pipe(first()).subscribe(x => titleService.setTitle(`Spearhead - ${x}`));

    // Configure FuseJs
    this.fuseJsOptions = {
      includeScore: false,
      minMatchCharLength: 2,
      includeMatches: true,
      shouldSort: false,
      threshold: .3, // Lower value means a more exact search
      keys: [
        { name: 'description', weight: .9 }
      ]
    };

    this.machinesService.get()
      .subscribe(x =>
      {
        this.machines = x.reduce((a, b) =>
        {
          a[b.id] = b.name;
          return a;
        }, {});
      });

    this.createForm();

    this.getFirewallRules();
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        searchTerm: [''],
        sortProperty: ['action']
      });

    this.editorForm.get('searchTerm').valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFiltersAndSort());

    this.editorForm.get('sortProperty').valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFiltersAndSort());

  }

  // ----------------------------------------------------------------------------------------------------------------
  private applyFiltersAndSort()
  {
    let listItems: FirewallRule[] = null;

    const searchTerm = this.editorForm.get('searchTerm').value;
    if (searchTerm.length >= 2)
    {
      const fuse = new Fuse(this.firewallRules, this.fuseJsOptions);
      const fuseResults = fuse.search(searchTerm);
      listItems = fuseResults.map(x => x.item as FirewallRule);
    }

    if (!listItems)
      listItems = [...this.firewallRules];

    this.listItems = sortArray(listItems, this.editorForm.get('sortProperty').value);
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getFirewallRules()
  {
    this.firewallService.getFirewallRules()
      .subscribe(firewallRules =>
      {
        this.firewallRules = firewallRules.map(this.firewallService.parseFirewallRule.bind(this));

        this.applyFiltersAndSort();

        this.loadingIndicator = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  setSortProperty(propertyName: string)
  {
    this.editorForm.get('sortProperty').setValue(propertyName);
  }

  // ----------------------------------------------------------------------------------------------------------------
  clearSearch()
  {
    this.editorForm.get('searchTerm').setValue('');
  }

  // ----------------------------------------------------------------------------------------------------------------
  showEditor(firewallRule?: FirewallRule)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { firewallRule }
    };

    const modalRef = this.modalService.show(FirewallEditorComponent, modalConfig);
    modalRef.setClass('modal-lg');

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      const fw = this.firewallService.parseFirewallRule(x);

      if (firewallRule)
      {
        const index = this.firewallRules.findIndex(f => f.id === fw.id);
        if (index >= 0)
          this.firewallRules.splice(index, 1, fw);

        this.toastr.info(`The firewall rule "${fw.rule}" has been updated`);
      }
      else
      {
        this.firewallRules.push(fw);

        this.toastr.info(`The firewall rule "${fw.rule}" has been created`);
      }

      this.applyFiltersAndSort();
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteFirewallRule(firewallRule: FirewallRule)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete this firewall rule?`,
        confirmButtonText: 'Yes, delete it',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(
      first(),
      switchMap(() => this.firewallService.deleteFirewallRule(firewallRule))
    )
      .subscribe(() =>
      {
        const index = this.firewallRules.findIndex(x => x.id === firewallRule.id);
        if (index >= 0)
          this.firewallRules.splice(index, 1);

        this.applyFiltersAndSort();

        this.toastr.info(`The firewall rule has been deleted`);
      }, err =>
        {
          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Failed to remove the firewall rule ${errorDetails}`);
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleFirewallRule(event, firewallRule: FirewallRule)
  {
    const enable: boolean = event.target.checked;

    firewallRule.working = true;

    this.firewallService.toggleFirewallRule(firewallRule, enable)
      .subscribe(x =>
      {
        this.toastr.info(`The firewall rule "${firewallRule.description || firewallRule.rule}" has been ${enable ? 'enabled' : 'disabled'}`);
        firewallRule.working = false;
      }, err =>
      {
        // Revert back to the previous value
        firewallRule.enabled = !enable;

        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Failed to toggle firewall rule "${firewallRule.description || firewallRule.rule}" ${errorDetails})`);
        firewallRule.working = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
