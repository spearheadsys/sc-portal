import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { Instance } from '../../instances/models/instance';
import { InstancesService } from '../../instances/helpers/instances.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-firewall-rule-editor',
  templateUrl: './firewall-rule-editor.component.html',
  styleUrls: ['./firewall-rule-editor.component.scss']
})
export class FirewallRuleEditorComponent implements OnInit, OnDestroy
{
  @Input()
  disabled: boolean;

  @Output()
  saved = new EventEmitter();

  instances: Instance[];
  editorVisible: boolean;
  editorForm: FormGroup;
  keyRegex = '^[A-Za-z0-9-_]+$';
  keyPlaceholder: string;

  private destroy$ = new Subject();

  // --------------------------------------------------------------------------------------------------
  constructor(private readonly elementRef: ElementRef,
    private readonly fb: FormBuilder,
    private readonly instancesService: InstancesService)
  {
    this.instancesService.get().subscribe(x => this.instances = x);
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        type: [null, Validators.required],
        ruleSettings: this.fb.group(
          {
            key: [],
            value: [],
            config: []
          })
      });

    // Dynamically configure validators
    this.editorForm.get('type').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type =>
      {
        this.editorForm.get(['ruleSettings', 'key']).setValue(null);
        this.editorForm.get(['ruleSettings', 'value']).setValue(null);

        this.editorForm.get(['ruleSettings', 'key']).clearValidators();
        this.editorForm.get(['ruleSettings', 'value']).clearValidators();

        setTimeout(() =>
        {
          if (type === 'subnet')
          {
            this.keyPlaceholder = 'Eg: 192.168.0.1/32';
            this.keyRegex = '^[0-9./]+$';

            this.editorForm.get(['ruleSettings', 'key']).setValidators([
              Validators.required,
              Validators.pattern('^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))$')
            ]);
          }
          else if (type === 'ip')
          {
            this.keyPlaceholder = 'Eg: 192.168.0.1';
            this.keyRegex = '^[0-9.]+$';

            this.editorForm.get(['ruleSettings', 'key']).setValidators([
              Validators.required,
              Validators.pattern('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$')
            ]);
          }
          else if (type === 'vm')
          {
            this.keyRegex = '^.+$';

            this.editorForm.get(['ruleSettings', 'value']).setValidators([Validators.required]);
          }
          else if (type === 'tag')
          {
            this.keyPlaceholder = 'Key';
            this.keyRegex = '^[A-Za-z0-9-_]+$';

            this.editorForm.get(['ruleSettings', 'key']).setValidators([Validators.required, Validators.pattern('^[A-Za-z0-9-_]+$')]);
            this.editorForm.get(['ruleSettings', 'value']).setValidators([Validators.required]);
          }
          else
          {
            this.keyRegex = '^.+$';
          }

          this.editorForm.get(['ruleSettings', 'key']).updateValueAndValidity();
          this.editorForm.get(['ruleSettings', 'value']).updateValueAndValidity();
        }, 0);
      });
  }

  // --------------------------------------------------------------------------------------------------
  showEditor()
  {
    if (this.disabled) return;

    this.editorVisible = true;

    addEventListener('click', this.onDocumentClick.bind(this));
  }

  // --------------------------------------------------------------------------------------------------
  saveChanges()
  {
    event.preventDefault();
    event.stopPropagation();

    this.editorVisible = false;

    this.removeEventListeners();

    let config: string;

    if (this.editorForm.get('type').value === 'all')
      config = 'vms';
    else if (this.editorForm.get('type').value === 'tag')
      config = `"${this.editorForm.get(['ruleSettings', 'key']).value}" = "${this.editorForm.get(['ruleSettings', 'value']).value}"`;
    else if (this.editorForm.get('type').value === 'vm')
      config = this.editorForm.get(['ruleSettings', 'key']).value.toLowerCase();
    else
      config = this.editorForm.get(['ruleSettings', 'key']).value;

    this.saved.emit(
      {
        type: this.editorForm.get('type').value,
        config: config || ''
      });

    this.editorForm.reset();
  }

  // --------------------------------------------------------------------------------------------------
  cancelChanges(event: MouseEvent)
  {
    this.editorVisible = false;

    this.removeEventListeners();

    this.editorForm.reset();
  }

  // --------------------------------------------------------------------------------------------------
  @HostListener('document:keydown', ['$event'])
  returnPressed(event)
  {
    if (event.currentTarget === this.elementRef.nativeElement && event.keyCode === 13)
    {
      event.preventDefault();
      event.stopPropagation();

      this.saveChanges();
    }
  }

  // --------------------------------------------------------------------------------------------------
  protected onDocumentClick(event: MouseEvent)
  {
    if (!this.elementRef.nativeElement.contains(event.target))
      this.cancelChanges(event);
  }

  // --------------------------------------------------------------------------------------------------
  private removeEventListeners()
  {
    removeEventListener('click', this.onDocumentClick);
    removeEventListener('document:keydown', this.returnPressed);
  }

  // --------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.createForm();
  }

  // --------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
    this.removeEventListeners();
  }
}
