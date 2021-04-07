import { Component, HostListener, Input, OnInit, OnDestroy } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Policy } from '../models/policy';
import { SecurityService } from '../helpers/security.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-policy-editor',
  templateUrl: './policy-editor.component.html',
  styleUrls: ['./policy-editor.component.scss']
})
export class PolicyEditorComponent implements OnInit, OnDestroy
{
  @Input()
  policy: Policy;

  save = new Subject<Policy>();
  loading: boolean;
  working: boolean;
  editorForm: FormGroup;
  canAddRule: boolean;

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly securityService: SecurityService,
    private readonly toastr: ToastrService)
  {    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    const rules = this.fb.array(this.policy?.rules
      ? this.policy.rules.map(rule =>
      {
        return this.fb.group(
          {
            rule: [rule, Validators.required]
          });
      })
      : [], [Validators.required, Validators.minLength(1)]
    );

    this.canAddRule = rules.length < 4;

    this.editorForm = this.fb.group(
      {
        name: [this.policy?.name, Validators.required],
        description: [this.policy?.description, [Validators.required, Validators.maxLength(64)]],
        rules
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  addRule(rule: string)
  {
    const array = this.editorForm.get('rules') as FormArray;

    const control = this.fb.group(
      {
        rule: [rule, Validators.required]
      });

    array.push(control);

    this.canAddRule = array.length < 4;
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeRule(index: number)
  {
    const array = this.editorForm.get('rules') as FormArray;

    array.removeAt(index);

    this.canAddRule = array.length < 4;
  }

  // ----------------------------------------------------------------------------------------------------------------
  close()
  {
    removeEventListener('document:keydown.escape', this.returnPressed);

    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  saveChanges()
  {
    this.working = true;

    const changes = this.editorForm.getRawValue();

    const policy = new Policy();
    policy.name = changes.name;
    policy.description = changes.description;
    policy.rules = changes.rules.map(x => x.rule);

    const observable = this.policy
      ? this.securityService.editPolicy(this.policy.id, policy)
      : this.securityService.addPolicy(policy);

    observable.subscribe(x =>
    {
      const message = this.policy
        ? `The policy "${policy.name}" has been updated`
        : `The policy "${policy.name}" has been created`;

      this.toastr.info(message);

      this.working = false;

      this.save.next(x);
      this.close();
    },
      err =>
      {
        this.working = false;
        this.toastr.error(err.error.message);
      });
  }

  // --------------------------------------------------------------------------------------------------
  @HostListener('document:keydown.enter', ['$event'])
  returnPressed(event)
  {
    if (!event) return;

    event.preventDefault();
    event.stopPropagation();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.createForm();
  }

  // --------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    removeEventListener('document:keydown.escape', this.returnPressed);
  }
}
