import { Component, OnInit, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { NetworkingService } from '../helpers/networking.service';
import { ToastrService } from 'ngx-toastr';
import { VirtualAreaNetwork } from '../models/vlan';
import { VirtualAreaNetworkRequest } from '../models/vlan';

@Component({
  selector: 'app-virtual-network-editor',
  templateUrl: './virtual-network-editor.component.html',
  styleUrls: ['./virtual-network-editor.component.scss']
})
export class VirtualNetworkEditorComponent implements OnInit
{
  @Input()
  vlan: VirtualAreaNetwork;

  save = new Subject<VirtualAreaNetwork>();
  loading: boolean;
  working: boolean;
  editorForm: FormGroup;

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly networkingService: NetworkingService,
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
    this.editorForm = this.fb.group(
      {
        id: [{ value: this.vlan?.vlan_id, disabled: !!this.vlan }, [Validators.required, Validators.min(0), Validators.max(4095)]],
        name: [this.vlan?.name, Validators.required],
        description: [this.vlan?.description, [Validators.maxLength(64)]]
      });
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

    const vlan = new VirtualAreaNetworkRequest();
    vlan.vlan_id = changes.id;
    vlan.name = changes.name;
    if (changes.description)
      vlan.description = changes.description;

    const observable = this.vlan
      ? this.networkingService.editFabricVirtualLocalAreaNetwork(this.vlan.vlan_id, vlan.name, vlan.description)
      : this.networkingService.addFabricVirtualLocalAreaNetwork(vlan);

    observable.subscribe(x =>
    {
      const message = this.vlan
        ? `The "${changes.name}" virtual network has been successfully updated`
        : `The "${changes.name}" virtual network has been successfully created`;
      this.toastr.info(message);

      this.working = false;

      this.save.next(x);
      this.modalRef.hide();
    }, err =>
    {
      this.toastr.error(err.error.message);
      this.working = false;
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.createForm();
  }
}
