import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { FirewallRule } from '../models/firewall-rule';
import { FirewallRuleRequest } from '../models/firewall-rule';
import { FirewallService } from '../helpers/firewall.service';
import { ToastrService } from 'ngx-toastr';
import { MachinesService } from '../../machines/helpers/machines.service';

@Component({
  selector: 'app-firewall-editor',
  templateUrl: './firewall-editor.component.html',
  styleUrls: ['./firewall-editor.component.scss']
})
export class FirewallEditorComponent implements OnInit, OnDestroy
{
  @Input()
  firewallRule: FirewallRule;

  save = new Subject<any>();
  loading: boolean;
  working: boolean;
  editorForm: FormGroup;
  rule: string;
  canAddFromRule: boolean;
  canAddToRule: boolean;
  protocolConfigRegex: string;
  machines = {};

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly toastr: ToastrService,
    private readonly machinesService: MachinesService,
    private readonly firewallService: FirewallService)
  { // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());

    this.machinesService.get()
      .subscribe(x =>
      {
        this.machines = x.reduce((a, b) =>
        {
          a[b.id] = b.name;
          return a;
        }, {});
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    const from = this.fb.array(
      this.firewallRule?.fromArray
        ? this.firewallRule.fromArray.map(x => this.fb.group({ type: x.type, config: x.config }))
        : [],
      { validators: [Validators.required] }
    );

    this.canAddFromRule = true;

    const to = this.fb.array(
      this.firewallRule?.toArray
        ? this.firewallRule.toArray.map(x => this.fb.group({ type: x.type, config: x.config }))
        : [],
      { validators: [Validators.required] }
    );

    this.canAddToRule = true;

    this.editorForm = this.fb.group(
      {
        action: [this.firewallRule?.action.toUpperCase(), [Validators.required]],
        protocol: [this.firewallRule?.protocol.toLowerCase(), [Validators.required]],
        protocolConfig: [
          { value: this.firewallRule?.protocolConfig, disabled: this.firewallRule?.protocolConfig === 'all' },
          [Validators.required]
        ],
        from,
        to,
        description: [this.firewallRule?.description || '']
      });

    this.setProtocolConfigValidators(this.editorForm.get('protocol').value);

    this.editorForm.get('protocol').valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(this.setProtocolConfigValidators.bind(this));
  }

  // ----------------------------------------------------------------------------------------------------------------
  private setProtocolConfigValidators(protocol: string)
  {
    if (protocol === 'icmp')
      this.protocolConfigRegex = '^([0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])?(:)?([0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])$';
    else
    {
      // Make sure there are no illegal characters in the input box
      if (this.editorForm.get('protocolConfig').value)
        this.editorForm.get('protocolConfig').setValue(this.editorForm.get('protocolConfig').value.replace(/:/g, ''));

      this.protocolConfigRegex = '^([1-9]|[1-9][0-9]|[1-9][0-9][0-9]|[1-9][0-9][0-9][0-9])$';
    }

    this.editorForm.get('protocolConfig').setValidators([Validators.required, Validators.pattern(this.protocolConfigRegex)]);
  }

  // ----------------------------------------------------------------------------------------------------------------
  close()
  {
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  saveChanges()
  {
    this.working = true;

    const changes = this.editorForm.getRawValue();

    const firewallRule = new FirewallRule();
    firewallRule.id = this.firewallRule?.id;
    firewallRule.action = changes.action;
    firewallRule.protocol = changes.protocol;
    firewallRule.protocolConfig = changes.protocolConfig;
    firewallRule.fromArray = changes.from;
    firewallRule.toArray = changes.to;

    const request = new FirewallRuleRequest();
    request.description = changes.description;
    request.enabled = this.firewallRule ? this.firewallRule.enabled : true;
    request.rule = this.firewallService.stringifyFirewallRule(firewallRule);

    const observable = this.firewallRule
      ? this.firewallService.editFirewallRule(this.firewallRule.id, request)
      : this.firewallService.addFirewallRule(request);

    observable.pipe(takeUntil(this.destroy$))
      .subscribe(response =>
      {
        this.working = false;

        this.save.next(response);

        this.close();
      }, err =>
        {
          const message = err.error.errors ? err.error.errors[0].message : err.error.message;
          this.toastr.error(`Failed  to save firewall rule (${message})`);

          this.working = false;
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  setProtocolConfig(value?: string)
  {
    this.editorForm.get('protocolConfig').setValue(value);

    if (value === 'all')
      this.editorForm.get('protocolConfig').disable();
    else
      this.editorForm.get('protocolConfig').enable();
  }

  // ----------------------------------------------------------------------------------------------------------------
  addFromRule(rule: { type: string; config: string })
  {
    const array = this.editorForm.get('from') as FormArray;

    if (['any', 'all'].includes(rule.type) || array.controls.find(x => ['any', 'all'].includes(x.get('type').value)))
      array.clear();

    array.push(this.fb.group({ type: rule.type, config: rule.config }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeFromRule(index: number)
  {
    const array = this.editorForm.get('from') as FormArray;

    array.removeAt(index);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addToRule(rule: { type: string; config: string })
  {
    const array = this.editorForm.get('to') as FormArray;

    if (['any', 'all'].includes(rule.type) || array.controls.find(x => ['any', 'all'].includes(x.get('type').value)))
      array.clear();

    array.push(this.fb.group({ type: rule.type, config: rule.config }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeToRule(index: number)
  {
    const array = this.editorForm.get('to') as FormArray;

    array.removeAt(index);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.createForm();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
