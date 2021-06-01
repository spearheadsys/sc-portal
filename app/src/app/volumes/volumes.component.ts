import { Component, OnInit, OnDestroy } from '@angular/core';
import { Volume } from './models/volume';
import { VolumesService } from './helpers/volumes.service';
import { MachinesService } from '../machines/helpers/machines.service';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ToastrService } from 'ngx-toastr';
import { VolumeEditorComponent } from './volume-editor/volume-editor.component';
import { PromptDialogComponent } from '../components/prompt-dialog/prompt-dialog.component';
import { Subject } from 'rxjs';
import { NetworkingService } from '../networking/helpers/networking.service';
import { sortArray } from '../helpers/utils.service';
import Fuse from 'fuse.js';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { distinctUntilChanged, first, takeUntil, debounceTime, filter, switchMap } from 'rxjs/operators';
import { Title } from "@angular/platform-browser";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-volumes',
  templateUrl: './volumes.component.html',
  styleUrls: ['./volumes.component.scss']
})
export class VolumesComponent implements OnInit, OnDestroy
{
  volumes: Volume[];
  listItems: Volume[];
  networks = {};
  loadingIndicator = true;
  editorForm: FormGroup;
  machines = {};

  private destroy$ = new Subject();
  private readonly fuseJsOptions: {};

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly volumesService: VolumesService,
    private readonly networkingService: NetworkingService,
    private readonly machinesService: MachinesService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService,
    private readonly fb: FormBuilder,
    private readonly titleService: Title,
    private readonly translationService: TranslateService)
  {
    translationService.get('volumes.title').pipe(first()).subscribe(x => titleService.setTitle(`Spearhead - ${x}`));

    // Configure FuseJs
    this.fuseJsOptions = {
      includeScore: false,
      minMatchCharLength: 2,
      includeMatches: true,
      shouldSort: false,
      threshold: .3, // Lower value means a more exact search
      keys: [
        { name: 'name', weight: .9 },
        { name: 'tags.key', weight: .7 }
      ]
    };

    this.createForm();

    this.machinesService.get()
      .subscribe(x =>
      {
        this.machines = x.reduce((a, b) =>
        {
          a[b.id] = b.name;
          return a;
        }, {});
      });

    this.networkingService.getNetworks().subscribe(x =>
    {
      this.networks = x.filter(n => n.fabric).reduce((a, b) =>
      {
        a[b.id] = b.name;
        return a;
      }, {});
    });

    this.getVolumes();
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        searchTerm: [''],
        sortProperty: ['name']
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
  private getVolumes()
  {
    this.volumesService.getVolumes()
      .subscribe(volumes =>
      {
        this.volumes = volumes.map(x => x as Volume);

        this.applyFiltersAndSort();

        this.loadingIndicator = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private applyFiltersAndSort()
  {
    let listItems: Volume[] = null;

    const searchTerm = this.editorForm.get('searchTerm').value;
    if (searchTerm.length >= 2)
    {
      const fuse = new Fuse(this.volumes, this.fuseJsOptions);
      const fuseResults = fuse.search(searchTerm);
      listItems = fuseResults.map(x => x.item as Volume);
    }

    if (!listItems)
      listItems = [...this.volumes];

    this.listItems = sortArray(listItems, this.editorForm.get('sortProperty').value);
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
  showEditor()
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {}
    };

    const modalRef = this.modalService.show(VolumeEditorComponent, modalConfig);
    modalRef.setClass('modal-lg');

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      this.volumes.push(x as Volume);

      this.applyFiltersAndSort();

      this.toastr.info(`The volume "${x.name}" has been created`);
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  renameVolume(volume: Volume)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        value: volume.name,
        required: true,
        title: 'Rename volume',
        prompt: 'Type in the new name for your volume',
        placeholder: 'New volume name',
        saveButtonText: 'Change volume name'
      }
    };

    const modalRef = this.modalService.show(PromptDialogComponent, modalConfig);

    modalRef.content.save
      .pipe(
        switchMap(name => this.volumesService.renameVolume(volume.id, name))
      )
      .subscribe(x =>
      {
        volume.name = x.name;

        this.toastr.info(`The volume "${volume.name}" has been renamed`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteVolume(volume: Volume)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete this volume?`,
        confirmButtonText: 'Yes, delete it',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(
      first(),
      switchMap(() => this.volumesService.deleteVolume(volume))
    )
      .subscribe(() =>
      {
        const index = this.volumes.findIndex(x => x.id === volume.id);
        if (index >= 0)
        {
          this.volumes.splice(index, 1);

          this.applyFiltersAndSort();
        }

        this.toastr.info(`The volume has been deleted`);
      }, err =>
      {
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Failed to remove the volume ${errorDetails}`);
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
