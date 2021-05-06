import { Component, OnInit, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { VolumesService } from '../helpers/volumes.service';
import { VolumeResponse } from '../models/volume';
import { FileSizePipe } from '../../pipes/file-size.pipe';
import { Network } from '../../networking/models/network';
import { NetworkingService } from '../../networking/helpers/networking.service';
import { LabelType, Options } from '@angular-slider/ngx-slider';

@Component({
  selector: 'app-volume-editor',
  templateUrl: './volume-editor.component.html',
  styleUrls: ['./volume-editor.component.scss']
})
export class VolumeEditorComponent implements OnInit
{
  save = new Subject<VolumeResponse>();
  working: boolean;
  editorForm: FormGroup;
  networks: Network[] = [];
  fabricNetworks: Network[] = [];
  sizeSliderOptions: Options = {
    animate: false,
    stepsArray: [],
    enforceStepsArray: true,
    showTicks: true,
    translate: this.translateBytes.bind(this)
  };

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly volumesService: VolumesService,
    private readonly networkingService: NetworkingService,
    private readonly toastr: ToastrService,
    private readonly fileSizePipe: FileSizePipe)
  {
    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());

    this.networkingService.getNetworks().subscribe(x =>
    {
      this.networks = x;
      this.fabricNetworks = x.filter(n => n.fabric);
    });

    this.sizeSliderOptions.stepsArray = [
      10240, 20480, 30720, 40960, 51200, 61440, 71680, 81920, 92160, 102400, 204800, 307200, 409600, 512000, 614400,
      716800, 819200, 921600, 1024000
    ].map(value => ({ value }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  private translateBytes(value: number, label: LabelType): string
  {
    return this.fileSizePipe.transform(value * 1024 * 1024);
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        name: [null, [Validators.required, Validators.maxLength(256)]],
        type: ['tritonnfs', Validators.required],
        networks: this.fb.array([], { validators: Validators.required }),
        size: [10, [Validators.min(1), Validators.required]],
        tags: this.fb.array([]),
        affinity: this.fb.array([])
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
    this.toggleSizeSlider(true);

    const changes = this.editorForm.getRawValue();
    changes.networks = changes.networks.map(x => x.id);

    // These tags can be referenced by affinity rules
    changes.tags = changes.tags.reduce((a, b) =>
    {
      a[b.key] = b.value;
      return a;
    }, {});

    this.volumesService.addVolume(changes).subscribe(x =>
    {
      this.working = false;
      this.toggleSizeSlider();

      this.save.next(x);
      this.modalRef.hide();
    }, err =>
    {
      this.toastr.error(err.error.message);
      this.working = false;
      this.toggleSizeSlider();
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private toggleSizeSlider(disable = false)
  {
    const newOptions: Options = Object.assign({}, this.sizeSliderOptions);
    newOptions.disabled = disable;
    this.sizeSliderOptions = newOptions;
  }

  // ----------------------------------------------------------------------------------------------------------------
  addNetwork(network: Network)
  {
    const array = this.editorForm.get('networks') as FormArray;

    array.push(this.fb.group(
      {
        id: [network.id],
        name: [network.name]
      }));

    this.fabricNetworks = this.fabricNetworks.filter(x => x.id !== network.id);
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeNetwork(index: number)
  {
    const array = this.editorForm.get('networks') as FormArray;

    array.removeAt(index);

    const existingNetworks = array.getRawValue();
    this.fabricNetworks = this.networks.filter(x => !existingNetworks.find(y => y.id === x.id) && x.fabric);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addTag(event)
  {
    const array = this.editorForm.get('tags') as FormArray;

    array.push(this.fb.group({
      key: event.key,
      value: event.value
    }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeTag(index)
  {
    const array = this.editorForm.get('tags') as FormArray;

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
